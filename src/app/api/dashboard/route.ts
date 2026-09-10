import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getSessionRole,
  getTeacherId,
  getStudentId,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
    const role = session.user.role;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (role === Role.ADMIN || role === Role.DIRECTOR) {
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
        prisma.student.count({ where: { user: { isActive: true } } }),
        prisma.teacher.count({ where: { user: { isActive: true } } }),
        prisma.class.count(),
        prisma.attendance.count({
          where: {
            date: { gte: today, lt: tomorrow },
            status: { in: ["ABSENT", "LATE"] },
          },
        }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.enrollment.aggregate({
          where: { status: "VALIDATED" },
          _count: true,
        }).then(async (validated) => {
          const totalDue = await prisma.paymentType.aggregate({ _sum: { amount: true } });
          const totalPaid = await prisma.payment.aggregate({ _sum: { amount: true } });
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
          where: { paymentDate: { gte: firstDayOfMonth } },
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
        studentsByGender: studentsByGender.map((g) => ({
          name: g.gender === "MALE" ? "Masculin" : "Féminin",
          value: g._count.id,
        })),
      });
    }

    if (role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);

      const [teacherClasses, teacherStudents, teacherGrades, recentGrades] = await Promise.all([
        prisma.teacherClass.count({ where: { teacherId } }),
        prisma.enrollment.count({
          where: {
            class: { teacherClasses: { some: { teacherId } } },
            status: "VALIDATED",
          },
        }),
        prisma.grade.aggregate({
          where: { teacherId },
          _avg: { score: true },
          _count: true,
        }),
        prisma.grade.findMany({
          where: { teacherId },
          include: {
            student: { select: { firstName: true, lastName: true } },
            subject: { select: { name: true } },
          },
          orderBy: { evaluationDate: "desc" },
          take: 5,
        }),
      ]);

      return NextResponse.json({
        totalClasses: teacherClasses,
        totalStudents: teacherStudents,
        averageScore: teacherGrades._avg.score || 0,
        totalGrades: teacherGrades._count,
        recentGrades,
      });
    }

    if (role === Role.STUDENT) {
      const studentId = await getStudentId(session.user.id);

      const [grades, payments, attendanceCount] = await Promise.all([
        prisma.grade.findMany({
          where: { studentId },
          include: {
            subject: { select: { name: true } },
            term: { select: { name: true } },
          },
          orderBy: { evaluationDate: "desc" },
          take: 10,
        }),
        prisma.payment.findMany({
          where: { studentId },
          include: { paymentType: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
          take: 5,
        }),
        prisma.attendance.count({
          where: { studentId, status: { in: ["ABSENT", "LATE"] } },
        }),
      ]);

      const gradeAggregate = await prisma.grade.aggregate({
        where: { studentId },
        _avg: { score: true },
        _sum: { score: true },
      });

      return NextResponse.json({
        averageScore: gradeAggregate._avg.score || 0,
        totalGrades: grades.length,
        grades,
        recentPayments: payments,
        absencesCount: attendanceCount,
      });
    }

    if (role === Role.SECRETARY) {
      const [totalStudents, pendingEnrollments, validatedEnrollments, recentEnrollments] = await Promise.all([
        prisma.student.count({ where: { user: { isActive: true } } }),
        prisma.enrollment.count({ where: { status: "PENDING" } }),
        prisma.enrollment.count({ where: { status: "VALIDATED" } }),
        prisma.enrollment.findMany({
          include: {
            student: { select: { firstName: true, lastName: true, matricule: true } },
            class: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      return NextResponse.json({
        totalStudents,
        pendingEnrollments,
        validatedEnrollments,
        recentEnrollments,
      });
    }

    if (role === Role.ACCOUNTANT) {
      const [totalPaid, monthlyPayments, paymentTypes, recentPayments] = await Promise.all([
        prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: firstDayOfMonth } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.groupBy({
          by: ["paymentTypeId"],
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.findMany({
          include: {
            student: { select: { firstName: true, lastName: true, matricule: true } },
            paymentType: { select: { name: true } },
          },
          orderBy: { paymentDate: "desc" },
          take: 10,
        }),
      ]);

      const paymentTypeDetails = await prisma.paymentType.findMany();
      const paymentTypeSummary = paymentTypeDetails.map((pt) => {
        const group = paymentTypes.find((g) => g.paymentTypeId === pt.id);
        return {
          name: pt.name,
          totalReceived: group?._sum.amount || 0,
          count: group?._count || 0,
        };
      });

      return NextResponse.json({
        totalPaid: totalPaid._sum.amount || 0,
        totalTransactions: totalPaid._count,
        monthlyTotal: monthlyPayments._sum.amount || 0,
        monthlyCount: monthlyPayments._count,
        paymentTypeSummary,
        recentPayments,
      });
    }

    if (role === Role.PARENT) {
      return NextResponse.json({
        message: "Tableau de bord parent - à implémenter",
      });
    }

    return NextResponse.json({
      message: "Tableau de bord non disponible pour ce rôle",
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération du tableau de bord:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du tableau de bord" },
      { status: 500 }
    );
  }
}
