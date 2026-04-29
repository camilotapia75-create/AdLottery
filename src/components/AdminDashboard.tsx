"use client";
import { useState, useEffect, useCallback } from "react";
import type { AppSession } from "@/lib/auth";
import Link from "next/link";

interface AdminStats {
  totalUsers: number; totalViews: number; todayPool: number; watchersToday: number;
  poolDrawn: boolean; totalEarningsPaid: number;
  allDraws: Array<{ id: string; date: string; totalPool: number; totalViews: number; winnersCount: number; prizePerWinner: number; drawnAt: string }>;
}

interface WaitlistEntry { id: string; email: string; name: string | null; createdAt: string; }

export default function AdminDashboard({ session }: { session: AppSession }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState("");
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split("T")[0]);
  const [waitlist, setWaitlist] = useState<{ list: WaitlistEntry[]; count: number } | null>(null);
  const [emailSubject, setEmailSubject] = useState("&#x1F389; Ad Lottery is now live!");
  const [emailMessage, setEmailMessage] = useState("Hi there!\n\nGreat news — Ad Lottery is officially live! Watch short video ads and get entered into daily cash prize draws.\n\nSign up now and start earning!");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error("Failed to fetch admin stats:", err); }
    finally { setLoading(false); }
  }, []);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) { const data = await res.json(); setWaitlist({ list: data.waitlist, count: data.count }); }
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); fetchWaitlist(); }, [fetchStats, fetchWaitlist]);

  async function handleDraw() {
    setDrawing(true); setDrawResult("");
    try {
      const res = await fetch("/api/admin/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: drawDate }) });
      const data = await res.json();
      if (res.ok) { const winnerNames = data.winners?.map((w: { name: string; email: string }) => w.name || w.email).join(", "); setDrawResult(`&#x2705; Draw complete! ${data.draw.winnersCount} winner(s): ${winnerNames}. Prize: $${data.prizePerWinner?.toFixed(4)} each.`); fetchStats(); }
      else { setDrawResult(`&#x274C; Error: ${data.error}`); }
    } catch { setDrawResult("&#x274C; Network error"); }
    finally { setDrawing(false); }
  }

  async function handleSendEmail() {
    setSending(true); setSendResult("");
    try {
      const res = await fetch("/api/waitlist/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: emailSubject, message: emailMessage }) });
      const data = await res.json();
      if (res.ok) setSendResult(`&#x2705; Sent to ${data.sent} people${data.failed ? `, ${data.failed} failed` : ""}.`);
      else setSendResult(`&#x274C; ${data.error}`);
    } catch { setSendResult("&#x274C; Network error"); }
    finally { setSending(false); }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-white">&#x2699;&#xFE0F; Admin Panel</h1><p className="text-white/60 text-sm">Ad Lottery Management</p></div>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm hover:bg-white/30 transition-colors">&larr; Back to App</Link>
            <button onClick={handleSignOut} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl text-sm hover:bg-red-500/30 transition-colors">Sign Out</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ label: "Total Users", value: stats?.totalUsers ?? 0, icon: "&#x1F465;" }, { label: "Total Ad Views", value: stats?.totalViews ?? 0, icon: "&#x1F441;&#xFE0F;" }, { label: "Today's Watchers", value: stats?.watchersToday ?? 0, icon: "&#x1F4C5;" }, { label: "Total Paid Out", value: `$${(stats?.totalEarningsPaid ?? 0).toFixed(4)}`, icon: "&#x1F4B8;" }].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white">
              <div className="text-2xl mb-1" dangerouslySetInnerHTML={{ __html: stat.icon }} />
              <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
              <div className="text-sm text-white/60">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">&#x1F4B0; Today&apos;s Pool</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-green-400">${(stats?.todayPool ?? 0).toFixed(4)}</div>
            <div>{stats?.poolDrawn ? <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">&#x2705; Already drawn</span> : <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm">&#x23F3; Pending draw</span>}</div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">&#x1F3B2; Run Lottery Draw</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1"><label className="text-sm text-white/70 mb-1 block">Draw Date</label><input type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400" /></div>
            <button onClick={handleDraw} disabled={drawing} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50">{drawing ? "Drawing..." : "&#x1F3B2; Draw Now"}</button>
          </div>
          {drawResult && <div className={`mt-4 p-4 rounded-xl text-sm ${drawResult.startsWith("&#x2705;") || drawResult.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`} dangerouslySetInnerHTML={{ __html: drawResult }} />}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">&#x1F4CB; Waitlist</h2>
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
                <p className="text-white/70 text-sm font-medium">Send launch email to all waitlisters:</p>
                <input type="text" placeholder="Email subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-white/40" />
                <textarea placeholder="Email body..." value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4} className="w-full px-4 py-3 bg-white/20 text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-white/40 resize-none" />
                <button onClick={handleSendEmail} disabled={sending} className="px-6 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50">{sending ? "Sending..." : `&#x1F4E7; Send to All ${waitlist.count} Waitlisters`}</button>
                {sendResult && <div className={`p-3 rounded-xl text-sm ${sendResult.startsWith("&#x2705;") || sendResult.startsWith("✅") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`} dangerouslySetInnerHTML={{ __html: sendResult }} />}
              </div>
            </>
          ) : (
            <p className="text-white/40 text-center py-6">No waitlist signups yet. Share your waitlist page to collect emails.</p>
          )}
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">&#x1F4DC; Draw History</h2>
          {loading ? <div className="text-white/40">Loading...</div> : !stats?.allDraws.length ? <div className="text-white/40 text-center py-8">No draws yet</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm text-white"><thead><tr className="text-white/50 border-b border-white/10"><th className="text-left py-2 px-3">Date</th><th className="text-right py-2 px-3">Pool</th><th className="text-right py-2 px-3">Entries</th><th className="text-right py-2 px-3">Winners</th><th className="text-right py-2 px-3">Per Winner</th></tr></thead><tbody>{stats.allDraws.map((draw) => (<tr key={draw.id} className="border-b border-white/5 hover:bg-white/5"><td className="py-2 px-3">{draw.date}</td><td className="text-right py-2 px-3 text-green-400">${draw.totalPool.toFixed(4)}</td><td className="text-right py-2 px-3">{draw.totalViews}</td><td className="text-right py-2 px-3">{draw.winnersCount}</td><td className="text-right py-2 px-3 text-yellow-400">${draw.prizePerWinner.toFixed(4)}</td></tr>))}</tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
