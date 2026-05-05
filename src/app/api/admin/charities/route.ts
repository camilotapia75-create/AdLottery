import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const charities = await prisma.charity.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ charities });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, description, website } = await req.json();
  if (!name || !description) return NextResponse.json({ error: "Name and description required" }, { status: 400 });
  const charity = await prisma.charity.create({ data: { name, description, website: website || null } });
  return NextResponse.json({ charity });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, name, description, website, active } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const charity = await prisma.charity.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(website !== undefined && { website }), ...(active !== undefined && { active }) },
  });
  return NextResponse.json({ charity });
}
