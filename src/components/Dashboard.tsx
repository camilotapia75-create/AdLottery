"use client";
import { useState, useEffect, useCallback } from "react";
import type { AppSession } from "@/lib/auth";
import AdWatcher from "@/components/AdWatcher";
import StatsCard from "@/components/StatsCard";
import Confetti from "@/components/Confetti";

interface CharityBreakdown { charityId: string | null; charityName: string; votes: number; }
interface DrawDonation { id: string; charity: { name: string }; amount: number; votes: number; sent: boolean; }
interface RecentDraw { id: string; date: string; totalPool: number; donations: DrawDonation[]; }

interface Stats {
  todayPool: number;
  watchersToday: number;
  adsWatchedToday: number;
  dailyLimit: number;
  poolDrawn: boolean;
  totalVotes: number;
  todayBreakdown: CharityBreakdown[];
  recentDraws: RecentDraw[];
}

interface ReferralInfo { referralCode: string | null; referralsCount: number; bonusEntries: number; }

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
    } catch {}
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

  const totalTodayVotes = stats?.todayBreakdown.reduce((s, b) => s + b.votes, 0) ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)" }}>
      {showConfetti && <Confetti />}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">❤️ Ad for Good</h1>
          <p className="text-white/80">Watch ads, donate to charity</p>
          {session.user.name && <p className="text-white/60 text-sm mt-1">Welcome back, {session.user.name}!</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatsCard icon="💰" label="Today's Pool" value={loading ? "..." : `$${(stats?.todayPool ?? 0).toFixed(2)}`} />
          <StatsCard icon="👥" label="Voters Today" value={loading ? "..." : String(stats?.watchersToday ?? 0)} />
          <StatsCard icon="🗳️" label="Your Votes" value={loading ? "..." : String(stats?.adsWatchedToday ?? 0)} />
        </div>

        <AdWatcher
          adsWatchedToday={stats?.adsWatchedToday ?? 0}
          dailyLimit={stats?.dailyLimit ?? 10}
          poolDrawn={stats?.poolDrawn ?? false}
          onAdWatched={handleAdWatched}
          loading={loading}
          userId={session.user.id}
        />

        {/* Today's charity leaderboard */}
        {!loading && stats && stats.todayBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Today&apos;s Votes</h2>
            <p className="text-gray-500 text-sm mb-4">Pool distributes proportionally at end of day</p>
            <div className="space-y-3">
              {[...stats.todayBreakdown]
                .sort((a, b) => b.votes - a.votes)
                .map((b) => {
                  const pct = totalTodayVotes > 0 ? (b.votes / totalTodayVotes) * 100 : 0;
                  const est = (pct / 100) * (stats.todayPool * 0.7);
                  return (
                    <div key={b.charityId ?? "none"}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">{b.charityName}</span>
                        <span className="text-gray-500">{b.votes} vote{b.votes !== 1 ? "s" : ""} · ~${est.toFixed(3)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Recent donation distributions */}
        {!loading && stats && stats.recentDraws.length > 0 && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Donations</h2>
            <div className="space-y-4">
              {stats.recentDraws.map((draw) => (
                <div key={draw.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{draw.date}</span>
                    <span className="text-sm text-gray-500">Pool: ${draw.totalPool.toFixed(3)}</span>
                  </div>
                  {draw.donations.map((d) => (
                    <div key={d.id} className="flex justify-between text-xs text-gray-500 ml-2">
                      <span>{d.charity.name}</span>
                      <span className="text-green-600 font-medium">${d.amount.toFixed(3)} {d.sent ? "✓ sent" : ""}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-6">How It Works</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-4xl mb-3">📺</div><div className="font-semibold text-gray-800 mb-1">1. Watch Ads</div><div className="text-sm text-gray-500">Up to 10 short video ads per day</div></div>
            <div><div className="text-4xl mb-3">🗳️</div><div className="font-semibold text-gray-800 mb-1">2. Vote for Charity</div><div className="text-sm text-gray-500">Each ad = one vote for your chosen cause</div></div>
            <div><div className="text-4xl mb-3">❤️</div><div className="font-semibold text-gray-800 mb-1">3. Donations Sent</div><div className="text-sm text-gray-500">Ad revenue goes to charities by vote share</div></div>
          </div>
        </div>

        {/* Referral */}
        {referral?.referralCode && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">🎁 Refer a Friend</h2>
            <p className="text-gray-500 text-sm text-center mb-4">Share your link — when a friend signs up, you both get 5 bonus votes!</p>
            <div className="flex gap-2 mb-3">
              <input readOnly value={`${window.location.origin}/register?ref=${referral.referralCode}`} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50 truncate" />
              <button onClick={copyReferralLink} className="px-4 py-2 text-white text-sm font-semibold rounded-xl shrink-0 transition-colors" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>{copied ? "Copied!" : "Copy"}</button>
            </div>
            {referral.referralsCount > 0 && (
              <p className="text-center text-sm text-purple-600 font-medium">✅ {referral.referralsCount} {referral.referralsCount === 1 ? "friend" : "friends"} referred · {referral.bonusEntries} bonus votes earned</p>
            )}
          </div>
        )}

        {session.user.isAdmin && <div className="text-center mb-4"><a href="/admin" className="text-white/80 underline text-sm hover:text-white">Admin Panel</a></div>}
        <div className="text-center">
          <button onClick={handleSignOut} className="text-white/70 underline text-sm hover:text-white transition-colors">Sign Out</button>
        </div>
      </div>
    </div>
  );
}
