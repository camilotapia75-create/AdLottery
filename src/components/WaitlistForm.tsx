"use client";
import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (res.ok) { setStatus("success"); }
      else { setStatus("error"); setErrorMsg(data.error || "Something went wrong"); }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "success") return (
    <div className="text-center py-4">
      <div className="text-5xl mb-3">&#x1F389;</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">You&apos;re on the list!</h3>
      <p className="text-gray-500 text-sm">We&apos;ll email you the moment we go live. Get ready to win!</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800" />
      <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800" />
      {status === "error" && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
      <button type="submit" disabled={status === "loading"} className="w-full py-4 text-white font-bold text-lg rounded-xl transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>
        {status === "loading" ? "Joining..." : "Notify Me When Live →"}
      </button>
    </form>
  );
}
