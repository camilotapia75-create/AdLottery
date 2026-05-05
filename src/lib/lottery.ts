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

const STARTER_CHARITIES = [
  { name: "Red Cross", description: "Disaster relief and emergency assistance worldwide.", website: "https://www.redcross.org" },
  { name: "UNICEF", description: "Protecting children's rights and welfare globally.", website: "https://www.unicef.org" },
  { name: "WWF", description: "Wildlife conservation and protecting the natural environment.", website: "https://www.worldwildlife.org" },
  { name: "Doctors Without Borders", description: "Emergency medical aid in crisis zones around the world.", website: "https://www.doctorswithoutborders.org" },
  { name: "St. Jude Children's Research Hospital", description: "Pioneering research and treatment for pediatric cancer.", website: "https://www.stjude.org" },
];

export async function ensureCharitiesSeeded() {
  const count = await prisma.charity.count();
  if (count === 0) {
    await prisma.charity.createMany({ data: STARTER_CHARITIES });
  }
}

export async function distributeDonations(date: string) {
  const pool = await prisma.dailyPool.findUnique({ where: { date } });
  if (!pool) return { success: false, message: "No pool found for this date" };
  if (pool.drawn) return { success: false, message: "Already drawn for this date" };

  const entries = await prisma.lotteryEntry.findMany({ where: { date } });
  if (entries.length === 0) return { success: false, message: "No entries for this date" };

  const donationPool = pool.totalPool * 0.7;

  // Tally votes per charity; entries with no charity go to the most-voted one
  const voteCounts: Record<string, number> = {};
  let nullVotes = 0;
  for (const e of entries) {
    if (e.charityId) voteCounts[e.charityId] = (voteCounts[e.charityId] ?? 0) + 1;
    else nullVotes++;
  }

  const charityIds = Object.keys(voteCounts);
  if (charityIds.length === 0) {
    // All entries have no charity — pick the first active one
    const fallback = await prisma.charity.findFirst({ where: { active: true } });
    if (!fallback) return { success: false, message: "No active charities configured" };
    charityIds.push(fallback.id);
    voteCounts[fallback.id] = entries.length;
  } else if (nullVotes > 0) {
    // Add null votes to the leading charity
    const leader = charityIds.reduce((a, b) => (voteCounts[a] > voteCounts[b] ? a : b));
    voteCounts[leader] += nullVotes;
  }

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  const draw = await prisma.lotteryDraw.create({
    data: {
      date,
      totalPool: pool.totalPool,
      totalViews: pool.viewCount,
      winnersCount: charityIds.length,
      prizePerWinner: 0,
      winnerIds: "[]",
    },
  });

  const charities = await prisma.charity.findMany({ where: { id: { in: charityIds } } });
  const donations = charityIds.map((id) => {
    const votes = voteCounts[id];
    const amount = (votes / totalVotes) * donationPool;
    return { charityId: id, drawId: draw.id, amount, votes };
  });

  await prisma.charityDonation.createMany({ data: donations });
  await prisma.dailyPool.update({ where: { date }, data: { drawn: true } });

  return {
    success: true,
    draw,
    donations: donations.map((d) => ({
      charity: charities.find((c) => c.id === d.charityId)?.name ?? d.charityId,
      votes: d.votes,
      amount: d.amount,
    })),
    totalPool: pool.totalPool,
    donationPool,
  };
}
