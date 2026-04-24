"use client";
import { useState, useEffect, useRef } from "react";

// Set NEXT_PUBLIC_IMA_AD_TAG_URL in Vercel env vars to your Google Ad Manager VAST tag URL.
// For testing, Google provides: https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_preroll_skippable&sz=640x480&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=
const IMA_AD_TAG = process.env.NEXT_PUBLIC_IMA_AD_TAG_URL ?? "";
const FALLBACK_SECONDS = 30;

interface AdWatcherProps {
  watchedToday: boolean;
  poolDrawn: boolean;
  onAdWatched: () => void;
  loading: boolean;
}

type WatchState = "idle" | "loading" | "watching" | "done" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ima = any;

function getIma(): Ima | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google?.ima ?? null;
}

export default function AdWatcher({ watchedToday, poolDrawn, onAdWatched, loading }: AdWatcherProps) {
  const [state, setState] = useState<WatchState>("idle");
  const [countdown, setCountdown] = useState(FALLBACK_SECONDS);
  const [message, setMessage] = useState("");
  const adContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adsManagerRef = useRef<Ima>(null);
  const submittedRef = useRef(false);

  // Load Google IMA SDK script once
  useEffect(() => {
    if (!IMA_AD_TAG) return;
    if (document.getElementById("ima-sdk")) return;
    const script = document.createElement("script");
    script.id = "ima-sdk";
    script.src = "//imasdk.googleapis.com/js/sdkloader/ima3.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { adsManagerRef.current?.destroy(); } catch {}
    };
  }, []);

  async function submitAdWatch() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const res = await fetch("/api/ad/watch", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setState("done");
        setMessage(`🎉 You're in! Today's pool: $${(data.pool ?? 0).toFixed(4)} | ${data.viewCount} entries`);
        onAdWatched();
      } else {
        submittedRef.current = false;
        setState("error");
        setMessage(data.error || "Failed to record ad view");
      }
    } catch {
      submittedRef.current = false;
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  function startFallbackTimer() {
    setState("watching");
    setCountdown(FALLBACK_SECONDS);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          submitAdWatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startImaAd(ima: Ima) {
    if (!adContainerRef.current || !videoRef.current) {
      startFallbackTimer();
      return;
    }
    setState("watching");

    const adContainer = new ima.AdDisplayContainer(adContainerRef.current, videoRef.current);
    // initialize() must be called on a user gesture
    adContainer.initialize();

    const adsLoader = new ima.AdsLoader(adContainer);

    adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (e: Ima) => {
        const manager = e.getAdsManager(videoRef.current);
        adsManagerRef.current = manager;

        manager.addEventListener(ima.AdEvent.Type.COMPLETE, submitAdWatch);
        manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, submitAdWatch);
        manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
          try { manager.destroy(); } catch {}
          adsManagerRef.current = null;
          startFallbackTimer();
        });

        try {
          const w = adContainerRef.current?.clientWidth ?? 640;
          const h = Math.round((w * 9) / 16);
          manager.init(w, h, ima.ViewMode.NORMAL);
          manager.start();
        } catch {
          startFallbackTimer();
        }
      }
    );

    adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => {
      startFallbackTimer();
    });

    const request = new ima.AdsRequest();
    request.adTagUrl = IMA_AD_TAG;
    const w = adContainerRef.current.clientWidth || 640;
    request.linearAdSlotWidth = w;
    request.linearAdSlotHeight = Math.round((w * 9) / 16);
    request.nonLinearAdSlotWidth = w;
    request.nonLinearAdSlotHeight = 150;
    adsLoader.requestAds(request);
  }

  function startWatching() {
    submittedRef.current = false;
    const ima = getIma();
    if (IMA_AD_TAG && ima) {
      startImaAd(ima);
    } else if (IMA_AD_TAG) {
      // SDK still loading — wait briefly then retry
      setState("loading");
      setTimeout(() => {
        const ima2 = getIma();
        if (ima2) {
          startImaAd(ima2);
        } else {
          startFallbackTimer();
        }
      }, 2500);
    } else {
      startFallbackTimer();
    }
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

  const isWatching = state === "watching";

  return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      {/* Video container — always in DOM so refs are available when IMA SDK initializes */}
      <div className={isWatching ? "block mb-4" : "hidden"} aria-hidden={!isWatching}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">🎬 Watching Ad...</h2>
        <p className="text-gray-500 text-sm mb-4">Watch the full video to earn your lottery entry</p>
        <div
          ref={adContainerRef}
          className="relative w-full rounded-xl overflow-hidden bg-black mx-auto"
          style={{ paddingBottom: "56.25%", maxWidth: 640 }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            playsInline
          />
        </div>
        {/* Fallback countdown shown only when not using IMA SDK */}
        {!IMA_AD_TAG && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white countdown-pulse"
              style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
            >
              {countdown}
            </div>
            <p className="text-gray-600">seconds remaining</p>
          </div>
        )}
      </div>

      {state === "loading" && (
        <>
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <p className="text-gray-600">Loading your video ad...</p>
        </>
      )}

      {(state === "done" || (state === "idle" && watchedToday)) && (
        <>
          <div className="text-5xl mb-4">🏟️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">You&apos;re Entered!</h2>
          {message && <p className="text-purple-600 font-medium mb-3 text-sm">{message}</p>}
          <p className="text-gray-600 text-sm mb-2">
            {poolDrawn
              ? "Today's lottery has been drawn! Check your earnings above."
              : "You're in today's lottery! Winners are announced at midnight."}
          </p>
          <p className="text-gray-400 text-xs">Come back tomorrow to watch another ad</p>
          <div className="mt-4 p-4 bg-purple-50 rounded-xl">
            <p className="text-purple-700 text-sm">
              💡 <strong>How winners are selected:</strong> At the end of each day, random winners from all entrants split 70% of the day&apos;s ad revenue pool.
            </p>
          </div>
        </>
      )}

      {state === "error" && (
        <>
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-red-500 text-sm mb-6">{message}</p>
          <button
            onClick={() => setState("idle")}
            className="px-6 py-3 text-white font-semibold rounded-xl"
            style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
          >
            Try Again
          </button>
        </>
      )}

      {state === "idle" && !watchedToday && (
        <>
          <div className="text-4xl mb-3">🎬</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Watch a video ad</h2>
          <p className="text-gray-500 mb-6">
            Watch one short video ad per day and get entered into the daily lottery to win real money!
          </p>
          {poolDrawn ? (
            <>
              <div className="text-5xl mb-3">🔒</div>
              <p className="text-gray-600 mb-2">Today&apos;s lottery has already been drawn.</p>
              <p className="text-gray-400 text-sm">Come back tomorrow!</p>
            </>
          ) : (
            <button
              onClick={startWatching}
              className="px-8 py-4 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}
            >
              ▶ Watch Video Ad Now
            </button>
          )}
        </>
      )}
    </div>
  );
}
