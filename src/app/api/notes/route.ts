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
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const termId = searchParams.get("termId");
    const schoolYearId = searchParams.get("schoolYearId");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (termId) where.termId = termId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const role = session.user.role;

    if (role === Role.TEACHER) {
      const teacherId = await getTeacherId(session.user.id);
      const classIds = (
        await prisma.teacherClass.findMany({
          where: { teacherId },
          select: { classId: true },
        })
      ).map((tc) => tc.classId);
      where.OR = [
        { teacherId },
        { classId: { in: classIds } },
      ];
    } else if (role === Role.STUDENT) {
      const sid = await getStudentId(session.user.id);
      where.studentId = sid;
    } else if (role === Role.PARENT) {
      const childIds = await getChildStudentIds(session.user.id);
      where.studentId = { in: childIds };
    }

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
          term: true,
          class: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { evaluationDate: "desc" },
      }),
      prisma.grade.count({ where }),
    ]);

    return NextResponse.json({
      data: grades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la récupération des notes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.TEACHER]);

    const teacherId = await getTeacherId(session.user.id);

    const body = await request.json();
    const {
      studentId,
      subjectId,
      schoolYearId,
      termId,
      classId,
      evaluationType,
      score,
      maxScore,
      comment,
      evaluationName,
    } = body;

    if (!studentId || !subjectId || !schoolYearId || !termId || !classId || !evaluationType || score === undefined) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    if (score < 0 || (maxScore && score > maxScore)) {
      return NextResponse.json(
        { error: "La note doit être comprise entre 0 et la note maximale" },
        { status: 400 }
      );
    }

    const teacherSubject = await prisma.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    });
    if (!teacherSubject) {
      return NextResponse.json(
        { error: "Vous n'enseignez pas cette matière" },
        { status: 403 }
      );
    }

    const teacherClass = await prisma.teacherClass.findUnique({
      where: { teacherId_classId: { teacherId, classId } },
    });
    if (!teacherClass) {
      return NextResponse.json(
        { error: "Vous n'êtes pas assigné à cette classe" },
        { status: 403 }
      );
    }

    const classSubject = await prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    const coefficient = classSubject?.coefficient ?? 1;

    const result = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        teacherId,
        schoolYearId,
        termId,
        classId,
        evaluationType,
        score,
        maxScore: maxScore || 20,
        coefficient,
        comment,
        evaluationName,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Erreur lors de la création de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la note" },
      { status: 500 }
    );
  }
}
