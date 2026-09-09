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
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        include: {
          teacherSubjects: { include: { teacher: true } },
          classSubjects: { include: { class: true } },
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.subject.count({ where }),
    ]);

    return NextResponse.json({
      data: subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des matières:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des matières" },
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
    const { name, code, description, coefficient } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Les champs nom et code sont requis" },
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({ where: { code } });
    if (existingSubject) {
      return NextResponse.json(
        { error: "Une matière avec ce code existe déjà" },
        { status: 400 }
      );
    }

    const result = await prisma.subject.create({
      data: {
        name,
        code,
        description,
        coefficient: coefficient || 1,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la matière:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la matière" },
      { status: 500 }
    );
  }
}