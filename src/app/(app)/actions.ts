"use server";

import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { employees, supplies, supplyMovements, toolLoans, tools } from "@/db/schema";
import { requireAdmin, requireSession } from "@/lib/auth";
import { assertTrustedMutation } from "@/lib/csrf-server";
import { normalizeCode, operationIdSchema, quantitySchema, sameSupplyMovement } from "@/lib/domain";

const id = z.string().uuid();
const text = z.string().trim().min(1).max(150);

function done(path: string, message: string) {
  revalidatePath("/");
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent(message)}`);
}

async function mutationSession() {
  await assertTrustedMutation();
  return requireSession();
}

async function mutationAdmin() {
  await assertTrustedMutation();
  return requireAdmin();
}

export async function checkoutTool(formData: FormData) {
  const actor = await mutationSession();
  const toolId = id.parse(formData.get("toolId"));
  const employeeId = id.parse(formData.get("employeeId"));
  await db().transaction(async (tx) => {
    const [tool] = await tx.select().from(tools)
      .where(and(eq(tools.id, toolId), eq(tools.active, true), eq(tools.status, "ACTIVE")))
      .for("update").limit(1);
    if (!tool) throw new Error("Ferramenta indisponível");
    const [employee] = await tx.select({ id: employees.id }).from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.active, true))).limit(1);
    if (!employee) throw new Error("Funcionário indisponível");
    await tx.insert(toolLoans).values({ toolId, employeeId, checkedOutBy: actor.userId });
  });
  done("/ferramentas", "Retirada registrada");
}

export async function returnTool(formData: FormData) {
  const actor = await mutationSession();
  const loanId = id.parse(formData.get("loanId"));
  const [returned] = await db().update(toolLoans)
    .set({ returnedAt: new Date(), returnedBy: actor.userId })
    .where(and(eq(toolLoans.id, loanId), isNull(toolLoans.returnedAt)))
    .returning({ id: toolLoans.id });
  if (!returned) throw new Error("Empréstimo já encerrado");
  done("/ferramentas", "Devolução registrada");
}

export async function consumeSupply(formData: FormData) {
  const actor = await mutationSession();
  const supplyId = id.parse(formData.get("supplyId"));
  const employeeId = id.parse(formData.get("employeeId"));
  const operationId = operationIdSchema.parse(formData.get("operationId"));
  const quantity = quantitySchema.parse(formData.get("quantity"));
  const movementPayload = { supplyId, employeeId, type: "CONSUMPTION" as const, quantity, registeredBy: actor.userId };
  await db().transaction(async (tx) => {
    const [employee] = await tx.select({ id: employees.id }).from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.active, true))).limit(1);
    if (!employee) throw new Error("Funcionário indisponível");
    const [movement] = await tx.insert(supplyMovements).values({ operationId, ...movementPayload })
      .onConflictDoNothing({ target: supplyMovements.operationId }).returning({ id: supplyMovements.id });
    if (!movement) {
      const [existing] = await tx.select({
        supplyId: supplyMovements.supplyId, employeeId: supplyMovements.employeeId, type: supplyMovements.type,
        quantity: supplyMovements.quantity, registeredBy: supplyMovements.registeredBy,
      }).from(supplyMovements).where(eq(supplyMovements.operationId, operationId)).limit(1);
      if (!existing || !sameSupplyMovement(existing, movementPayload)) throw new Error("Identificador de operação reutilizado com dados diferentes");
      return;
    }
    const [updated] = await tx.update(supplies)
      .set({ quantity: sql`${supplies.quantity} - ${quantity}`, updatedAt: new Date() })
      .where(and(eq(supplies.id, supplyId), eq(supplies.active, true), gte(supplies.quantity, quantity)))
      .returning({ id: supplies.id });
    if (!updated) throw new Error("Estoque insuficiente ou insumo indisponível");
  });
  done("/insumos", "Consumo registrado");
}

export async function addSupplyStock(formData: FormData) {
  const actor = await mutationAdmin();
  const supplyId = id.parse(formData.get("supplyId"));
  const operationId = operationIdSchema.parse(formData.get("operationId"));
  const quantity = quantitySchema.parse(formData.get("quantity"));
  const movementPayload = { supplyId, employeeId: null, type: "ENTRY" as const, quantity, registeredBy: actor.userId };
  await db().transaction(async (tx) => {
    const [movement] = await tx.insert(supplyMovements).values({ operationId, ...movementPayload })
      .onConflictDoNothing({ target: supplyMovements.operationId }).returning({ id: supplyMovements.id });
    if (!movement) {
      const [existing] = await tx.select({
        supplyId: supplyMovements.supplyId, employeeId: supplyMovements.employeeId, type: supplyMovements.type,
        quantity: supplyMovements.quantity, registeredBy: supplyMovements.registeredBy,
      }).from(supplyMovements).where(eq(supplyMovements.operationId, operationId)).limit(1);
      if (!existing || !sameSupplyMovement(existing, movementPayload)) throw new Error("Identificador de operação reutilizado com dados diferentes");
      return;
    }
    const [updated] = await tx.update(supplies)
      .set({ quantity: sql`${supplies.quantity} + ${quantity}`, updatedAt: new Date() })
      .where(and(eq(supplies.id, supplyId), eq(supplies.active, true)))
      .returning({ id: supplies.id });
    if (!updated) throw new Error("Insumo indisponível");
  });
  done("/insumos", "Entrada registrada");
}

export async function createEmployee(formData: FormData) {
  await mutationAdmin();
  await db().insert(employees).values({ name: text.parse(formData.get("name")), registrationCode: text.optional().parse(formData.get("registrationCode") || undefined) });
  done("/cadastros", "Funcionário cadastrado");
}

export async function createTool(formData: FormData) {
  await mutationAdmin();
  await db().insert(tools).values({ code: normalizeCode(text.parse(formData.get("code"))), name: text.parse(formData.get("name")) });
  done("/cadastros", "Ferramenta cadastrada");
}

export async function createSupply(formData: FormData) {
  const actor = await mutationAdmin();
  const quantity = z.coerce.number().int().min(0).parse(formData.get("quantity"));
  const operationId = operationIdSchema.parse(formData.get("operationId"));
  await db().transaction(async (tx) => {
    const [supply] = await tx.insert(supplies).values({
      code: normalizeCode(text.parse(formData.get("code"))), name: text.parse(formData.get("name")),
      quantity, minimumQuantity: z.coerce.number().int().min(0).parse(formData.get("minimumQuantity")), unit: "UN",
    }).returning({ id: supplies.id });
    if (quantity > 0) {
      await tx.insert(supplyMovements).values({
        operationId, supplyId: supply.id, type: "ENTRY", quantity, registeredBy: actor.userId,
      });
    }
  });
  done("/cadastros", "Insumo cadastrado");
}
