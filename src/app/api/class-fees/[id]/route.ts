import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionRole, requireRole } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const { id } = await params;
    const body = await request.json();
    const { amount } = body;

    if (amount === undefined || amount === null || amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    const existing = await prisma.classFee.findUnique({
      where: { id },
      include: { class: true, paymentType: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Frais non trouvé" },
        { status: 404 }
      );
    }

    const updated = await prisma.classFee.update({
      where: { id },
      data: { amount },
      include: { class: true, paymentType: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la mise à jour du frais:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du frais" },
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
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const { id } = await params;

    const existing = await prisma.classFee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Frais non trouvé" },
        { status: 404 }
      );
    }

    await prisma.classFee.delete({ where: { id } });

    return NextResponse.json({ message: "Frais supprimé avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression du frais:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du frais" },
      { status: 500 }
    );
  }
}
