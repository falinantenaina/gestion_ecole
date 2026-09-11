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

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
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

    const role = session.user.role;

    if (role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const classIds = (
        await prisma.teacherClass.findMany({
          where: { teacherId },
          select: { classId: true },
        })
      ).map((tc) => tc.classId);
      where.enrollments = { some: { classId: { in: classIds }, status: "VALIDATED" } };
    } else if (role === Role.PARENT) {
      const childIds = await getChildStudentIds(session.user.id);
      where.id = { in: childIds };
    } else if (role === Role.STUDENT) {
      const studentId = await getStudentId(session.user.id);
      where.id = studentId;
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
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des élèves:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des élèves" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const {
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

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return NextResponse.json(
        { error: "Les champs nom, prénom, date de naissance et genre sont requis" },
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

    const student = await prisma.student.create({
      data: {
        matricule,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
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
      } as any,
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création de l'élève:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'élève" },
      { status: 500 }
    );
  }
}
