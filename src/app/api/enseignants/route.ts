import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        include: {
          user: { select: { isActive: true } },
          teacherSubjects: { include: { subject: true } },
          teacherClasses: { include: { class: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.teacher.count({ where }),
    ]);

    return NextResponse.json({
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des enseignants:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des enseignants" },
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
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      hireDate,
      qualification,
      specialization,
      subjectIds,
      classIds,
    } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Les champs email, mot de passe, nom et prénom sont requis" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const lastTeacher = await prisma.teacher.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const nextNumber = lastTeacher
      ? parseInt(lastTeacher.employeeId.split("-").pop()!) + 1
      : 1;
    const employeeId = `ENS-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "TEACHER",
          firstName,
          lastName,
          phone,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          employeeId,
          firstName,
          lastName,
          phone,
          email,
          address,
          hireDate: hireDate ? new Date(hireDate) : null,
          qualification,
          specialization,
        },
      });

      if (subjectIds && subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjectIds.map((subjectId: string) => ({
            teacherId: teacher.id,
            subjectId,
          })),
        });
      }

      if (classIds && classIds.length > 0) {
        await tx.teacherClass.createMany({
          data: classIds.map((classId: string) => ({
            teacherId: teacher.id,
            classId,
          })),
        });
      }

      return teacher;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'enseignant:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'enseignant" },
      { status: 500 }
    );
  }
}