import "server-only";
import { inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginRateLimits } from "@/db/schema";
import { loginRateLimitDescriptors, type LoginRateLimitDescriptor } from "@/lib/login-rate-limit-key";

export async function reserveLoginAttempt(username: string, clientAddress: string) {
  const descriptors = loginRateLimitDescriptors(username, clientAddress);
  const now = new Date();

  const blockedScopes = await db().transaction(async (tx) => {
    await tx.delete(loginRateLimits).where(lt(loginRateLimits.updatedAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
    const blocked: LoginRateLimitDescriptor["scope"][] = [];
    for (const descriptor of descriptors) {
      const [row] = await tx.insert(loginRateLimits)
        .values({ key: descriptor.key, attempts: 1, windowStartedAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: loginRateLimits.key,
          set: {
            attempts: sql`case when ${loginRateLimits.windowStartedAt} <= now() - interval '15 minutes' then 1 else ${loginRateLimits.attempts} + 1 end`,
            windowStartedAt: sql`case when ${loginRateLimits.windowStartedAt} <= now() - interval '15 minutes' then now() else ${loginRateLimits.windowStartedAt} end`,
            blockedUntil: sql`case
              when ${loginRateLimits.blockedUntil} > now() then ${loginRateLimits.blockedUntil}
              when ${loginRateLimits.windowStartedAt} <= now() - interval '15 minutes' then null
              when ${loginRateLimits.attempts} + 1 > ${descriptor.maxAttempts} then now() + interval '15 minutes'
              else null end`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ blockedUntil: loginRateLimits.blockedUntil });
      if (row.blockedUntil && row.blockedUntil > now) blocked.push(descriptor.scope);
    }
    return blocked;
  });

  return { descriptors, blockedScopes };
}

export async function clearSuccessfulLogin(descriptors: LoginRateLimitDescriptor[]) {
  const keys = descriptors.filter((item) => item.resetOnSuccess).map((item) => item.key);
  if (keys.length) await db().delete(loginRateLimits).where(inArray(loginRateLimits.key, keys));
}
