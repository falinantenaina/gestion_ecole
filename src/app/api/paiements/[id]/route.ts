import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole, getStudentId } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
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

    if (session.user.role === Role.STUDENT) {
      const sid = await getStudentId(session.user.id);
      if (payment.studentId !== sid) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.ACCOUNTANT]);

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
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.ACCOUNTANT]);

    const { id } = await params;
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }

    await prisma.payment.delete({ where: { id } });

    return NextResponse.json({ message: "Paiement supprimé avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression du paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du paiement" },
      { status: 500 }
    );
  }
}
