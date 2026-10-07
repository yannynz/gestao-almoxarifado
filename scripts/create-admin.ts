import postgres from "postgres";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const config = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_USERNAME: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  ADMIN_PASSWORD: z.string().min(15).max(128),
  ADMIN_DISPLAY_NAME: z.string().trim().min(1).max(100).default("Administrador"),
}).parse({
  ...process.env,
  DATABASE_URL: process.env.ADMIN_DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const client = postgres(config.DATABASE_URL, { max: 1 });
  const database = drizzle(client);
  try {
    await database.transaction(async (tx) => {
      const [existingAdmin] = await tx.select({ username: users.username }).from(users).where(eq(users.role, "ADMIN")).limit(1);
      if (existingAdmin) throw new Error(`Já existe um administrador (${existingAdmin.username}). Use db:set-admin-password para trocar a senha.`);
      await tx.insert(users).values({
        username: config.ADMIN_USERNAME.toLowerCase(),
        displayName: config.ADMIN_DISPLAY_NAME,
        passwordHash: await hashPassword(config.ADMIN_PASSWORD),
        role: "ADMIN",
      });
    });
    console.log("Administrador criado. Remova ADMIN_PASSWORD do ambiente agora.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
