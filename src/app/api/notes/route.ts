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

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
          subject: { select: { id: true, name: true, code: true, coefficient: true } },
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
    console.error("Erreur lors de la récupération des notes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notes" },
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
      studentId,
      subjectId,
      teacherId,
      schoolYearId,
      termId,
      classId,
      evaluationType,
      score,
      maxScore,
      coefficient,
      comment,
      evaluationName,
    } = body;

    if (!studentId || !subjectId || !teacherId || !schoolYearId || !termId || !classId || !evaluationType || score === undefined) {
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
        coefficient: coefficient || 1,
        comment,
        evaluationName,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        subject: { select: { id: true, name: true, code: true, coefficient: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la note" },
      { status: 500 }
    );
  }
}