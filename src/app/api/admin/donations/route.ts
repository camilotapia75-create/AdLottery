import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Donation ID required" }, { status: 400 });
  const donation = await prisma.charityDonation.update({
    where: { id },
    data: { sent: true, sentAt: new Date() },
  });
  return NextResponse.json({ donation });
}
