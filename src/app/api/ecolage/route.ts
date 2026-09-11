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
    const status = searchParams.get("status") || "all";
    const classId = searchParams.get("classId");
    const schoolYearId = searchParams.get("schoolYearId");
    const month = searchParams.get("month");
    const search = searchParams.get("search");
    const studentIdParam = searchParams.get("studentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const currentYear = schoolYearId
      ? await prisma.schoolYear.findUnique({ where: { id: schoolYearId } })
      : await prisma.schoolYear.findFirst({ where: { isCurrent: true } });

    if (!currentYear) {
      return NextResponse.json(
        { error: "Aucune année scolaire trouvée" },
        { status: 404 }
      );
    }

    // Get all class fees for this school year (amounts per class per fee type)
    const classFees = await prisma.classFee.findMany({
      where: { schoolYearId: currentYear.id },
      include: {
        paymentType: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // Build a lookup: classId -> paymentTypeId -> amount
    const feeAmountByClass: Record<string, Record<string, number>> = {};
    for (const cf of classFees) {
      if (!feeAmountByClass[cf.classId]) feeAmountByClass[cf.classId] = {};
      feeAmountByClass[cf.classId][cf.paymentTypeId] = cf.amount;
    }

    // Get all unique payment types that have class fees
    const uniqueFeeTypeIds = [...new Set(classFees.map((cf) => cf.paymentTypeId))];
    const feeTypes = await prisma.paymentType.findMany({
      where: { id: { in: uniqueFeeTypeIds } },
      orderBy: { name: "asc" },
    });

    const enrollWhere: any = {
      schoolYearId: currentYear.id,
      status: { in: ["VALIDATED", "COMPLETED"] },
    };
    if (classId) enrollWhere.classId = classId;
    if (studentIdParam) enrollWhere.studentId = studentIdParam;

    const enrollments = await prisma.enrollment.findMany({
      where: enrollWhere,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, matricule: true },
        },
        class: { select: { id: true, name: true, level: true } },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    let studentPaymentWhere: any = {};
    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr);
      const m = parseInt(monthStr);
      const startDate = new Date(year, m - 1, 1);
      const endDate = new Date(year, m, 0, 23, 59, 59, 999);
      studentPaymentWhere.paymentDate = { gte: startDate, lte: endDate };
    }

    const studentIds = enrollments.map((e) => e.studentId);

    const allPayments = await prisma.payment.findMany({
      where: {
        studentId: { in: studentIds },
        ...studentPaymentWhere,
      },
      include: {
        paymentType: { select: { id: true, name: true, amount: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    const paymentByStudent: Record<string, typeof allPayments> = {};
    for (const p of allPayments) {
      if (!paymentByStudent[p.studentId]) paymentByStudent[p.studentId] = [];
      paymentByStudent[p.studentId].push(p);
    }

    type StudentFees = {
      student: { id: string; firstName: string; lastName: string; matricule: string };
      class: { id: string; name: string; level: string };
      enrollmentId: string;
      paymentTypeBreakdown: {
        paymentTypeId: string;
        name: string;
        totalDue: number;
        totalPaid: number;
        remaining: number;
      }[];
      totalDue: number;
      totalPaid: number;
      remaining: number;
      status: "paid" | "unpaid" | "partial";
      lastPaymentDate: string | null;
      payments: {
        id: string;
        amount: number;
        paymentMethod: string;
        reference: string | null;
        notes: string | null;
        paymentDate: string;
        paymentType: { id: string; name: string; amount: number };
      }[];
    };

    const studentFeesList: StudentFees[] = [];

    for (const enrollment of enrollments) {
      const studentPayments = paymentByStudent[enrollment.studentId] || [];
      const classFeesForStudent = feeAmountByClass[enrollment.classId] || {};

      // Only show fee types that are configured for this student's class
      const paymentTypeBreakdown = feeTypes
        .filter((ft) => classFeesForStudent[ft.id] !== undefined)
        .map((ft) => {
          const due = classFeesForStudent[ft.id];
          const paidForType = studentPayments
            .filter((p) => p.paymentTypeId === ft.id)
            .reduce((sum, p) => sum + p.amount, 0);
          return {
            paymentTypeId: ft.id,
            name: ft.name,
            totalDue: due,
            totalPaid: paidForType,
            remaining: Math.max(0, due - paidForType),
          };
        });

      const totalDue = paymentTypeBreakdown.reduce((s, b) => s + b.totalDue, 0);
      const totalPaid = paymentTypeBreakdown.reduce((s, b) => s + b.totalPaid, 0);
      const remaining = Math.max(0, totalDue - totalPaid);

      let studentStatus: "paid" | "unpaid" | "partial";
      if (remaining <= 0) {
        studentStatus = "paid";
      } else if (totalPaid > 0) {
        studentStatus = "partial";
      } else {
        studentStatus = "unpaid";
      }

      const lastPayment =
        studentPayments.length > 0
          ? studentPayments.reduce((latest, p) =>
              new Date(p.paymentDate) > new Date(latest.paymentDate) ? p : latest
            )
          : null;

      if (status !== "all" && studentStatus !== status) continue;

      studentFeesList.push({
        student: enrollment.student,
        class: enrollment.class,
        enrollmentId: enrollment.id,
        paymentTypeBreakdown,
        totalDue,
        totalPaid,
        remaining,
        status: studentStatus,
        lastPaymentDate: lastPayment?.paymentDate?.toISOString() || null,
        payments: studentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          reference: p.reference,
          notes: p.notes,
          paymentDate: p.paymentDate.toISOString(),
          paymentType: p.paymentType,
        })),
      });
    }

    let filteredList = studentFeesList;

    if (search) {
      const q = search.toLowerCase();
      filteredList = filteredList.filter(
        (sf) =>
          sf.student.firstName.toLowerCase().includes(q) ||
          sf.student.lastName.toLowerCase().includes(q) ||
          sf.student.matricule.toLowerCase().includes(q)
      );
    }

    const totalDueAll = filteredList.reduce((s, sf) => s + sf.totalDue, 0);
    const totalPaidAll = filteredList.reduce((s, sf) => s + sf.totalPaid, 0);
    const totalUnpaidAll = filteredList.reduce((s, sf) => s + sf.remaining, 0);

    const paidCount = filteredList.filter((sf) => sf.status === "paid").length;
    const unpaidCount = filteredList.filter((sf) => sf.status === "unpaid").length;
    const partialCount = filteredList.filter((sf) => sf.status === "partial").length;

    const totalCount = filteredList.length;
    const collectionRate = totalDueAll > 0 ? Math.round((totalPaidAll / totalDueAll) * 100) : 0;

    const paginatedList = filteredList.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedList,
      stats: {
        totalDue: totalDueAll,
        totalPaid: totalPaidAll,
        totalUnpaid: totalUnpaidAll,
        collectionRate,
        paidCount,
        unpaidCount,
        partialCount,
        totalCount,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des données d'écolage:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'écolage" },
      { status: 500 }
    );
  }
}
