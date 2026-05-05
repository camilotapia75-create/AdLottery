import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate, getAdViewsToday, addToPool, DAILY_AD_LIMIT } from "@/lib/lottery";

const AD_REVENUE_PER_VIEW = 0.001;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const today = getTodayDate();

  const body = await req.json().catch(() => ({}));
  const charityId: string | null = body.charityId ?? null;

  try {
    const adsToday = await getAdViewsToday(userId, today);
    if (adsToday >= DAILY_AD_LIMIT)
      return NextResponse.json({ error: "You've reached today's ad limit. Come back tomorrow!" }, { status: 400 });

    // Validate charityId if provided
    if (charityId) {
      const charity = await prisma.charity.findUnique({ where: { id: charityId, active: true } });
      if (!charity) return NextResponse.json({ error: "Invalid charity" }, { status: 400 });
    }

    const adView = await prisma.adView.create({ data: { userId, date: today, adRevenue: AD_REVENUE_PER_VIEW } });
    await prisma.lotteryEntry.create({ data: { userId, adViewId: adView.id, date: today, charityId: charityId || null } });
    await addToPool(today, AD_REVENUE_PER_VIEW);
    const pool = await prisma.dailyPool.findUnique({ where: { date: today } });
    return NextResponse.json({ success: true, message: "Ad watched! Your vote has been cast.", pool: pool?.totalPool ?? 0, viewCount: pool?.viewCount ?? 0 });
  } catch (error) {
    console.error("Error recording ad view:", error);
    return NextResponse.json({ error: "Failed to record ad view" }, { status: 500 });
  }
}
