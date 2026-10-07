import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { employees, supplies, supplyMovements, toolLoans, tools, users } from "@/db/schema";
import { toolLoanEvents } from "@/lib/domain";

export async function dashboardData() {
  const [toolCounts] = await db().select({
    available: sql<number>`count(*) filter (where ${tools.active} = true and ${tools.status} = 'ACTIVE' and ${toolLoans.id} is null)::int`,
    loaned: sql<number>`count(*) filter (where ${tools.active} = true and ${tools.status} = 'ACTIVE' and ${toolLoans.id} is not null)::int`,
  }).from(tools).leftJoin(toolLoans, and(eq(toolLoans.toolId, tools.id), isNull(toolLoans.returnedAt)));
  const [lowCount] = await db().select({ count: sql<number>`count(*)::int` }).from(supplies)
    .where(sql`${supplies.active} = true and ${supplies.quantity} <= ${supplies.minimumQuantity}`);
  return {
    available: toolCounts.available,
    loaned: toolCounts.loaned,
    lowStock: lowCount.count,
  };
}

export async function listEmployees() {
  return db().select().from(employees).where(eq(employees.active, true)).orderBy(employees.name);
}

export async function listTools() {
  return db().select({
    id: tools.id, code: tools.code, name: tools.name, status: tools.status,
    loanId: toolLoans.id, employeeName: employees.name, checkedOutAt: toolLoans.checkedOutAt,
  }).from(tools)
    .leftJoin(toolLoans, sql`${toolLoans.toolId} = ${tools.id} and ${toolLoans.returnedAt} is null`)
    .leftJoin(employees, eq(toolLoans.employeeId, employees.id))
    .where(eq(tools.active, true)).orderBy(tools.code);
}

export async function listSupplies() {
  return db().select().from(supplies).where(eq(supplies.active, true)).orderBy(supplies.name);
}

export async function recentMovements(limit = 20) {
  const checkedOutUsers = alias(users, "checked_out_users");
  const returnedUsers = alias(users, "returned_users");
  const loans = await db().select({
    id: toolLoans.id,
    item: tools.name,
    code: tools.code,
    employee: employees.name,
    checkedOutActor: checkedOutUsers.displayName,
    returnedActor: returnedUsers.displayName,
    checkedOutAt: toolLoans.checkedOutAt,
    returnedAt: toolLoans.returnedAt,
  }).from(toolLoans)
    .innerJoin(tools, eq(toolLoans.toolId, tools.id))
    .innerJoin(employees, eq(toolLoans.employeeId, employees.id))
    .innerJoin(checkedOutUsers, eq(toolLoans.checkedOutBy, checkedOutUsers.id))
    .leftJoin(returnedUsers, eq(toolLoans.returnedBy, returnedUsers.id))
    .orderBy(desc(sql`greatest(${toolLoans.checkedOutAt}, coalesce(${toolLoans.returnedAt}, ${toolLoans.checkedOutAt}))`))
    .limit(limit);
  const supplyRows = await db().select({
    id: supplyMovements.id, type: supplyMovements.type, item: supplies.name, code: supplies.code,
    employee: employees.name, actor: users.displayName, quantity: supplyMovements.quantity, createdAt: supplyMovements.createdAt,
  }).from(supplyMovements).innerJoin(supplies, eq(supplyMovements.supplyId, supplies.id))
    .leftJoin(employees, eq(supplyMovements.employeeId, employees.id))
    .innerJoin(users, eq(supplyMovements.registeredBy, users.id)).orderBy(desc(supplyMovements.createdAt)).limit(limit);
  return [
    ...loans.flatMap(toolLoanEvents),
    ...supplyRows.map((row) => ({
      ...row,
      kind: "Insumo" as const,
      type: row.type === "CONSUMPTION" ? "Consumo" : "Entrada",
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
