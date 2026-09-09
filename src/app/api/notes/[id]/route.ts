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
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: true,
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        term: true,
        class: true,
        schoolYear: true,
      },
    });

    if (!grade) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 });
    }

    return NextResponse.json(grade);
  } catch (error) {
    console.error("Erreur lors de la récupération de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la note" },
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
    const {
      score,
      maxScore,
      coefficient,
      comment,
      evaluationName,
      evaluationType,
    } = body;

    const existingGrade = await prisma.grade.findUnique({ where: { id } });
    if (!existingGrade) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 });
    }

    if (score !== undefined && (score < 0 || (maxScore || existingGrade.maxScore) && score > (maxScore || existingGrade.maxScore))) {
      return NextResponse.json(
        { error: "La note doit être comprise entre 0 et la note maximale" },
        { status: 400 }
      );
    }

    const result = await prisma.grade.update({
      where: { id },
      data: {
        ...(score !== undefined && { score }),
        ...(maxScore !== undefined && { maxScore }),
        ...(coefficient !== undefined && { coefficient }),
        ...(comment !== undefined && { comment }),
        ...(evaluationName !== undefined && { evaluationName }),
        ...(evaluationType && { evaluationType }),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la note" },
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
    const grade = await prisma.grade.findUnique({ where: { id } });

    if (!grade) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 });
    }

    await prisma.grade.delete({ where: { id } });

    return NextResponse.json({ message: "Note supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la note" },
      { status: 500 }
    );
  }
}