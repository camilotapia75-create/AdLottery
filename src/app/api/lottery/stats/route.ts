import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayDate, getAdViewsToday, DAILY_AD_LIMIT } from "@/lib/lottery";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const today = getTodayDate();
  try {
    const [pool, adsWatchedToday, totalVotes, recentDraws, todayVotesByCharity] = await Promise.all([
      prisma.dailyPool.findUnique({ where: { date: today } }),
      getAdViewsToday(userId, today),
      prisma.lotteryEntry.count({ where: { userId } }),
      prisma.lotteryDraw.findMany({
        orderBy: { date: "desc" },
        take: 7,
        include: { donations: { include: { charity: true } } },
      }),
      prisma.lotteryEntry.groupBy({
        by: ["charityId"],
        where: { date: today },
        _count: { id: true },
      }),
    ]);

    const charityIds = todayVotesByCharity.map((v) => v.charityId).filter(Boolean) as string[];
    const charities = charityIds.length > 0
      ? await prisma.charity.findMany({ where: { id: { in: charityIds } } })
      : [];

    const todayBreakdown = todayVotesByCharity.map((v) => ({
      charityId: v.charityId,
      charityName: charities.find((c) => c.id === v.charityId)?.name ?? "Unassigned",
      votes: v._count.id,
    }));

    return NextResponse.json({
      todayPool: pool?.totalPool ?? 0,
      watchersToday: pool?.viewCount ?? 0,
      adsWatchedToday,
      dailyLimit: DAILY_AD_LIMIT,
      poolDrawn: pool?.drawn ?? false,
      totalVotes,
      todayBreakdown,
      recentDraws,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
