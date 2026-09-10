import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
    const { id } = await params;

    const classe = await prisma.class.findUnique({ where: { id } });
    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId: id, status: "VALIDATED" },
      include: {
        student: true,
      },
      orderBy: { student: { lastName: "asc" } },
    });

    return NextResponse.json({
      data: enrollments.map((e) => ({
        enrollmentId: e.id,
        enrollmentDate: e.enrollmentDate,
        status: e.status,
        student: e.student,
      })),
      total: enrollments.length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des élèves:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des élèves" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.DIRECTOR]);

    const { id } = await params;
    const body = await request.json();
    const { studentId, schoolYearId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "L'élève est requis" },
        { status: 400 }
      );
    }

    const classe = await prisma.class.findUnique({
      where: { id },
      include: { enrollments: { where: { status: "VALIDATED" } }, schoolYear: true },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    if (classe.enrollments.length >= classe.capacity) {
      return NextResponse.json(
        { error: "La classe est complète. Impossible d'inscrire plus d'élèves." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolYearId: schoolYearId || classe.schoolYearId,
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.classId === id) {
        return NextResponse.json(
          { error: "Cet élève est déjà inscrit dans cette classe" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Cet élève est déjà inscrit dans une autre classe cette année scolaire" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId: id,
        schoolYearId: schoolYearId || classe.schoolYearId,
        status: "VALIDATED",
      },
      include: { student: true },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de l'inscription de l'élève:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription de l'élève" },
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
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.DIRECTOR]);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "L'identifiant de l'élève est requis" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        classId: id,
        studentId,
        status: "VALIDATED",
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Inscription non trouvée" },
        { status: 404 }
      );
    }

    await prisma.enrollment.delete({ where: { id: enrollment.id } });

    return NextResponse.json({ message: "Élève retiré de la classe avec succès" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la suppression de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'inscription" },
      { status: 500 }
    );
  }
}
