import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCharitiesSeeded } from "@/lib/lottery";

export async function GET() {
  await ensureCharitiesSeeded();
  const charities = await prisma.charity.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ charities });
}
