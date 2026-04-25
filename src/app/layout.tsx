import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { auth } from "@/lib/auth";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ad Lottery - Watch Ads, Win Real Money",
  description: "Watch one video ad per day and get entered into the daily lottery to win real money!",
  other: {
    "google-adsense-account": "ca-pub-2425690390095661",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const adsensePubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
        {/* Monetag CPM network */}
        <Script
          src="https://pl29243909.profitablecpmratenetwork.com/3f/ab/1d/3fab1d89fa00c4792852a8c29bb264db.js"
          strategy="afterInteractive"
        />
        {adsensePubId && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePubId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
