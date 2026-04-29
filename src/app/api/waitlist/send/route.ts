import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendBatchEmails } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { subject, message } = await req.json();
  if (!subject || !message)
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
  const waitlist = await prisma.waitlist.findMany({ select: { email: true } });
  if (!waitlist.length)
    return NextResponse.json({ error: "Waitlist is empty" }, { status: 400 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><div style="background:linear-gradient(135deg,#9333ea 0%,#ec4899 100%);padding:40px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="color:white;margin:0;font-size:28px;">&#x1F4B0; Ad Lottery</h1><p style="color:rgba(255,255,255,0.8);margin-top:8px;">Watch ads, win real money</p></div><div style="background:white;padding:40px;border-radius:0 0 12px 12px;"><div style="font-size:16px;color:#374151;line-height:1.7;">${message.replace(/\n/g, "<br>")}</div>${siteUrl ? `<div style="text-align:center;margin-top:32px;"><a href="${siteUrl}/register" style="background:linear-gradient(135deg,#9333ea 0%,#ec4899 100%);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">Join Now &#x2192;</a></div>` : ""}<p style="color:#9ca3af;font-size:12px;margin-top:32px;text-align:center;">You received this because you joined the Ad Lottery waitlist.</p></div></div>`;
  const emails = waitlist.map((w) => w.email);
  const { sent, failed } = await sendBatchEmails({ emails, subject, html });
  return NextResponse.json({ ok: true, sent, failed });
}
