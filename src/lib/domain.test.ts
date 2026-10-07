import { describe, expect, it } from "vitest";
import {
  demoLoginAllowed,
  normalizeCode,
  normalizeUsername,
  operationIdSchema,
  quantitySchema,
  sameSupplyMovement,
  sessionCookieName,
  toolLoanEvents,
  toolViewState,
} from "./domain";
import { loginRateLimitKey } from "./login-rate-limit-key";

describe("regras essenciais do domínio", () => {
  it("normaliza identificadores usados em unicidade", () => {
    expect(normalizeCode(" a-01 ")).toBe("A-01");
    expect(normalizeUsername("  Almoxarife ")).toBe("almoxarife");
  });

  it("rejeita consumo sem quantidade inteira positiva", () => {
    expect(quantitySchema.safeParse(0).success).toBe(false);
    expect(quantitySchema.safeParse(1.5).success).toBe(false);
    expect(quantitySchema.safeParse(3).success).toBe(true);
  });

  it("usa prefixo __Host apenas quando o cookie é seguro", () => {
    expect(sessionCookieName("production")).toBe("__Host-almox_session");
    expect(sessionCookieName("development")).toBe("almox_session");
  });

  it("prioriza manutenção e depois empréstimo no estado exibido", () => {
    expect(toolViewState("MAINTENANCE", true)).toBe("MAINTENANCE");
    expect(toolViewState("ACTIVE", true)).toBe("LOANED");
    expect(toolViewState("ACTIVE", false)).toBe("AVAILABLE");
  });

  it("aceita apenas UUID como identificador idempotente", () => {
    expect(operationIdSchema.safeParse("f5dc1016-1e01-4c9a-8c6a-c4e8dc15b535").success).toBe(true);
    expect(operationIdSchema.safeParse("gerado-no-servidor").success).toBe(false);
  });

  it("nunca permite login de demonstração em produção", () => {
    expect(demoLoginAllowed("production", "true")).toBe(false);
    expect(demoLoginAllowed("development", "true")).toBe(true);
    expect(demoLoginAllowed("development", "false")).toBe(false);
  });

  it("separa retirada e devolução com data e operador próprios", () => {
    const checkedOutAt = new Date("2026-01-01T10:00:00Z");
    const returnedAt = new Date("2026-01-02T11:00:00Z");
    expect(toolLoanEvents({
      id: "loan-1",
      item: "Furadeira",
      code: "F1",
      employee: "Ana",
      checkedOutActor: "Operador A",
      returnedActor: "Operador B",
      checkedOutAt,
      returnedAt,
    })).toEqual([
      expect.objectContaining({ id: "checkout:loan-1", type: "Retirada", actor: "Operador A", createdAt: checkedOutAt }),
      expect.objectContaining({ id: "return:loan-1", type: "Devolução", actor: "Operador B", createdAt: returnedAt }),
    ]);
  });

  it("limita login por endereço, independentemente do usuário tentado", () => {
    expect(loginRateLimitKey("ana", "192.0.2.1")).toBe(loginRateLimitKey("bia", "192.0.2.1"));
    expect(loginRateLimitKey("ana", "192.0.2.1")).not.toBe(loginRateLimitKey("ana", "192.0.2.2"));
  });

  it("aceita idempotência somente quando o payload é idêntico", () => {
    const saved = { supplyId: "s1", employeeId: "e1", type: "CONSUMPTION" as const, quantity: 2, registeredBy: "u1" };
    expect(sameSupplyMovement(saved, saved)).toBe(true);
    expect(sameSupplyMovement(saved, { ...saved, quantity: 3 })).toBe(false);
    expect(sameSupplyMovement(saved, { ...saved, employeeId: "e2" })).toBe(false);
  });
});
