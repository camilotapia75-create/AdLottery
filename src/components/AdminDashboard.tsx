"use client";
import { useState, useEffect, useCallback } from "react";
import type { AppSession } from "@/lib/auth";
import Link from "next/link";

interface Charity { id: string; name: string; description: string; website?: string | null; active: boolean; }
interface CharityBreakdown { charityId: string | null; charityName: string; votes: number; }
interface DrawDonation { id: string; charity: { name: string }; amount: number; votes: number; sent: boolean; sentAt?: string | null; }
interface Draw { id: string; date: string; totalPool: number; totalViews: number; drawnAt: string; donations: DrawDonation[]; }

interface AdminStats {
  totalUsers: number;
  totalViews: number;
  todayPool: number;
  watchersToday: number;
  poolDrawn: boolean;
  totalDonated: number;
  allDraws: Draw[];
  todayBreakdown: CharityBreakdown[];
}

interface WaitlistEntry { id: string; email: string; name: string | null; createdAt: string; }

export default function AdminDashboard({ session }: { session: AppSession }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [drawResult, setDrawResult] = useState("");
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split("T")[0]);
  const [waitlist, setWaitlist] = useState<{ list: WaitlistEntry[]; count: number } | null>(null);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [emailSubject, setEmailSubject] = useState("❤️ Ad for Good is now live!");
  const [emailMessage, setEmailMessage] = useState("Hi there!\n\nGreat news — Ad for Good is officially live! Watch short video ads and the ad revenue gets donated to your chosen charity.\n\nSign up now and start making a difference!");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [newCharity, setNewCharity] = useState({ name: "", description: "", website: "" });
  const [addingCharity, setAddingCharity] = useState(false);
  const [charityMsg, setCharityMsg] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) { const d = await res.json(); setWaitlist({ list: d.waitlist, count: d.count }); }
    } catch {}
  }, []);

  const fetchCharities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/charities");
      if (res.ok) { const d = await res.json(); setCharities(d.charities); }
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); fetchWaitlist(); fetchCharities(); }, [fetchStats, fetchWaitlist, fetchCharities]);

  async function handleDistribute() {
    setDistributing(true); setDrawResult("");
    try {
      const res = await fetch("/api/admin/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: drawDate }) });
      const data = await res.json();
      if (res.ok) {
        const lines = data.donations?.map((d: { charity: string; votes: number; amount: number }) => `${d.charity}: ${d.votes} votes → $${d.amount.toFixed(4)}`).join(", ");
        setDrawResult(`✅ Distributed $${data.donationPool?.toFixed(4)} — ${lines}`);
        fetchStats();
      } else {
        setDrawResult(`❌ Error: ${data.error}`);
      }
    } catch { setDrawResult("❌ Network error"); }
    finally { setDistributing(false); }
  }

  async function markDonationSent(id: string) {
    await fetch("/api/admin/donations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchStats();
  }

  async function handleSendEmail() {
    setSending(true); setSendResult("");
    try {
      const res = await fetch("/api/waitlist/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: emailSubject, message: emailMessage }) });
      const data = await res.json();
      if (res.ok) setSendResult(`✅ Sent to ${data.sent} people${data.failed ? `, ${data.failed} failed` : ""}.`);
      else setSendResult(`❌ ${data.error}`);
    } catch { setSendResult("❌ Network error"); }
    finally { setSending(false); }
  }

  async function handleAddCharity() {
    if (!newCharity.name || !newCharity.description) { setCharityMsg("Name and description required"); return; }
    setAddingCharity(true); setCharityMsg("");
    try {
      const res = await fetch("/api/admin/charities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCharity) });
      if (res.ok) { setNewCharity({ name: "", description: "", website: "" }); setCharityMsg("✅ Charity added"); fetchCharities(); }
      else { const d = await res.json(); setCharityMsg(`❌ ${d.error}`); }
    } catch { setCharityMsg("❌ Network error"); }
    finally { setAddingCharity(false); }
  }

  async function toggleCharity(id: string, active: boolean) {
    await fetch("/api/admin/charities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: !active }) });
    fetchCharities();
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const totalTodayVotes = stats?.todayBreakdown.reduce((s, b) => s + b.votes, 0) ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-white">⚙️ Admin Panel</h1><p className="text-white/60 text-sm">Ad for Good Management</p></div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm hover:bg-white/30 transition-colors">← Back to App</Link>
            <button onClick={handleSignOut} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl text-sm hover:bg-red-500/30 transition-colors">Sign Out</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats?.totalUsers ?? 0, icon: "👥" },
            { label: "Total Ad Views", value: stats?.totalViews ?? 0, icon: "👁️" },
            { label: "Today's Voters", value: stats?.watchersToday ?? 0, icon: "📅" },
            { label: "Total Donated", value: `$${(stats?.totalDonated ?? 0).toFixed(4)}`, icon: "❤️" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{loading ? "..." : s.value}</div>
              <div className="text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Today's pool + breakdown */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">💰 Today&apos;s Pool</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-green-400">${(stats?.todayPool ?? 0).toFixed(4)}</div>
            <div>{stats?.poolDrawn ? <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">✅ Distributed</span> : <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">⏳ Pending</span>}</div>
          </div>
          {stats && stats.todayBreakdown.length > 0 && (
            <div className="space-y-2 mb-4">
              {[...stats.todayBreakdown].sort((a, b) => b.votes - a.votes).map((b) => {
                const pct = totalTodayVotes > 0 ? (b.votes / totalTodayVotes) * 100 : 0;
                const est = (pct / 100) * (stats.todayPool * 0.7);
                return (
                  <div key={b.charityId ?? "none"}>
                    <div className="flex justify-between text-sm text-white/80 mb-1">
                      <span>{b.charityName}</span>
                      <span>{b.votes} votes ({pct.toFixed(0)}%) · ~${est.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(135deg, #a855f7, #ec4899)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1"><label className="text-sm text-white/70 mb-1 block">Distribution Date</label><input type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400" /></div>
            <button onClick={handleDistribute} disabled={distributing} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50">{distributing ? "Distributing..." : "❤️ Distribute Now"}</button>
          </div>
          {drawResult && <div className="mt-4 p-4 rounded-xl text-sm bg-white/10 text-white/90">{drawResult}</div>}
        </div>

        {/* Charities management */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🏥 Charities</h2>
          <div className="space-y-2 mb-4">
            {charities.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-white/40 text-xs ml-2">{c.description}</span>
                </div>
                <button onClick={() => toggleCharity(c.id, c.active)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${c.active ? "bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300" : "bg-red-500/20 text-red-300 hover:bg-green-500/20 hover:text-green-300"}`}>
                  {c.active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 space-y-2">
            <p className="text-white/70 text-sm font-medium">Add charity:</p>
            <input value={newCharity.name} onChange={(e) => setNewCharity((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full px-4 py-2 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none placeholder-white/40 text-sm" />
            <input value={newCharity.description} onChange={(e) => setNewCharity((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full px-4 py-2 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none placeholder-white/40 text-sm" />
            <input value={newCharity.website} onChange={(e) => setNewCharity((p) => ({ ...p, website: e.target.value }))} placeholder="Website (optional)" className="w-full px-4 py-2 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none placeholder-white/40 text-sm" />
            <button onClick={handleAddCharity} disabled={addingCharity} className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-semibold rounded-xl text-sm disabled:opacity-50">+ Add Charity</button>
            {charityMsg && <p className="text-sm text-white/80">{charityMsg}</p>}
          </div>
        </div>

        {/* Donation history with mark-as-sent */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Donation History</h2>
          {loading ? <div className="text-white/40">Loading...</div> : !stats?.allDraws.length ? <div className="text-white/40 text-center py-8">No distributions yet</div> : (
            <div className="space-y-4">
              {stats.allDraws.map((draw) => (
                <div key={draw.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-white font-semibold">{draw.date}</span>
                    <span className="text-white/50 text-sm">Pool: ${draw.totalPool.toFixed(4)}</span>
                  </div>
                  {draw.donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-white/80">{d.charity.name} <span className="text-white/40">({d.votes} votes)</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-medium">${d.amount.toFixed(4)}</span>
                        {d.sent ? (
                          <span className="text-green-400 text-xs">✓ sent {d.sentAt ? new Date(d.sentAt).toLocaleDateString() : ""}</span>
                        ) : (
                          <button onClick={() => markDonationSent(d.id)} className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/40">Mark sent</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waitlist */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📋 Waitlist</h2>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{waitlist?.count ?? 0} people</span>
          </div>
          {waitlist && waitlist.count > 0 ? (
            <>
              <div className="max-h-48 overflow-y-auto mb-4 space-y-1">
                {waitlist.list.slice(0, 30).map((w) => (
                  <div key={w.id} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-white text-sm">{w.email}</span>
                    {w.name && <span className="text-white/40 text-xs">{w.name}</span>}
                  </div>
                ))}
                {waitlist.count > 30 && <p className="text-white/40 text-xs text-center pt-1">+{waitlist.count - 30} more</p>}
              </div>
              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-white/70 text-sm font-medium">Send email to all waitlisters:</p>
                <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject" className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-white/40" />
                <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4} placeholder="Email body..." className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-white/40 resize-none" />
                <button onClick={handleSendEmail} disabled={sending} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50">{sending ? "Sending..." : `📧 Send to All ${waitlist.count} Waitlisters`}</button>
                {sendResult && <div className="p-3 rounded-xl text-sm bg-white/10 text-white/90">{sendResult}</div>}
              </div>
            </>
          ) : (
            <p className="text-white/40 text-center py-6">No waitlist signups yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
