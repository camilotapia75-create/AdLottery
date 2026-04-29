import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ loggedIn: false });
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return NextResponse.json({
    loggedIn: true,
    email: session.user.email,
    session_isAdmin: session.user.isAdmin,
    db_isAdmin: dbUser?.isAdmin ?? null,
    id: session.user.id,
  });
}
