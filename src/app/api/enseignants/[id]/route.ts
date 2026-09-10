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
      if (teacherId !== id) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { isActive: true, lastLoginAt: true } },
        teacherSubjects: { include: { subject: true } },
        teacherClasses: { include: { class: true } },
        grades: {
          include: { student: true, subject: true },
          orderBy: { evaluationDate: "desc" },
          take: 20,
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération de l'enseignant:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'enseignant" },
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
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      hireDate,
      qualification,
      specialization,
      isActive,
      subjectIds,
      classIds,
    } = body;

    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (email && email !== existingTeacher.user.email) {
        const emailTaken = await tx.user.findUnique({ where: { email } });
        if (emailTaken) {
          throw new Error("Cet email est déjà utilisé");
        }
      }

      await tx.user.update({
        where: { id: existingTeacher.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      const teacher = await tx.teacher.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(hireDate && { hireDate: new Date(hireDate) }),
          ...(qualification !== undefined && { qualification }),
          ...(specialization !== undefined && { specialization }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      if (subjectIds) {
        await tx.teacherSubject.deleteMany({ where: { teacherId: id } });
        if (subjectIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: subjectIds.map((subjectId: string) => ({
              teacherId: id,
              subjectId,
            })),
          });
        }
      }

      if (classIds) {
        await tx.teacherClass.deleteMany({ where: { teacherId: id } });
        if (classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: classIds.map((classId: string) => ({
              teacherId: id,
              classId,
            })),
          });
        }
      }

      return teacher;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la mise à jour de l'enseignant:", error);
    if (error.message === "Cet email est déjà utilisé") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'enseignant" },
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
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Enseignant non trouvé" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: teacher.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Enseignant désactivé avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de l'enseignant:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'enseignant" },
      { status: 500 }
    );
  }
}
