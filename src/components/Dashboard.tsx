"use client";
import { useState, useEffect, useCallback } from "react";
import type { AppSession } from "@/lib/auth";
import AdWatcher from "@/components/AdWatcher";
import StatsCard from "@/components/StatsCard";
import WinHistory from "@/components/WinHistory";
import LotteryDraws from "@/components/LotteryDraws";
import Confetti from "@/components/Confetti";

interface Stats {
  todayPool: number; watchersToday: number; adsWatchedToday: number; dailyLimit: number;
  poolDrawn: boolean; userEarnings: number; totalEntries: number; totalWins: number;
  recentWins: Array<{ id: string; amount: number; date: string; createdAt: string }>;
  recentDraws: Array<{ id: string; date: string; totalPool: number; winnersCount: number; prizePerWinner: number }>;
}

interface ReferralInfo {
  referralCode: string | null;
  referralsCount: number;
  bonusEntries: number;
}

export default function Dashboard({ session }: { session: AppSession }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/lottery/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error("Failed to fetch stats:", err); }
    finally { setLoading(false); }
  }, []);

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch("/api/referral");
      if (res.ok) setReferral(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); fetchReferral(); }, [fetchStats, fetchReferral]);

  function handleAdWatched() { fetchStats(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function copyReferralLink() {
    if (!referral?.referralCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referral.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)" }}>
      {showConfetti && <Confetti />}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">&#x1F4B0; Ad Lottery</h1>
          <p className="text-white/80">Watch ads, win real money</p>
          {session.user.name && <p className="text-white/60 text-sm mt-1">Welcome back, {session.user.name}!</p>}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatsCard icon="$" label="Today's Pool" value={loading ? "..." : `$${(stats?.todayPool ?? 0).toFixed(2)}`} />
          <StatsCard icon="&#x1F465;" label="Watchers Today" value={loading ? "..." : String(stats?.watchersToday ?? 0)} />
          <StatsCard icon="&#x1F3C6;" label="Your Earnings" value={loading ? "..." : `$${(stats?.userEarnings ?? 0).toFixed(2)}`} />
        </div>
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white text-center"><div className="text-2xl font-bold">{stats.totalEntries}</div><div className="text-sm text-white/70">Total Entries</div></div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white text-center"><div className="text-2xl font-bold">{stats.totalWins}</div><div className="text-sm text-white/70">Total Wins</div></div>
          </div>
        )}
        <AdWatcher
          adsWatchedToday={stats?.adsWatchedToday ?? 0}
          dailyLimit={stats?.dailyLimit ?? 10}
          poolDrawn={stats?.poolDrawn ?? false}
          onAdWatched={handleAdWatched}
          loading={loading}
          userId={session.user.id}
        />
        {referral?.referralCode && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">&#x1F381; Refer a Friend</h2>
            <p className="text-gray-500 text-sm text-center mb-4">Share your link &mdash; when a friend signs up, you both get 5 free lottery entries!</p>
            <div className="flex gap-2 mb-3">
              <input readOnly value={`${window.location.origin}/register?ref=${referral.referralCode}`} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50 truncate" />
              <button onClick={copyReferralLink} className="px-4 py-2 text-white text-sm font-semibold rounded-xl shrink-0 transition-colors" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>{copied ? "Copied!" : "Copy"}</button>
            </div>
            {referral.referralsCount > 0 && (
              <p className="text-center text-sm text-purple-600 font-medium">&#x2705; {referral.referralsCount} {referral.referralsCount === 1 ? "friend" : "friends"} referred &nbsp;&middot;&nbsp; {referral.bonusEntries} bonus entries earned</p>
            )}
          </div>
        )}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-6">How It Works</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-4xl mb-3">&#x1F4FA;</div><div className="font-semibold text-gray-800 mb-1">1. Watch Ads</div><div className="text-sm text-gray-500">Up to 10 video ads per day</div></div>
            <div><div className="text-4xl mb-3">&#x1F3DF;&#xFE0F;</div><div className="font-semibold text-gray-800 mb-1">2. Get Entries</div><div className="text-sm text-gray-500">Each ad = one lottery entry</div></div>
            <div><div className="text-4xl mb-3">&#x1F4B8;</div><div className="font-semibold text-gray-800 mb-1">3. Win Money</div><div className="text-sm text-gray-500">Random winners split the revenue</div></div>
          </div>
        </div>
        {stats && stats.recentWins.length > 0 && <WinHistory wins={stats.recentWins} />}
        {stats && stats.recentDraws.length > 0 && <LotteryDraws draws={stats.recentDraws} />}
        {session.user.isAdmin && <div className="text-center mb-4"><a href="/admin" className="text-white/80 underline text-sm hover:text-white">Admin Panel</a></div>}
        <div className="text-center">
          <button onClick={handleSignOut} className="text-white/70 underline text-sm hover:text-white transition-colors">Sign Out</button>
        </div>
      </div>
    </div>
  );
}
