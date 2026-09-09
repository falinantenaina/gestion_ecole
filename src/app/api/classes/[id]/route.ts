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
    const classe = await prisma.class.findUnique({
      where: { id },
      include: {
        schoolYear: true,
        enrollments: {
          include: { student: true },
          where: { status: "VALIDATED" },
        },
        teacherClasses: { include: { teacher: true } },
        subjects: { include: { subject: true } },
      },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    return NextResponse.json(classe);
  } catch (error) {
    console.error("Erreur lors de la récupération de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la classe" },
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
    const { name, level, section, capacity, description } = body;

    const existingClass = await prisma.class.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    if (name && name !== existingClass.name) {
      const nameTaken = await prisma.class.findFirst({
        where: { name, schoolYearId: existingClass.schoolYearId, id: { not: id } },
      });
      if (nameTaken) {
        return NextResponse.json(
          { error: "Une classe avec ce nom existe déjà pour cette année scolaire" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.class.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(level && { level }),
        ...(section !== undefined && { section }),
        ...(capacity && { capacity }),
        ...(description !== undefined && { description }),
      },
      include: { schoolYear: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la classe" },
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
    const classe = await prisma.class.findUnique({
      where: { id },
      include: { enrollments: { where: { status: "VALIDATED" } } },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    if (classe.enrollments.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une classe avec des élèves inscrits" },
        { status: 400 }
      );
    }

    await prisma.class.delete({ where: { id } });

    return NextResponse.json({ message: "Classe supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la classe" },
      { status: 500 }
    );
  }
}