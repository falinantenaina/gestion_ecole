import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole, getStudentId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const studentId = searchParams.get("studentId");
    const paymentTypeId = searchParams.get("paymentTypeId");
    const paymentMethod = searchParams.get("paymentMethod");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (paymentTypeId) where.paymentTypeId = paymentTypeId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    if (session.user.role === Role.STUDENT) {
      const sid = await getStudentId(session.user.id);
      where.studentId = sid;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
          paymentType: true,
        },
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des paiements:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.ACCOUNTANT]);

    const body = await request.json();
    const {
      studentId,
      paymentTypeId,
      amount,
      paymentMethod,
      reference,
      notes,
    } = body;

    if (!studentId || !paymentTypeId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Les champs élève, type de paiement, montant et mode de paiement sont requis" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const paymentType = await prisma.paymentType.findUnique({
      where: { id: paymentTypeId },
    });
    if (!paymentType) {
      return NextResponse.json(
        { error: "Type de paiement non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier le solde restant via ClassFee (montant par classe)
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: { in: ["VALIDATED", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Aucune inscription active trouvée pour cet élève" },
        { status: 400 }
      );
    }

    const classFee = await prisma.classFee.findFirst({
      where: {
        classId: enrollment.classId,
        paymentTypeId,
        schoolYearId: enrollment.schoolYearId,
      },
    });

    if (!classFee) {
      return NextResponse.json(
        { error: "Aucun frais configuré pour cette classe et ce type" },
        { status: 400 }
      );
    }

    const totalPaidForType = await prisma.payment.aggregate({
      where: { studentId, paymentTypeId },
      _sum: { amount: true },
    });
    const alreadyPaid = totalPaidForType._sum.amount || 0;
    const remaining = Math.max(0, classFee.amount - alreadyPaid);

    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Ce type de frais est déjà entièrement payé (${classFee.amount.toLocaleString("fr-FR")} Ar)` },
        { status: 400 }
      );
    }

    if (amount > remaining) {
      return NextResponse.json(
        { error: `Le montant dépasse le solde restant. Reste à payer : ${remaining.toLocaleString("fr-FR")} Ar` },
        { status: 400 }
      );
    }

    const result = await prisma.payment.create({
      data: {
        studentId,
        paymentTypeId,
        amount,
        paymentMethod,
        reference,
        notes,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        paymentType: true,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
