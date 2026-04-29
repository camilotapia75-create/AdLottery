import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({
    loggedIn: true,
    email: session.user.email,
    isAdmin: session.user.isAdmin,
    id: session.user.id,
  });
}
