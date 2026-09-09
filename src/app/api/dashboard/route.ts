import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      todayAbsences,
      totalPayments,
      unpaidAmount,
      recentEnrollments,
      monthlyPayments,
      monthlyPaymentHistory,
      studentsByGender,
    ] = await Promise.all([
      prisma.student.count({
        where: { user: { isActive: true } },
      }),
      prisma.teacher.count({
        where: { user: { isActive: true } },
      }),
      prisma.class.count(),
      prisma.attendance.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { in: ["ABSENT", "LATE"] },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      prisma.enrollment.aggregate({
        where: { status: "VALIDATED" },
        _count: true,
      }).then(async (validated) => {
        const totalDue = await prisma.paymentType.aggregate({
          _sum: { amount: true },
        });
        const totalPaid = await prisma.payment.aggregate({
          _sum: { amount: true },
        });
        const due = totalDue._sum.amount || 0;
        const paid = totalPaid._sum.amount || 0;
        return Math.max(0, due - paid);
      }),
      prisma.enrollment.findMany({
        include: {
          student: { select: { firstName: true, lastName: true, matricule: true } },
          class: { select: { name: true } },
          schoolYear: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: firstDayOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      (async () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
          const agg = await prisma.payment.aggregate({
            where: { paymentDate: { gte: start, lte: end } },
            _sum: { amount: true },
          });
          months.push({
            month: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
            montant: agg._sum.amount || 0,
          });
        }
        return months;
      })(),
      prisma.student.groupBy({
        by: ["gender"],
        _count: { id: true },
      }),
    ]);

    const genderData = studentsByGender.map((g) => ({
      name: g.gender === "MALE" ? "Masculin" : "Féminin",
      value: g._count.id,
    }));

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      todayAbsences,
      totalPayments: totalPayments._sum.amount || 0,
      unpaidAmount,
      recentEnrollments,
      monthlyPayments: {
        total: monthlyPayments._sum.amount || 0,
        count: monthlyPayments._count,
      },
      monthlyPaymentHistory,
      studentsByGender: genderData,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du tableau de bord:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du tableau de bord" },
      { status: 500 }
    );
  }
}