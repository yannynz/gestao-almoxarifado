import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { sessions, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const config = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_USERNAME: z.string().trim().min(3).max(64),
  ADMIN_PASSWORD: z.string().min(15).max(128),
}).parse({
  ...process.env,
  DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const client = postgres(config.DATABASE_URL, { max: 1 });
  const database = drizzle(client);
  try {
    await database.transaction(async (tx) => {
      const [admin] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.username, config.ADMIN_USERNAME.toLowerCase()),
        eq(users.role, "ADMIN"),
        eq(users.active, true),
      )).limit(1);
      if (!admin) throw new Error("Administrador ativo não encontrado");
      await tx.update(users).set({ passwordHash: await hashPassword(config.ADMIN_PASSWORD), updatedAt: new Date() }).where(eq(users.id, admin.id));
      await tx.delete(sessions).where(eq(sessions.userId, admin.id));
    });
    console.log("Senha atualizada e sessões anteriores revogadas. Remova ADMIN_PASSWORD do ambiente agora.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
