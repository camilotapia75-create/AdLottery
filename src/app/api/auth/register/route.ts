import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, creditReferral } from "@/lib/referral";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, referralCode } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        referralCode: generateReferralCode(),
      },
    });
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: String(referralCode) } });
      if (referrer && referrer.id !== user.id) {
        await creditReferral(referrer.id, user.id, String(referralCode));
      }
    }
    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
