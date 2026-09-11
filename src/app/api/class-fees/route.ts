import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionRole, requireRole } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.ACCOUNTANT]);

    const { searchParams } = new URL(request.url);
    const schoolYearId = searchParams.get("schoolYearId");
    const classId = searchParams.get("classId");

    if (!schoolYearId) {
      return NextResponse.json(
        { error: "L'année scolaire est requise" },
        { status: 400 }
      );
    }

    const where: any = { schoolYearId };
    if (classId) where.classId = classId;

    const classFees = await prisma.classFee.findMany({
      where,
      include: {
        class: {
          include: {
            enrollments: { where: { status: "VALIDATED" }, select: { id: true } },
          },
        },
        paymentType: true,
      },
      orderBy: [{ class: { name: "asc" } }, { paymentType: { name: "asc" } }],
    });

    return NextResponse.json({ data: classFees });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des frais:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des frais" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { classIds, paymentTypeId, amount, schoolYearId } = body;

    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: "Au moins une classe est requise" },
        { status: 400 }
      );
    }

    if (!paymentTypeId) {
      return NextResponse.json(
        { error: "Le type de paiement est requis" },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null || amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    if (!schoolYearId) {
      return NextResponse.json(
        { error: "L'année scolaire est requise" },
        { status: 400 }
      );
    }

    const [schoolYear, paymentType] = await Promise.all([
      prisma.schoolYear.findUnique({ where: { id: schoolYearId } }),
      prisma.paymentType.findUnique({ where: { id: paymentTypeId } }),
    ]);

    if (!schoolYear) {
      return NextResponse.json(
        { error: "Année scolaire non trouvée" },
        { status: 404 }
      );
    }

    if (!paymentType) {
      return NextResponse.json(
        { error: "Type de paiement non trouvé" },
        { status: 404 }
      );
    }

    const validClasses = await prisma.class.findMany({
      where: { id: { in: classIds }, schoolYearId },
      select: { id: true, name: true },
    });

    if (validClasses.length !== classIds.length) {
      return NextResponse.json(
        { error: "Certaines classes n'existent pas pour cette année scolaire" },
        { status: 404 }
      );
    }

    const existingFees = await prisma.classFee.findMany({
      where: {
        classId: { in: classIds },
        paymentTypeId,
        schoolYearId,
      },
      select: { classId: true },
    });

    const existingClassIds = new Set(existingFees.map((f) => f.classId));
    const newClassIds = classIds.filter((id: string) => !existingClassIds.has(id));

    if (newClassIds.length === 0) {
      return NextResponse.json(
        { error: "Des frais existent déjà pour toutes les classes sélectionnées avec ce type" },
        { status: 409 }
      );
    }

    const createdFees = await prisma.classFee.createMany({
      data: newClassIds.map((classId: string) => ({
        classId,
        paymentTypeId,
        amount,
        schoolYearId,
      })),
    });

    const fees = await prisma.classFee.findMany({
      where: {
        id: { in: (await prisma.classFee.findMany({
          where: {
            classId: { in: newClassIds },
            paymentTypeId,
            schoolYearId,
          },
        })).map((f) => f.id) },
      },
      include: { class: true, paymentType: true },
    });

    return NextResponse.json(fees, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création des frais:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création des frais" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant du frais est requis" },
        { status: 400 }
      );
    }

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
