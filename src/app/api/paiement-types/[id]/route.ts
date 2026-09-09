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
    const paymentType = await prisma.paymentType.findUnique({
      where: { id },
      include: {
        payments: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!paymentType) {
      return NextResponse.json({ error: "Type de paiement non trouvé" }, { status: 404 });
    }

    return NextResponse.json(paymentType);
  } catch (error) {
    console.error("Erreur lors de la récupération du type de paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du type de paiement" },
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
    const { name, description, amount } = body;

    const existing = await prisma.paymentType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Type de paiement non trouvé" }, { status: 404 });
    }

    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.paymentType.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json(
          { error: "Un type de paiement avec ce nom existe déjà" },
          { status: 409 }
        );
      }
    }

    const result = await prisma.paymentType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
      },
      include: {
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du type de paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du type de paiement" },
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
    const paymentType = await prisma.paymentType.findUnique({ where: { id } });

    if (!paymentType) {
      return NextResponse.json({ error: "Type de paiement non trouvé" }, { status: 404 });
    }

    const paymentsCount = await prisma.payment.count({ where: { paymentTypeId: id } });
    if (paymentsCount > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer ce type de paiement car il est utilisé par des paiements existants" },
        { status: 400 }
      );
    }

    await prisma.paymentType.delete({ where: { id } });

    return NextResponse.json({ message: "Type de paiement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du type de paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du type de paiement" },
      { status: 500 }
    );
  }
}
