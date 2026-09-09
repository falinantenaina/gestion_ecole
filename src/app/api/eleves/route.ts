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
    const gender = searchParams.get("gender");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { matricule: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (gender) {
      where.gender = gender;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: { select: { isActive: true } },
          enrollments: {
            include: { class: true, schoolYear: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des élèves" },
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
      dateOfBirth,
      gender,
      address,
      phone,
      placeOfBirth,
      nationality,
      bloodGroup,
      medicalNotes,
      parentName,
      parentPhone,
      parentEmail,
      parentRelation,
    } = body;

    if (!email || !password || !firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: "Les champs email, mot de passe, nom, prénom, date de naissance et genre sont requis" },
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
    const lastStudent = await prisma.student.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const nextNumber = lastStudent
      ? parseInt(lastStudent.matricule.split("-").pop()!) + 1
      : 1;
    const matricule = `ELV-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "STUDENT",
          firstName,
          lastName,
          phone,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          matricule,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
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
        },
      });

      return student;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'élève:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'élève" },
      { status: 500 }
    );
  }
}