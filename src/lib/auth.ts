import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production";
const COOKIE = "ad-session";
const TTL = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
};

export type AppSession = {
  user: SessionUser;
};

function makeToken(user: SessionUser): string {
  const payload = { ...user, exp: Math.floor(Date.now() / 1000) + TTL };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseToken(token: string): SessionUser | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  try {
    const eBuf = Buffer.from(expected);
    const sBuf = Buffer.from(sig);
    if (sBuf.length !== eBuf.length || !timingSafeEqual(sBuf, eBuf)) return null;
  } catch {
    return null;
  }
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof p.exp === "number" && p.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: String(p.id),
      email: String(p.email),
      name: p.name ? String(p.name) : null,
      isAdmin: Boolean(p.isAdmin),
    };
  } catch {
    return null;
  }
}

export async function auth(): Promise<AppSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const user = parseToken(token);
  return user ? { user } : null;
}

export async function createSession(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
