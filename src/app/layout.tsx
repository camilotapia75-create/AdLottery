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
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2425690390095661"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          id="vignette-ad"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(s){s.dataset.zone='10922111';s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement,document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
          }}
        />
      </body>
    </html>
  );
}
