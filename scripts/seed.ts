import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { employees, supplies, supplyMovements, tools, users } from "../src/db/schema";

const url = process.env.DATABASE_URL!;
if (!url) throw new Error("Defina DATABASE_URL");

const seedSupplies = [
  { operationId: "1019a389-c1e4-4d3f-a38d-c145d78c213a", code: "DC45", name: "Disco de corte 4½", quantity: 37, minimumQuantity: 10 },
  { operationId: "4f7d2636-a42d-45cb-a6c3-19feb88417e0", code: "LUVA", name: "Luva de proteção", quantity: 8, minimumQuantity: 10 },
] as const;

async function main() {
  const client = postgres(url, { max: 1 });
  const database = drizzle(client);

  await database.transaction(async (tx) => {
    const [admin] = await tx.select({ id: users.id }).from(users).where(and(
      eq(users.role, "ADMIN"),
      eq(users.active, true),
    )).limit(1);
    if (!admin) throw new Error("Crie o administrador com npm run db:create-admin antes do seed");

    await tx.insert(employees).values([
      { name: "João da Silva", registrationCode: "001" },
      { name: "Marcos Oliveira", registrationCode: "002" },
    ]).onConflictDoNothing();
    await tx.insert(tools).values([
      { code: "A1", name: "Furadeira Bosch" },
      { code: "A2", name: "Furadeira Makita" },
      { code: "S1", name: "Serra circular" },
    ]).onConflictDoNothing();

    for (const seed of seedSupplies) {
      const [created] = await tx.insert(supplies).values({
        code: seed.code,
        name: seed.name,
        quantity: seed.quantity,
        minimumQuantity: seed.minimumQuantity,
      }).onConflictDoNothing().returning({ id: supplies.id, createdAt: supplies.createdAt });
      if (!created) continue;
      await tx.insert(supplyMovements).values({
        operationId: seed.operationId,
        supplyId: created.id,
        type: "ENTRY",
        quantity: seed.quantity,
        registeredBy: admin.id,
        createdAt: created.createdAt,
        notes: "Estoque inicial do seed",
      });
    }
  });

  console.log("Dados de demonstração criados.");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
