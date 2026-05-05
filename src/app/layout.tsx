import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Ad for Good - Watch Ads, Donate to Charity",
  description: "Watch short video ads and the revenue gets donated to your chosen charity. Make every ad count.",
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
