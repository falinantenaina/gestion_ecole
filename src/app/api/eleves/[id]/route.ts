import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getSessionRole,
  requireRole,
  getTeacherId,
  getStudentId,
  getChildStudentIds,
} from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
    const { id } = await params;
    const role = session.user.role;

    if (role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const classIds = (
        await prisma.teacherClass.findMany({
          where: { teacherId },
          select: { classId: true },
        })
      ).map((tc) => tc.classId);
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: id,
          classId: { in: classIds },
          status: "VALIDATED",
        },
      });
      if (!enrollment) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    } else if (role === Role.PARENT) {
      const childIds = await getChildStudentIds(session.user.id);
      if (!childIds.includes(id)) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    } else if (role === Role.STUDENT) {
      const studentId = await getStudentId(session.user.id);
      if (studentId !== id) {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { isActive: true, lastLoginAt: true } },
        enrollments: {
          include: { class: true, schoolYear: true },
          orderBy: { createdAt: "desc" },
        },
        grades: {
          include: { subject: true, term: true },
          orderBy: { evaluationDate: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération de l'élève:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'élève" },
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
      dateOfBirth,
      gender,
      address,
      phone,
      email,
      placeOfBirth,
      nationality,
      bloodGroup,
      medicalNotes,
      parentName,
      parentPhone,
      parentEmail,
      parentRelation,
    } = body;

    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStudent) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (email && email !== existingStudent.user.email) {
        const emailTaken = await tx.user.findUnique({ where: { email } });
        if (emailTaken) {
          throw new Error("Cet email est déjà utilisé");
        }
      }

      if (firstName || lastName || email || phone) {
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(email && { email }),
            ...(phone && { phone }),
          },
        });
      }

      const student = await tx.student.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(gender && { gender }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(placeOfBirth !== undefined && { placeOfBirth }),
          ...(nationality !== undefined && { nationality }),
          ...(bloodGroup !== undefined && { bloodGroup }),
          ...(medicalNotes !== undefined && { medicalNotes }),
          ...(parentName !== undefined && { parentName }),
          ...(parentPhone !== undefined && { parentPhone }),
          ...(parentEmail !== undefined && { parentEmail }),
          ...(parentRelation !== undefined && { parentRelation }),
        },
      });

      return student;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la mise à jour de l'élève:", error);
    if (error.message === "Cet email est déjà utilisé") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'élève" },
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Élève désactivé avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de l'élève:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'élève" },
      { status: 500 }
    );
  }
}
