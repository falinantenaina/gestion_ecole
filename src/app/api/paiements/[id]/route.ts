import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: true,
        paymentType: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Erreur lors de la récupération du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du paiement" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, paymentMethod, reference, notes, paymentTypeId } = body;

    const existingPayment = await prisma.payment.findUnique({ where: { id } });
    if (!existingPayment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }

    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    const result = await prisma.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(paymentMethod && { paymentMethod }),
        ...(reference !== undefined && { reference }),
        ...(notes !== undefined && { notes }),
        ...(paymentTypeId && { paymentTypeId }),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        paymentType: true,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du paiement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }

    await prisma.payment.delete({ where: { id } });

    return NextResponse.json({ message: "Paiement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du paiement" },
      { status: 500 }
    );
  }
}