import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate, getAdViewsToday, addToPool, DAILY_AD_LIMIT } from "@/lib/lottery";

const AD_REVENUE_PER_VIEW = 0.001;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const today = getTodayDate();
  try {
    const adsToday = await getAdViewsToday(userId, today);
    if (adsToday >= DAILY_AD_LIMIT)
      return NextResponse.json({ error: "You've reached today's ad limit. Come back tomorrow!" }, { status: 400 });
    const adView = await prisma.adView.create({ data: { userId, date: today, adRevenue: AD_REVENUE_PER_VIEW } });
    await prisma.lotteryEntry.create({ data: { userId, adViewId: adView.id, date: today } });
    await addToPool(today, AD_REVENUE_PER_VIEW);
    const pool = await prisma.dailyPool.findUnique({ where: { date: today } });
    return NextResponse.json({ success: true, message: "Ad watched! You're entered in today's lottery.", pool: pool?.totalPool ?? 0, viewCount: pool?.viewCount ?? 0 });
  } catch (error) {
    console.error("Error recording ad view:", error);
    return NextResponse.json({ error: "Failed to record ad view" }, { status: 500 });
  }
}
