import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const paymentTypeId = searchParams.get("paymentTypeId");

  if (!studentId || !paymentTypeId) {
    return NextResponse.json({ remaining: null });
  }

  // Find student's enrollment to get their class
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: ["VALIDATED", "COMPLETED"] },
    },
    include: {
      class: { select: { id: true } },
      schoolYear: { select: { id: true, isCurrent: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!enrollment) {
    return NextResponse.json({ remaining: null });
  }

  // Get class fee amount for this class + payment type
  const classFee = await prisma.classFee.findFirst({
    where: {
      classId: enrollment.classId,
      paymentTypeId,
      schoolYearId: enrollment.schoolYearId,
    },
  });

  if (!classFee) {
    return NextResponse.json({ remaining: null });
  }

  const totalPaid = await prisma.payment.aggregate({
    where: { studentId, paymentTypeId },
    _sum: { amount: true },
  });

  const paid = totalPaid._sum.amount || 0;
  const remaining = Math.max(0, classFee.amount - paid);

  return NextResponse.json({ remaining, total: classFee.amount, paid });
}
