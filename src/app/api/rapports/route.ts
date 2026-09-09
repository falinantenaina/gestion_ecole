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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const schoolYearId = searchParams.get("schoolYearId");
    const classId = searchParams.get("classId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!type) {
      return NextResponse.json(
        { error: "Le paramètre type est requis (students, classes, financial)" },
        { status: 400 }
      );
    }

    const schoolYearFilter: any = schoolYearId ? { schoolYearId } : {};

    switch (type) {
      case "students": {
        const where: any = { ...schoolYearFilter };
        if (classId) {
          where.classId = classId;
        }

        const grades = await prisma.grade.findMany({
          where,
          include: {
            student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
            subject: { select: { name: true } },
          },
        });

        const studentMap = new Map<string, {
          student: { id: string; firstName: string; lastName: string; matricule: string };
          totalWeightedScore: number;
          totalWeight: number;
          grades: typeof grades;
        }>();

        for (const grade of grades) {
          const existing = studentMap.get(grade.studentId);
          if (existing) {
            existing.totalWeightedScore += grade.score * grade.coefficient;
            existing.totalWeight += grade.coefficient;
            existing.grades.push(grade);
          } else {
            studentMap.set(grade.studentId, {
              student: grade.student,
              totalWeightedScore: grade.score * grade.coefficient,
              totalWeight: grade.coefficient,
              grades: [grade],
            });
          }
        }

        const studentsWithAverages = Array.from(studentMap.values()).map((data) => ({
          ...data.student,
          average: data.totalWeight > 0
            ? Math.round((data.totalWeightedScore / data.totalWeight) * 100) / 100
            : 0,
          totalGrades: data.grades.length,
        }));

        studentsWithAverages.sort((a, b) => b.average - a.average);

        return NextResponse.json({
          type: "students",
          data: studentsWithAverages,
          total: studentsWithAverages.length,
        });
      }

      case "classes": {
        const where: any = {};
        if (schoolYearId) where.schoolYearId = schoolYearId;

        const classes = await prisma.class.findMany({
          where,
          include: {
            enrollments: { where: { status: "VALIDATED" } },
            grades: {
              include: {
                subject: { select: { name: true } },
              },
            },
            schoolYear: { select: { name: true } },
          },
        });

        const classStats = classes.map((classe) => {
          const totalStudents = classe.enrollments.length;
          const totalGrades = classe.grades.length;

          let totalWeightedScore = 0;
          let totalWeight = 0;
          const subjectMap = new Map<string, { name: string; scores: number[]; totalWeight: number }>();

          for (const grade of classe.grades) {
            totalWeightedScore += grade.score * grade.coefficient;
            totalWeight += grade.coefficient;

            const existing = subjectMap.get(grade.subjectId);
            if (existing) {
              existing.scores.push(grade.score);
              existing.totalWeight += grade.coefficient;
            } else {
              subjectMap.set(grade.subjectId, {
                name: grade.subject.name,
                scores: [grade.score],
                totalWeight: grade.coefficient,
              });
            }
          }

          const subjectAverages = Array.from(subjectMap.values()).map((data) => ({
            name: data.name,
            average: data.totalWeight > 0
              ? Math.round(
                  (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100
                ) / 100
              : 0,
            totalGrades: data.scores.length,
          }));

          return {
            id: classe.id,
            name: classe.name,
            level: classe.level,
            schoolYear: classe.schoolYear.name,
            totalStudents,
            totalGrades,
            average: totalWeight > 0
              ? Math.round((totalWeightedScore / totalWeight) * 100) / 100
              : 0,
            subjectAverages,
          };
        });

        return NextResponse.json({
          type: "classes",
          data: classStats,
          total: classStats.length,
        });
      }

      case "financial": {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const paymentWhere: any = {};
        if (Object.keys(dateFilter).length > 0) {
          paymentWhere.paymentDate = dateFilter;
        }

        const [payments, totalPaid, paymentTypes, paymentTypeGroups, pendingEnrollments] = await Promise.all([
          prisma.payment.findMany({
            where: paymentWhere,
            include: {
              paymentType: { select: { name: true } },
              student: { select: { firstName: true, lastName: true, matricule: true } },
            },
            orderBy: { paymentDate: "desc" },
          }),
          prisma.payment.aggregate({
            where: paymentWhere,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.paymentType.findMany(),
          prisma.payment.groupBy({
            by: ["paymentTypeId"],
            where: paymentWhere,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.enrollment.aggregate({
            where: { status: "VALIDATED" },
            _count: true,
          }),
        ]);

        const paymentTypeSummary = paymentTypes.map((pt) => {
          const typePayments = paymentTypeGroups.find((g) => g.paymentTypeId === pt.id);
          return {
            name: pt.name,
            baseAmount: pt.amount,
            totalReceived: typePayments?._sum.amount || 0,
            count: typePayments?._count || 0,
          };
        });

        const totalDue = paymentTypes.reduce((sum, pt) => {
          const typePayments = paymentTypeGroups.find((g) => g.paymentTypeId === pt.id);
          const validatedCount = typePayments?._count || 0;
          return sum + pt.amount * validatedCount;
        }, 0);

        return NextResponse.json({
          type: "financial",
          data: {
            totalPaid: totalPaid._sum.amount || 0,
            totalTransactions: totalPaid._count,
            totalDue,
            unpaidAmount: Math.max(0, totalDue - (totalPaid._sum.amount || 0)),
            paymentTypeSummary,
            recentPayments: payments.slice(0, 20),
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Type de rapport invalide. Utilisez: students, classes, financial" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}