import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true, _count: { select: { referralsMade: true } } },
  });

  if (user && !user.referralCode) {
    let code = generateReferralCode();
    while (await prisma.user.findUnique({ where: { referralCode: code } })) {
      code = generateReferralCode();
    }
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode: code },
      select: { referralCode: true, _count: { select: { referralsMade: true } } },
    });
  }

  return NextResponse.json({
    referralCode: user?.referralCode ?? null,
    referralsCount: user?._count.referralsMade ?? 0,
    bonusEntries: (user?._count.referralsMade ?? 0) * 5,
  });
}
