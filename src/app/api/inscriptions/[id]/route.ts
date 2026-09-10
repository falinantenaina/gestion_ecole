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

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        schoolYear: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    if (session.user.role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const tc = await prisma.teacherClass.findUnique({
        where: { teacherId_classId: { teacherId, classId: enrollment.classId } },
      });
      if (!tc) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'inscription" },
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
    const { status, notes, classId } = body;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    if (status === "VALIDATED") {
      const classe = await prisma.class.findUnique({
        where: { id: classId || enrollment.classId },
        include: { enrollments: { where: { status: "VALIDATED" } } },
      });
      if (classe && classe.enrollments.length >= classe.capacity) {
        return NextResponse.json(
          { error: "La classe est complète" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.enrollment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(classId && { classId }),
      },
      include: {
        student: true,
        class: true,
        schoolYear: true,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la mise à jour de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'inscription" },
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
    const enrollment = await prisma.enrollment.findUnique({ where: { id } });

    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    await prisma.enrollment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Inscription annulée avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de l'annulation de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'inscription" },
      { status: 500 }
    );
  }
}
