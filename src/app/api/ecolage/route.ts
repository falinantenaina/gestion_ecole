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
    const month = searchParams.get("month"); // Format: "2026-10"
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

    // Get all class fees for this school year
    const classFees = await prisma.classFee.findMany({
      where: { schoolYearId: currentYear.id },
      include: {
        paymentType: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // Build lookup: classId -> paymentTypeId -> amount (monthly for Scolarité)
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

    // Get all payments for these students
    const studentIds = enrollments.map((e) => e.studentId);
    const allPayments = await prisma.payment.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        paymentType: { select: { id: true, name: true, amount: true } },
      },
      orderBy: { paymentDate: "asc" }, // Ascending to distribute chronologically
    });

    const paymentByStudent: Record<string, typeof allPayments> = {};
    for (const p of allPayments) {
      if (!paymentByStudent[p.studentId]) paymentByStudent[p.studentId] = [];
      paymentByStudent[p.studentId].push(p);
    }

    // Calculate number of months in school year
    const numMonths = (currentYear.endMonth >= currentYear.startMonth)
      ? currentYear.endMonth - currentYear.startMonth + 1
      : 12 - currentYear.startMonth + currentYear.endMonth + 1;

    // If month filter is set, calculate which month index it is
    let monthIndex = -1;
    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const filterMonth = parseInt(monthStr);
      // Calculate month index (0-based) from startMonth
      monthIndex = ((filterMonth - currentYear.startMonth + 12) % 12);
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
        monthlyAmount: number | null;
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

      const paymentTypeBreakdown = feeTypes
        .filter((ft) => classFeesForStudent[ft.id] !== undefined)
        .map((ft) => {
          const monthlyAmount = classFeesForStudent[ft.id];
          const due = ft.name.includes("Scolarité")
            ? monthlyAmount * numMonths
            : monthlyAmount;
          const paidForType = studentPayments
            .filter((p) => p.paymentTypeId === ft.id)
            .reduce((sum, p) => sum + p.amount, 0);
          return {
            paymentTypeId: ft.id,
            name: ft.name,
            totalDue: due,
            totalPaid: paidForType,
            remaining: Math.max(0, due - paidForType),
            monthlyAmount: ft.name.includes("Scolarité") ? monthlyAmount : null,
          };
        });

      const totalDue = paymentTypeBreakdown.reduce((s, b) => s + b.totalDue, 0);
      const totalPaid = paymentTypeBreakdown.reduce((s, b) => s + b.totalPaid, 0);
      const remaining = Math.max(0, totalDue - totalPaid);

      // Calculate monthly status if month filter is set
      let studentStatus: "paid" | "unpaid" | "partial";

      if (month && monthIndex >= 0) {
        // For monthly filter: check if scolarité for this month is paid
        const scolarite = paymentTypeBreakdown.find((b) => b.name.includes("Scolarité"));
        if (scolarite && scolarite.monthlyAmount) {
          // Amount that should be paid by this month = monthlyAmount * (monthIndex + 1)
          const expectedPaid = scolarite.monthlyAmount * (monthIndex + 1);
          // Amount actually paid for scolarité
          const paidScolarite = scolarite.totalPaid;

          if (paidScolarite >= expectedPaid) {
            studentStatus = "paid";
          } else if (paidScolarite >= expectedPaid - scolarite.monthlyAmount) {
            studentStatus = "partial";
          } else {
            studentStatus = "unpaid";
          }
        } else {
          // No scolarité configured, check inscription
          const inscription = paymentTypeBreakdown.find((b) => b.name.includes("Inscription"));
          if (inscription) {
            studentStatus = inscription.remaining <= 0 ? "paid" : "unpaid";
          } else {
            studentStatus = remaining <= 0 ? "paid" : "unpaid";
          }
        }
      } else {
        // No month filter: use overall status
        if (remaining <= 0) {
          studentStatus = "paid";
        } else if (totalPaid > 0) {
          studentStatus = "partial";
        } else {
          studentStatus = "unpaid";
        }
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
          recordedBy: p.recordedBy,
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
