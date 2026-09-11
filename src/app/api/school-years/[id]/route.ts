import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionRole, requireRole } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.ACCOUNTANT]);

    const { id } = await params;
    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id },
      include: { terms: { orderBy: { startDate: "asc" } } },
    });

    if (!schoolYear) {
      return NextResponse.json({ error: "Année scolaire non trouvée" }, { status: 404 });
    }

    return NextResponse.json(schoolYear);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'année scolaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'année scolaire" },
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
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const { id } = await params;
    const body = await request.json();
    const { name, startDate, endDate, startMonth, endMonth, isCurrent } = body;

    const existing = await prisma.schoolYear.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Année scolaire non trouvée" }, { status: 404 });
    }

    if (isCurrent) {
      await prisma.schoolYear.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const schoolYear = await prisma.schoolYear.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(startMonth !== undefined && { startMonth }),
        ...(endMonth !== undefined && { endMonth }),
        ...(isCurrent !== undefined && { isCurrent }),
      },
    });

    return NextResponse.json(schoolYear);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'année scolaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'année scolaire" },
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
    const existing = await prisma.schoolYear.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Année scolaire non trouvée" }, { status: 404 });
    }

    if (existing.isCurrent) {
      return NextResponse.json(
        { error: "Impossible de supprimer l'année scolaire active" },
        { status: 400 }
      );
    }

    await prisma.schoolYear.delete({ where: { id } });
    return NextResponse.json({ message: "Année scolaire supprimée" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'année scolaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'année scolaire" },
      { status: 500 }
    );
  }
}
