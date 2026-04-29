import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function addToResendAudience(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return;
  const [firstName, ...rest] = (name ?? "").trim().split(" ");
  await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      first_name: firstName || undefined,
      last_name: rest.join(" ") || undefined,
      unsubscribed: false,
    }),
  }).catch(() => {}); // non-fatal — DB save is the source of truth
}

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || !String(email).includes("@"))
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    const existing = await prisma.waitlist.findUnique({ where: { email: String(email) } });
    if (existing)
      return NextResponse.json({ error: "You're already on the waitlist!" }, { status: 409 });
    await prisma.waitlist.create({
      data: { email: String(email), name: name ? String(name) : undefined },
    });
    await addToResendAudience(String(email), name ? String(name) : undefined);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [waitlist, count] = await Promise.all([
    prisma.waitlist.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.waitlist.count(),
  ]);
  return NextResponse.json({ waitlist, count });
}
