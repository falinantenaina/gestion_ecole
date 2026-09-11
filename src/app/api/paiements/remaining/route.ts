import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const paymentTypeId = searchParams.get("paymentTypeId");

  if (!studentId || !paymentTypeId) {
    return NextResponse.json({ remaining: null });
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: ["VALIDATED", "COMPLETED"] },
    },
    include: {
      class: { select: { id: true } },
      schoolYear: { select: { id: true, startMonth: true, endMonth: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!enrollment) {
    return NextResponse.json({ remaining: null });
  }

  const classFee = await prisma.classFee.findFirst({
    where: {
      classId: enrollment.classId,
      paymentTypeId,
      schoolYearId: enrollment.schoolYearId,
    },
    include: { paymentType: { select: { name: true } } },
  });

  if (!classFee) {
    return NextResponse.json({ remaining: null });
  }

  // Calculate total: Scolarité = monthly × numMonths, others = amount directly
  const sy = enrollment.schoolYear;
  const numMonths = (sy.endMonth >= sy.startMonth)
    ? sy.endMonth - sy.startMonth + 1
    : 12 - sy.startMonth + sy.endMonth + 1;

  const totalDue = classFee.paymentType.name.includes("Scolarité")
    ? classFee.amount * numMonths
    : classFee.amount;

  const totalPaid = await prisma.payment.aggregate({
    where: { studentId, paymentTypeId },
    _sum: { amount: true },
  });

  const paid = totalPaid._sum.amount || 0;
  const remaining = Math.max(0, totalDue - paid);

  return NextResponse.json({ remaining, total: totalDue, paid, monthlyAmount: classFee.amount });
}
