import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data: schoolYears });
  } catch (error) {
    console.error("Erreur lors de la récupération des années scolaires:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des années scolaires" },
      { status: 500 }
    );
  }
}
