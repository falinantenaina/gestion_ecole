import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

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
    console.error("Erreur lors de la récupération des classes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { name, level, section, capacity, schoolYearId, description } = body;

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
      },
      include: { schoolYear: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la classe" },
      { status: 500 }
    );
  }
}