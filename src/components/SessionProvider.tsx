"use client";
import type { AppSession } from "@/lib/auth";

export function SessionProvider({ children }: { children: React.ReactNode; session?: AppSession | null }) {
  return <>{children}</>;
}
