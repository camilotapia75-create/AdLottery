import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ad Lottery - Watch Ads, Win Real Money",
  description: "Watch one video ad per day and get entered into the daily lottery to win real money!",
  other: {
    "google-adsense-account": "ca-pub-2425690390095661",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2425690390095661"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
