import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { sessionCookieName } from "@/lib/domain";
import { logSecurityEvent } from "@/lib/security-log";

const COOKIE_NAME = sessionCookieName(process.env.NODE_ENV);
const SESSION_HOURS = 12;
const IDLE_MINUTES = 60;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db().delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db().insert(sessions).values({ userId, tokenHash: tokenHash(token), expiresAt });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const idleCutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000);
  const [session] = await db()
    .select({ id: sessions.id, userId: users.id, displayName: users.displayName, role: users.role, lastUsedAt: sessions.lastUsedAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date()), gt(sessions.lastUsedAt, idleCutoff), eq(users.active, true)))
    .limit(1);
  if (session && session.lastUsedAt.getTime() < Date.now() - 5 * 60 * 1000) {
    await db().update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id));
  }
  return session ?? null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    logSecurityEvent("authz.denied", { userId: session.userId, requiredRole: "ADMIN" });
    throw new Error("Acesso restrito a administradores");
  }
  return session;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const [deleted] = await db().delete(sessions).where(eq(sessions.tokenHash, tokenHash(token))).returning({ userId: sessions.userId });
    if (deleted) logSecurityEvent("auth.logout", { userId: deleted.userId });
  }
  store.delete(COOKIE_NAME);
}
