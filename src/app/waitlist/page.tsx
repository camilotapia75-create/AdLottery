import { Metadata } from "next";
import WaitlistForm from "@/components/WaitlistForm";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join the Waitlist - Ad Lottery",
  description: "Be the first to know when Ad Lottery launches. Watch ads, win real money.",
};

export default async function WaitlistPage() {
  const count = await prisma.waitlist.count();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)" }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">&#x1F4B0;</div>
          <h1 className="text-5xl font-bold text-white mb-3">Ad Lottery</h1>
          <p className="text-2xl text-white/80 mb-2">Watch ads. Win real money.</p>
          <p className="text-white/60 text-sm">Every video ad you watch = one lottery entry. Winners paid daily.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "&#x1F4FA;", label: "Watch Ads", desc: "Short video ads" },
            { icon: "&#x1F3DF;&#xFE0F;", label: "Get Entries", desc: "Each ad = 1 entry" },
            { icon: "&#x1F4B8;", label: "Win Money", desc: "Daily cash prizes" },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
              <div className="text-2xl mb-1" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-xs text-white/60">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl mb-4">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Join the Waitlist</h2>
          {count > 0 && (
            <p className="text-center text-purple-600 text-sm font-medium mb-6">
              &#x1F525; {count.toLocaleString()} {count === 1 ? "person" : "people"} already waiting
            </p>
          )}
          <WaitlistForm />
          <p className="text-center text-gray-400 text-xs mt-4">No spam &mdash; just a launch notification.</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white text-center mb-6">
          <p className="text-sm font-semibold mb-1">&#x1F381; Referral Bonus</p>
          <p className="text-xs text-white/70">Refer a friend when we launch and you both get 5 free lottery entries!</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-sm">Already have an account? <Link href="/login" className="text-white underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
