"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { assertTrustedMutation } from "@/lib/csrf-server";
import { demoLoginAllowed, normalizeUsername } from "@/lib/domain";
import { clearSuccessfulLogin, reserveLoginAttempt } from "@/lib/login-rate-limit";
import { verifyPassword } from "@/lib/password";
import { logSecurityEvent } from "@/lib/security-log";

export type LoginState = { error?: string };

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$OubQLQtpbHTCbsr6zLjUpA$ZgagdK/eRW1mEqE2J7ZSImq9IGBYkP0f892Evzc/NUk";

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  await assertTrustedMutation();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Informe usuário e senha." };
  const username = normalizeUsername(parsed.data.username);
  const requestHeaders = await headers();
  const clientAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? requestHeaders.get("x-real-ip")
    ?? "unknown";
  const reservation = await reserveLoginAttempt(username, clientAddress);
  const accountHash = reservation.descriptors.find((item) => item.scope === "account")!.key;
  const sourceHash = reservation.descriptors.find((item) => item.scope === "ip")!.key;
  if (reservation.blockedScopes.length) {
    logSecurityEvent("auth.rate_limited", { source: sourceHash, account: accountHash, scopes: reservation.blockedScopes.join(",") });
    return { error: "Muitas tentativas. Aguarde alguns minutos." };
  }
  const [user] = await db().select().from(users).where(eq(users.username, username)).limit(1);
  const passwordMatches = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, parsed.data.password);
  if (!user || !user.active || !passwordMatches) {
    logSecurityEvent("auth.failure", { source: sourceHash, account: accountHash });
    return { error: "Usuário ou senha inválidos." };
  }
  try {
    await createSession(user.id);
  } catch {
    logSecurityEvent("session.create_failure", { userId: user.id, source: sourceHash });
    return { error: "Não foi possível iniciar a sessão. Tente novamente." };
  }
  await clearSuccessfulLogin(reservation.descriptors);
  logSecurityEvent("auth.success", { userId: user.id, source: sourceHash });
  redirect("/");
}

export async function logout() {
  await assertTrustedMutation();
  await destroySession();
  redirect("/login");
}

export async function demoLogin() {
  await assertTrustedMutation();
  if (!demoLoginAllowed(process.env.NODE_ENV, process.env.ALLOW_DEMO_LOGIN)) throw new Error("Modo de demonstração desativado");
  const username = process.env.ADMIN_USERNAME;
  if (!username) throw new Error("ADMIN_USERNAME não configurado");
  const [user] = await db().select().from(users).where(and(
    eq(users.username, normalizeUsername(username)),
    eq(users.role, "ADMIN"),
    eq(users.active, true),
  )).limit(1);
  if (!user) throw new Error("Execute o seed antes de entrar");
  await createSession(user.id);
  redirect("/");
}
