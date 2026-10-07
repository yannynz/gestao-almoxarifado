import { z } from "zod";

export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const normalizeCode = (value: string) => value.trim().toUpperCase();

export const quantitySchema = z.coerce.number().int().positive();
export const operationIdSchema = z.string().uuid();

export const demoLoginAllowed = (environment: string | undefined, flag: string | undefined) =>
  environment !== "production" && flag === "true";

export const sessionCookieName = (environment: string | undefined) =>
  environment === "production" ? "__Host-almox_session" : "almox_session";

export type ToolPhysicalStatus = "ACTIVE" | "MAINTENANCE";
export type ToolViewState = "AVAILABLE" | "LOANED" | "MAINTENANCE";

export function toolViewState(status: ToolPhysicalStatus, hasOpenLoan: boolean): ToolViewState {
  if (status === "MAINTENANCE") return "MAINTENANCE";
  return hasOpenLoan ? "LOANED" : "AVAILABLE";
}

export const labels: Record<ToolViewState, string> = {
  AVAILABLE: "Disponível",
  LOANED: "Emprestada",
  MAINTENANCE: "Em manutenção",
};

type SupplyMovementIdentity = {
  supplyId: string;
  employeeId: string | null;
  type: "ENTRY" | "CONSUMPTION" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  registeredBy: string;
};

export function sameSupplyMovement(a: SupplyMovementIdentity, b: SupplyMovementIdentity) {
  return a.supplyId === b.supplyId
    && a.employeeId === b.employeeId
    && a.type === b.type
    && a.quantity === b.quantity
    && a.registeredBy === b.registeredBy;
}

type ToolLoanEventInput = {
  id: string;
  item: string;
  code: string;
  employee: string;
  checkedOutActor: string;
  returnedActor: string | null;
  checkedOutAt: Date;
  returnedAt: Date | null;
};

export function toolLoanEvents(loan: ToolLoanEventInput) {
  const common = { kind: "Ferramenta" as const, item: loan.item, code: loan.code, employee: loan.employee, quantity: null };
  const events = [{
    ...common,
    id: `checkout:${loan.id}`,
    type: "Retirada",
    actor: loan.checkedOutActor,
    createdAt: loan.checkedOutAt,
  }];
  if (loan.returnedAt && loan.returnedActor) {
    events.push({
      ...common,
      id: `return:${loan.id}`,
      type: "Devolução",
      actor: loan.returnedActor,
      createdAt: loan.returnedAt,
    });
  }
  return events;
}
