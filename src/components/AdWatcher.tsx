"use client";
import { useState, useRef, useEffect } from "react";

const ZONE_HASH = process.env.NEXT_PUBLIC_ADSCEND_ZONE_HASH ?? "";

interface AdWatcherProps {
  adsWatchedToday: number;
  dailyLimit: number;
  poolDrawn: boolean;
  onAdWatched: () => void;
  loading: boolean;
  userId: string;
}

type WatchState = "idle" | "watching" | "error";

export default function AdWatcher({ adsWatchedToday, dailyLimit, poolDrawn, onAdWatched, loading, userId }: AdWatcherProps) {
  const [state, setState] = useState<WatchState>("idle");
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startWatching() {
    const url = `https://wall.adscendmedia.com/rev.php?hash=${ZONE_HASH}&subid=${encodeURIComponent(userId)}`;
    const popup = window.open(url, "adscend_wall", "width=900,height=700,scrollbars=yes,resizable=yes");

    if (!popup) {
      setState("error");
      setMessage("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    setState("watching");
    const prevCount = adsWatchedToday;
    let polls = 0;

    pollRef.current = setInterval(async () => {
      polls++;
      try {
        const res = await fetch("/api/lottery/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.adsWatchedToday > prevCount) {
            stopPolling();
            setState("idle");
            onAdWatched();
            return;
          }
        }
      } catch {}
      if (polls > 150) {
        stopPolling();
        setState("error");
        setMessage("Timed out. If you finished the video, refresh the page.");
      }
    }, 2000);
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

  if (state === "watching") return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-5xl mb-4 animate-pulse">🎬</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Ad Window Open</h2>
      <p className="text-gray-500 text-sm mb-4">Watch the full video in the popup to earn your lottery entry</p>
      <div className="p-4 bg-purple-50 rounded-xl mb-4">
        <p className="text-purple-600 text-sm">📺 Complete the video in the ad window — your entry will be recorded automatically.</p>
      </div>
      <button onClick={() => { stopPolling(); setState("idle"); }} className="text-gray-400 text-sm underline hover:text-gray-600">Cancel</button>
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
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        {reachedLimit ? "All done for today!" : "Watch a video ad"}
      </h2>

      {adsWatchedToday > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{adsWatchedToday} of {dailyLimit} ads watched</span>
            <span>{dailyLimit - adsWatchedToday} remaining</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{ width: `${(adsWatchedToday / dailyLimit) * 100}%`, background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
            />
          </div>
        </div>
      )}

      {reachedLimit ? (
        <>
          <p className="text-gray-500 mb-3">You&apos;ve watched all {dailyLimit} ads today — you have {dailyLimit} entries in tonight&apos;s lottery!</p>
          <p className="text-gray-400 text-xs">Come back tomorrow to watch more</p>
          <div className="mt-4 p-4 bg-purple-50 rounded-xl">
            <p className="text-purple-700 text-sm">🏆 More ads watched = more lottery entries = better odds of winning!</p>
          </div>
        </>
      ) : poolDrawn ? (
        <><div className="text-5xl mb-3">🔒</div><p className="text-gray-600 mb-2">Today&apos;s lottery has already been drawn.</p><p className="text-gray-400 text-sm">Come back tomorrow!</p></>
      ) : !ZONE_HASH ? (
        <>
          <p className="text-gray-500 mb-3">Video ads are being set up — check back soon!</p>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-purple-700 text-sm">🔔 We&apos;re finalizing our ad partner. You&apos;ll be able to watch and earn very soon.</p>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500 mb-6">
            {adsWatchedToday === 0
              ? `Watch up to ${dailyLimit} video ads per day — each one gets you a lottery entry!`
              : `Watch ${dailyLimit - adsWatchedToday} more ad${dailyLimit - adsWatchedToday === 1 ? "" : "s"} for more chances to win!`}
          </p>
          <button onClick={startWatching} className="px-8 py-4 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>
            ▶ {adsWatchedToday === 0 ? "Watch Video Ad Now" : "Watch Another Ad"}
          </button>
        </>
      )}
    </div>
  );
}
