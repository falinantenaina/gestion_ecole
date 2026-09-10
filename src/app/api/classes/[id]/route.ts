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

    if (session.user.role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const tc = await prisma.teacherClass.findUnique({
        where: { teacherId_classId: { teacherId, classId: id } },
      });
      if (!tc) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    const classe = await prisma.class.findUnique({
      where: { id },
      include: {
        schoolYear: true,
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                matricule: true,
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                phone: true,
                email: true,
                parentName: true,
                parentPhone: true,
              },
            },
          },
          where: { status: "VALIDATED" },
          orderBy: { student: { lastName: "asc" } },
        },
        teacherClasses: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                qualification: true,
                specialization: true,
              },
            },
          },
        },
        subjects: {
          include: {
            subject: true,
          },
        },
        grades: {
          select: { id: true },
        },
      },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    const result = {
      ...classe,
      enrollmentCount: classe.enrollments.length,
      gradesCount: classe.grades.length,
      teachers: classe.teacherClasses.map((tc) => tc.teacher),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const { id } = await params;
    const body = await request.json();
    const { name, level, section, capacity, description, subjects } = body;

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

    const updateData: Record<string, unknown> = {
      ...(name && { name }),
      ...(level && { level }),
      ...(section !== undefined && { section }),
      ...(capacity && { capacity }),
      ...(description !== undefined && { description }),
    };

    if (Array.isArray(subjects)) {
      await prisma.classSubject.deleteMany({ where: { classId: id } });
      if (subjects.length > 0) {
        updateData.subjects = {
          create: subjects.map((s: { subjectId: string; coefficient?: number }) => ({
            subjectId: s.subjectId,
            coefficient: s.coefficient ?? 1,
          })),
        };
      }
    }

    const result = await prisma.class.update({
      where: { id },
      data: updateData,
      include: { schoolYear: true, subjects: { include: { subject: true } } },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
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
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

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
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la classe" },
      { status: 500 }
    );
  }
}
