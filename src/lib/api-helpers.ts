import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
}

export interface AuthSession {
  user: SessionUser;
}

export async function getSessionRole(): Promise<AuthSession> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new NextResponse(
      JSON.stringify({ error: "Non autorisé" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return session as AuthSession;
}

export function requireRole(session: AuthSession, roles: Role[]): void {
  if (!roles.includes(session.user.role)) {
    throw new NextResponse(
      JSON.stringify({ error: "Accès interdit - rôle insuffisant" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function getTeacherId(userId: string): Promise<string> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacher) {
    throw new NextResponse(
      JSON.stringify({ error: "Profil enseignant non trouvé" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return teacher.id;
}

export async function getStudentId(userId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!student) {
    throw new NextResponse(
      JSON.stringify({ error: "Profil élève non trouvé" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return student.id;
}

export async function getParentId(userId: string): Promise<string> {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!parent) {
    throw new NextResponse(
      JSON.stringify({ error: "Profil parent non trouvé" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return parent.id;
}

export async function getChildStudentIds(userId: string): Promise<string[]> {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!parent) return [];

  const students = await prisma.student.findMany({
    where: { parentEmail: { not: null } },
    select: { id: true, parentEmail: true, user: { select: { email: true } } },
  });

  const parentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!parentUser?.email) return [];

  return students
    .filter((s) => s.parentEmail === parentUser.email || s.user?.email === parentUser.email)
    .map((s) => s.id);
}

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { classId: true },
  });
  return teacherClasses.map((tc) => tc.classId);
}

export async function getTeacherSubjectIds(teacherId: string): Promise<string[]> {
  const teacherSubjects = await prisma.teacherSubject.findMany({
    where: { teacherId },
    select: { subjectId: true },
  });
  return teacherSubjects.map((ts) => ts.subjectId);
}
