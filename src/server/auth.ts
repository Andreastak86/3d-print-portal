/**
 * Admin login: password from ADMIN_PASSWORD, session as an HMAC-signed cookie.
 * No dependencies – Node's crypto only.
 *
 * Cookie value: "<expiresAtMs>.<hmac>" where hmac = HMAC-SHA256(secret, expiresAtMs).
 * The secret is generated on first start and stored in data/portal.json.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readStore } from "./store";

export const SESSION_COOKIE = "portal_admin";
const SESSION_DAYS = 30;

/** Simple brute-force protection: max attempts per minute, in memory. */
const MAX_ATTEMPTS_PER_MINUTE = 5;
const attempts: number[] = [];

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so the lengths are always equal (timingSafeEqual requires it).
  return timingSafeEqual(sha256(a), sha256(b));
}

async function sign(value: string): Promise<string> {
  const { sessionSecret } = await readStore();
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

export type LoginResult = { ok: true } | { ok: false; reason: "not_configured" | "rate_limited" | "wrong_password" };

export async function login(password: string): Promise<LoginResult> {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) return { ok: false, reason: "not_configured" };

  const now = Date.now();
  while (attempts.length && now - attempts[0] > 60_000) attempts.shift();
  if (attempts.length >= MAX_ATTEMPTS_PER_MINUTE) return { ok: false, reason: "rate_limited" };

  if (!safeEqual(password, expected)) {
    attempts.push(now);
    return { ok: false, reason: "wrong_password" };
  }

  const expiresAt = String(now + SESSION_DAYS * 86_400_000);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${expiresAt}.${await sign(expiresAt)}`, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
    // The portal runs over http on the local network, so "secure" can't be used.
    secure: false,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  // Read cookies FIRST: this makes the page dynamic. If we returned early before
  // calling cookies(), Next could prerender the page statically at build time.
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!adminPasswordConfigured()) return false;
  if (!value) return false;
  const [expiresAt, mac] = value.split(".");
  if (!expiresAt || !mac || Number(expiresAt) < Date.now()) return false;
  const expected = await sign(expiresAt);
  return mac.length === expected.length && timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
}

/** For admin pages: redirects to the login page if not logged in. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** For admin API routes: returns a 401 response if not logged in, otherwise null. */
export async function adminGuard(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: { code: "unauthorized", message: "Du må logge inn som admin" } }, { status: 401 });
}
