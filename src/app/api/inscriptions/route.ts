import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionRole, requireRole, getTeacherId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const classId = searchParams.get("classId");
    const schoolYearId = searchParams.get("schoolYearId");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (classId) {
      where.classId = classId;
    }
    if (schoolYearId) {
      where.schoolYearId = schoolYearId;
    }
    if (search) {
      where.student = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { matricule: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (session.user.role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const classIds = (
        await prisma.teacherClass.findMany({
          where: { teacherId },
          select: { classId: true },
        })
      ).map((tc) => tc.classId);
      where.classId = { in: classIds };
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          student: true,
          class: true,
          schoolYear: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return NextResponse.json({
      data: enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des inscriptions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des inscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { studentId, classId, schoolYearId, notes } = body;

    if (!studentId || !classId || !schoolYearId) {
      return NextResponse.json(
        { error: "Les champs élève, classe et année scolaire sont requis" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
    }

    const classe = await prisma.class.findUnique({ where: { id: classId } });
    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id: schoolYearId },
    });
    if (!schoolYear) {
      return NextResponse.json(
        { error: "Année scolaire non trouvée" },
        { status: 404 }
      );
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_schoolYearId: { studentId, schoolYearId } },
    });
    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Cet élève est déjà inscrit pour cette année scolaire" },
        { status: 400 }
      );
    }

    const validatedCount = await prisma.enrollment.count({
      where: { classId, schoolYearId, status: "VALIDATED" },
    });
    if (validatedCount >= classe.capacity) {
      return NextResponse.json(
        { error: "La classe est complète" },
        { status: 400 }
      );
    }

    const alreadyInClass = await prisma.enrollment.findFirst({
      where: {
        studentId,
        schoolYearId,
        classId,
        status: { in: ["PENDING", "VALIDATED"] },
      },
    });
    const status = alreadyInClass ? "PENDING" : "VALIDATED";

    const result = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
        schoolYearId,
        status,
        notes,
      },
      include: {
        student: true,
        class: true,
        schoolYear: true,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'inscription" },
      { status: 500 }
    );
  }
}
