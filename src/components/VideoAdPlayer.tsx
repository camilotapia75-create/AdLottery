"use client";
import { useEffect, useRef, useState } from "react";

const DEFAULT_AD_TAG =
  "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

interface Props {
  onComplete: () => void;
  onFallback: () => void;
}

declare global {
  interface Window { google: any; }
}

export default function VideoAdPlayer({ onComplete, onFallback }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const amsRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "playing">("loading");

  const adTagUrl = (process.env.NEXT_PUBLIC_VAST_AD_TAG_URL ?? "") || DEFAULT_AD_TAG;

  useEffect(() => {
    const g = window.google;
    if (!g?.ima) { onFallback(); return; }

    let done = false;
    const once = (fn: () => void) => () => {
      if (done) return;
      done = true;
      amsRef.current?.destroy();
      fn();
    };
    const complete = once(onComplete);
    const fallback = once(onFallback);

    try {
      const adc = new g.ima.AdDisplayContainer(containerRef.current!, videoRef.current!);
      adc.initialize();

      const loader = new g.ima.AdsLoader(adc);
      loader.addEventListener(
        g.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e: any) => {
          const am = e.getAdsManager(videoRef.current!);
          amsRef.current = am;
          am.addEventListener(g.ima.AdEvent.Type.COMPLETE, complete);
          am.addEventListener(g.ima.AdEvent.Type.ALL_ADS_COMPLETED, complete);
          am.addEventListener(g.ima.AdEvent.Type.SKIPPED, complete);
          am.addEventListener(g.ima.AdErrorEvent.Type.AD_ERROR, fallback);
          try {
            const w = containerRef.current!.offsetWidth || 640;
            am.init(w, Math.round((w * 9) / 16), g.ima.ViewMode.NORMAL);
            am.start();
            setStatus("playing");
          } catch { fallback(); }
        }
      );
      loader.addEventListener(g.ima.AdErrorEvent.Type.AD_ERROR, fallback);

      const req = new g.ima.AdsRequest();
      req.adTagUrl = adTagUrl;
      req.linearAdSlotWidth = 640;
      req.linearAdSlotHeight = 360;
      loader.requestAds(req);
    } catch { fallback(); }

    return () => {
      done = true;
      amsRef.current?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden w-full mb-4"
      style={{ aspectRatio: "16/9" }}
    >
      <video ref={videoRef} className="absolute inset-0 w-full h-full" playsInline />
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-white/80 text-sm">Loading video ad...</p>
        </div>
      )}
    </div>
  );
}
