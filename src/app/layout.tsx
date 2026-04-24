import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { auth } from "@/lib/auth";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ad Lottery - Watch Ads, Win Real Money",
  description: "Watch one video ad per day and get entered into the daily lottery to win real money!",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const adsensePubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
        {/* Google AdSense auto-ads — set NEXT_PUBLIC_ADSENSE_PUB_ID in Vercel to enable */}
        {adsensePubId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePubId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
