import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ad Lottery - Watch Ads, Win Real Money",
  description: "Watch one ad per day and get entered into the daily lottery to win real money!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
