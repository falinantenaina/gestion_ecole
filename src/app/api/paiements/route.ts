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
    console.error("Erreur lors de la récupération des paiements:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

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
    console.error("Erreur lors de la création du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}