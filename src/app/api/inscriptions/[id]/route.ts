import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        schoolYear: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'inscription" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, classId } = body;

    const enrollment = await prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    if (status === "VALIDATED") {
      const classe = await prisma.class.findUnique({
        where: { id: classId || enrollment.classId },
        include: { enrollments: { where: { status: "VALIDATED" } } },
      });
      if (classe && classe.enrollments.length >= classe.capacity) {
        return NextResponse.json(
          { error: "La classe est complète" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.enrollment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(classId && { classId }),
      },
      include: {
        student: true,
        class: true,
        schoolYear: true,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'inscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const enrollment = await prisma.enrollment.findUnique({ where: { id } });

    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    await prisma.enrollment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Inscription annulée avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'annulation de l'inscription:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'inscription" },
      { status: 500 }
    );
  }
}