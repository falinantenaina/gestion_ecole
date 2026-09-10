import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSessionRole, requireRole } from "@/lib/api-helpers";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY, Role.ACCOUNTANT]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [paymentTypes, total] = await Promise.all([
      prisma.paymentType.findMany({
        where,
        include: {
          _count: { select: { payments: true } },
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.paymentType.count({ where }),
    ]);

    return NextResponse.json({
      data: paymentTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des types de paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des types de paiement" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionRole();
    requireRole(session, [Role.ADMIN, Role.SECRETARY]);

    const body = await request.json();
    const { name, description, amount } = body;

    if (!name || !amount) {
      return NextResponse.json(
        { error: "Les champs nom et montant sont requis" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être supérieur à 0" },
        { status: 400 }
      );
    }

    const existing = await prisma.paymentType.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Un type de paiement avec ce nom existe déjà" },
        { status: 409 }
      );
    }

    const result = await prisma.paymentType.create({
      data: { name, description, amount },
      include: {
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du type de paiement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du type de paiement" },
      { status: 500 }
    );
  }
}
