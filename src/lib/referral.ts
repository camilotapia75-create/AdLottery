import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/lib/lottery";

const REFERRAL_BONUS_ENTRIES = 5;

export function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function creditReferral(
  referrerId: string,
  refereeId: string,
  code: string
) {
  const today = getTodayDate();
  await prisma.referral.create({ data: { code, referrerId, refereeId } });
  await prisma.lotteryEntry.createMany({
    data: Array.from({ length: REFERRAL_BONUS_ENTRIES }, () => ({
      userId: referrerId,
      date: today,
      source: "referral",
    })),
  });
}
