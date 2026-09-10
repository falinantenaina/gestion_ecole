import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const paymentTypeId = searchParams.get("paymentTypeId");

  if (!studentId || !paymentTypeId) {
    return NextResponse.json({ remaining: null });
  }

  const paymentType = await prisma.paymentType.findUnique({
    where: { id: paymentTypeId },
  });

  if (!paymentType) {
    return NextResponse.json({ remaining: null });
  }

  const totalPaid = await prisma.payment.aggregate({
    where: { studentId, paymentTypeId },
    _sum: { amount: true },
  });

  const paid = totalPaid._sum.amount || 0;
  const remaining = Math.max(0, paymentType.amount - paid);

  return NextResponse.json({ remaining, total: paymentType.amount, paid });
}
