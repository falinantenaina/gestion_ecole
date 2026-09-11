import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionRole, requireRole } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.ACCOUNTANT, Role.TEACHER, Role.STUDENT]);

    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: { startDate: "desc" },
      include: { terms: { orderBy: { startDate: "asc" } } },
    });

    return NextResponse.json({ data: schoolYears });
  } catch (error) {
    console.error("Erreur lors de la récupération des années scolaires:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des années scolaires" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { name, startDate, endDate, startMonth, endMonth, isCurrent } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Les champs nom, date de début et date de fin sont requis" },
        { status: 400 }
      );
    }

    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
      return NextResponse.json(
        { error: "Les mois doivent être entre 1 et 12" },
        { status: 400 }
      );
    }

    // Si c'est l'année courante, désactiver les autres
    if (isCurrent) {
      await prisma.schoolYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const schoolYear = await prisma.schoolYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startMonth: startMonth || 9,
        endMonth: endMonth || 6,
        isCurrent: isCurrent || false,
      },
    });

    return NextResponse.json(schoolYear, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'année scolaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'année scolaire" },
      { status: 500 }
    );
  }
}
