"use client";
import { useState, useRef, useEffect } from "react";
import VideoAdPlayer from "@/components/VideoAdPlayer";

const ZONE_HASH = process.env.NEXT_PUBLIC_ADSCEND_ZONE_HASH ?? "";
const FALLBACK_SECONDS = 30;

interface Charity { id: string; name: string; description: string; website?: string | null; }

interface AdWatcherProps {
  adsWatchedToday: number;
  dailyLimit: number;
  poolDrawn: boolean;
  onAdWatched: () => void;
  loading: boolean;
  userId: string;
}

type WatchState = "idle" | "picking" | "watching" | "watching-video" | "error";

export default function AdWatcher({ adsWatchedToday, dailyLimit, poolDrawn, onAdWatched, loading, userId }: AdWatcherProps) {
  const [state, setState] = useState<WatchState>("idle");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(FALLBACK_SECONDS);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/charities")
      .then((r) => r.json())
      .then((d) => {
        setCharities(d.charities ?? []);
        // Restore last selection from localStorage
        const saved = localStorage.getItem("selectedCharityId");
        if (saved && d.charities) {
          const match = d.charities.find((c: Charity) => c.id === saved);
          if (match) setSelectedCharity(match);
        }
      })
      .catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopAll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function selectCharity(c: Charity) {
    setSelectedCharity(c);
    localStorage.setItem("selectedCharityId", c.id);
  }

  async function submitWatch() {
    try {
      const res = await fetch("/api/ad/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charityId: selectedCharity?.id ?? null }),
      });
      const data = await res.json();
      if (res.ok) { setState("idle"); onAdWatched(); }
      else { setState("error"); setMessage(data.error || "Failed to record ad view"); }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  function startFallbackTimer() {
    setState("watching");
    setCountdown(FALLBACK_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; submitWatch(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function startAdscend() {
    const url = `https://wall.adscendmedia.com/rev.php?hash=${ZONE_HASH}&subid=${encodeURIComponent(userId)}`;
    const popup = window.open(url, "adscend_wall", "width=900,height=700,scrollbars=yes,resizable=yes");
    if (!popup) { setState("error"); setMessage("Popup was blocked. Please allow popups for this site and try again."); return; }
    setState("watching");
    const prevCount = adsWatchedToday;
    let polls = 0;
    pollRef.current = setInterval(async () => {
      polls++;
      try {
        const res = await fetch("/api/lottery/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.adsWatchedToday > prevCount) { stopAll(); setState("idle"); onAdWatched(); return; }
        }
      } catch {}
      if (polls > 150) { stopAll(); setState("error"); setMessage("Timed out. If you finished the video, refresh the page."); }
    }, 2000);
  }

  function startWatching() {
    if (ZONE_HASH) startAdscend(); else setState("watching-video");
  }

  if (loading) return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-4" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-6" />
        <div className="h-12 bg-gray-200 rounded-xl w-48 mx-auto" />
      </div>
    </div>
  );

  const reachedLimit = adsWatchedToday >= dailyLimit;

  if (state === "picking") return (
    <div className="bg-white rounded-2xl p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Choose Your Charity</h2>
      <p className="text-gray-500 text-sm text-center mb-4">Your ad view will send money to this charity</p>
      <div className="space-y-2 mb-4">
        {charities.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCharity(c)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedCharity?.id === c.id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}
          >
            <div className="font-semibold text-gray-800">{c.name}</div>
            <div className="text-xs text-gray-500">{c.description}</div>
          </button>
        ))}
      </div>
      <button
        onClick={() => { if (selectedCharity) startWatching(); }}
        disabled={!selectedCharity}
        className="w-full py-3 text-white font-bold rounded-xl disabled:opacity-40 transition-all"
        style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
      >
        ▶ Watch Ad for {selectedCharity?.name ?? "..."}
      </button>
      <button onClick={() => setState("idle")} className="w-full mt-2 text-gray-400 text-sm underline hover:text-gray-600">Cancel</button>
    </div>
  );

  if (state === "watching") return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-5xl mb-4 animate-pulse">🎬</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Watching Ad...</h2>
      {selectedCharity && <p className="text-purple-600 text-sm font-medium mb-2">Voting for: {selectedCharity.name}</p>}
      {ZONE_HASH ? (
        <p className="text-gray-500 text-sm mb-4">Watch the full video in the popup to cast your vote</p>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-6">Please wait while the ad plays</p>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>{countdown}</div>
          <p className="text-gray-400 text-sm">seconds remaining</p>
        </>
      )}
      <button onClick={() => { stopAll(); setState("idle"); }} className="mt-4 text-gray-400 text-sm underline hover:text-gray-600">Cancel</button>
    </div>
  );

  if (state === "watching-video") return (
    <div className="bg-white rounded-2xl p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Watching Ad...</h2>
      {selectedCharity && <p className="text-purple-600 text-sm font-medium text-center mb-2">Voting for: {selectedCharity.name}</p>}
      <VideoAdPlayer onComplete={submitWatch} onFallback={startFallbackTimer} />
      <button onClick={() => setState("idle")} className="w-full text-gray-400 text-sm underline hover:text-gray-600 text-center">Cancel</button>
    </div>
  );

  if (state === "error") return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
      <p className="text-red-500 text-sm mb-6">{message}</p>
      <button onClick={() => setState("idle")} className="px-6 py-3 text-white font-semibold rounded-xl" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>Try Again</button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-4xl mb-3">🎬</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{reachedLimit ? "All done for today!" : "Watch a video ad"}</h2>
      {adsWatchedToday > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1"><span>{adsWatchedToday} of {dailyLimit} ads watched</span><span>{dailyLimit - adsWatchedToday} remaining</span></div>
          <div className="w-full bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full transition-all duration-500" style={{ width: `${(adsWatchedToday / dailyLimit) * 100}%`, background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }} /></div>
        </div>
      )}
      {selectedCharity && !reachedLimit && !poolDrawn && (
        <p className="text-purple-600 text-sm font-medium mb-3">Currently voting for: <strong>{selectedCharity.name}</strong> · <button onClick={() => setState("picking")} className="underline">change</button></p>
      )}
      {reachedLimit ? (
        <><p className="text-gray-500 mb-3">You&apos;ve cast all {dailyLimit} votes today!</p><p className="text-gray-400 text-xs">Come back tomorrow to vote again</p></>
      ) : poolDrawn ? (
        <><div className="text-5xl mb-3">🔒</div><p className="text-gray-600 mb-2">Today&apos;s donations have already been distributed.</p><p className="text-gray-400 text-sm">Come back tomorrow!</p></>
      ) : (
        <button
          onClick={() => selectedCharity ? startWatching() : setState("picking")}
          className="px-8 py-4 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
        >
          ▶ {adsWatchedToday === 0 ? "Watch Ad & Vote" : "Watch Another Ad"}
        </button>
      )}
    </div>
  );
}
