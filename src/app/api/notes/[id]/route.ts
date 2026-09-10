import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole, getTeacherId } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
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
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.TEACHER]);

    const teacherId = await getTeacherId(session.user.id);
    const { id } = await params;

    const existingGrade = await prisma.grade.findUnique({ where: { id } });
    if (!existingGrade) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 });
    }

    if (existingGrade.teacherId !== teacherId) {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que vos propres notes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      score,
      maxScore,
      coefficient,
      comment,
      evaluationName,
      evaluationType,
    } = body;

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
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.TEACHER]);

    const { id } = await params;
    const grade = await prisma.grade.findUnique({ where: { id } });

    if (!grade) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 });
    }

    if (session.user.role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      if (grade.teacherId !== teacherId) {
        return NextResponse.json(
          { error: "Vous ne pouvez supprimer que vos propres notes" },
          { status: 403 }
        );
      }
    }

    await prisma.grade.delete({ where: { id } });

    return NextResponse.json({ message: "Note supprimée avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la note" },
      { status: 500 }
    );
  }
}
