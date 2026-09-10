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
    const schoolYearId = searchParams.get("schoolYearId");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { level: { contains: search, mode: "insensitive" } },
      ];
    }
    if (schoolYearId) {
      where.schoolYearId = schoolYearId;
    }

    if (session.user.role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const classIds = (
        await prisma.teacherClass.findMany({
          where: { teacherId },
          select: { classId: true },
        })
      ).map((tc) => tc.classId);
      where.id = { in: classIds };
    }

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          schoolYear: true,
          enrollments: { where: { status: "VALIDATED" } },
          teacherClasses: { include: { teacher: true } },
          subjects: { include: { subject: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.class.count({ where }),
    ]);

    return NextResponse.json({
      data: classes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des classes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { name, level, section, capacity, schoolYearId, description, subjects } = body;

    if (!name || !level || !schoolYearId) {
      return NextResponse.json(
        { error: "Les champs nom, niveau et année scolaire sont requis" },
        { status: 400 }
      );
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

    const existingClass = await prisma.class.findFirst({
      where: { name, schoolYearId },
    });
    if (existingClass) {
      return NextResponse.json(
        { error: "Une classe avec ce nom existe déjà pour cette année scolaire" },
        { status: 400 }
      );
    }

    const result = await prisma.class.create({
      data: {
        name,
        level,
        section,
        capacity: capacity || 40,
        schoolYearId,
        description,
        ...(Array.isArray(subjects) && subjects.length > 0
          ? {
              subjects: {
                create: subjects.map((s: { subjectId: string; coefficient?: number }) => ({
                  subjectId: s.subjectId,
                  coefficient: s.coefficient ?? 1,
                })),
              },
            }
          : {}),
      },
      include: { schoolYear: true, subjects: { include: { subject: true } } },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la classe" },
      { status: 500 }
    );
  }
}
