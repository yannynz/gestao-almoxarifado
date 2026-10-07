import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  client ??= postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
  database ??= drizzle(client, { schema });
  return database;
}
