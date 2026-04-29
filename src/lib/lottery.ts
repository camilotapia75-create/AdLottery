import { prisma } from "@/lib/prisma";

export const DAILY_AD_LIMIT = 10;

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function addToPool(date: string, revenue: number) {
  return prisma.dailyPool.upsert({
    where: { date },
    update: { totalPool: { increment: revenue }, viewCount: { increment: 1 } },
    create: { date, totalPool: revenue, viewCount: 1 },
  });
}

export async function getAdViewsToday(userId: string, date: string): Promise<number> {
  return prisma.adView.count({ where: { userId, date } });
}

export async function hasWatchedAdToday(userId: string, date: string): Promise<boolean> {
  const count = await getAdViewsToday(userId, date);
  return count >= DAILY_AD_LIMIT;
}

export async function drawLottery(date: string) {
  const pool = await prisma.dailyPool.findUnique({ where: { date } });
  if (!pool || pool.drawn) return { success: false, message: pool?.drawn ? "Already drawn" : "No pool found" };
  const entries = await prisma.lotteryEntry.findMany({ where: { date }, include: { user: true } });
  if (entries.length === 0) return { success: false, message: "No entries for today" };
  const winnersCount = Math.min(10, Math.max(1, Math.floor(entries.length * 0.1)));
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, winnersCount);
  const prizePool = pool.totalPool * 0.7;
  const prizePerWinner = prizePool / winnersCount;
  const winnerIds = winners.map((w) => w.userId);
  await prisma.lotteryEntry.updateMany({ where: { date, userId: { in: winnerIds } }, data: { isWinner: true } });
  await Promise.all(winners.map((winner) => prisma.earning.create({ data: { userId: winner.userId, amount: prizePerWinner, date } })));
  const draw = await prisma.lotteryDraw.create({ data: { date, totalPool: pool.totalPool, totalViews: pool.viewCount, winnersCount, prizePerWinner, winnerIds: JSON.stringify(winnerIds) } });
  await prisma.dailyPool.update({ where: { date }, data: { drawn: true } });
  return { success: true, draw, winners: winners.map((w) => ({ name: w.user.name, email: w.user.email })), prizePerWinner };
}
