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
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        teacherSubjects: { include: { teacher: true } },
        classSubjects: { include: { class: true } },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 });
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error("Erreur lors de la récupération de la matière:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la matière" },
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
    const { name, code, description } = body;

    const existingSubject = await prisma.subject.findUnique({ where: { id } });
    if (!existingSubject) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 });
    }

    if (code && code !== existingSubject.code) {
      const codeTaken = await prisma.subject.findFirst({
        where: { code, id: { not: id } },
      });
      if (codeTaken) {
        return NextResponse.json(
          { error: "Une matière avec ce code existe déjà" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la matière:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la matière" },
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
    const subject = await prisma.subject.findUnique({ where: { id } });

    if (!subject) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 });
    }

    await prisma.subject.delete({ where: { id } });

    return NextResponse.json({ message: "Matière supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la matière:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la matière" },
      { status: 500 }
    );
  }
}