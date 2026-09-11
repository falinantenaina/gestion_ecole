import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { teacherId, classId } = body;

    if (!teacherId || !classId) {
      return NextResponse.json(
        { error: "Les champs teacherId et classId sont requis" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const classe = await prisma.class.findUnique({ where: { id: classId } });
    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    const existing = await prisma.teacherClass.findUnique({
      where: { teacherId_classId: { teacherId, classId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Cet enseignant est déjà assigné à cette classe" },
        { status: 400 }
      );
    }

    const assignment = await prisma.teacherClass.create({
      data: { teacherId, classId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        class: { select: { id: true, name: true, level: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de l'assignation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'assignation de l'enseignant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const classId = searchParams.get("classId");

    if (!teacherId || !classId) {
      return NextResponse.json(
        { error: "Les paramètres teacherId et classId sont requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.teacherClass.findUnique({
      where: { teacherId_classId: { teacherId, classId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Assignation non trouvée" },
        { status: 404 }
      );
    }

    await prisma.teacherClass.delete({
      where: { teacherId_classId: { teacherId, classId } },
    });

    return NextResponse.json({ message: "Assignation supprimée avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de l'assignation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'assignation" },
      { status: 500 }
    );
  }
}
