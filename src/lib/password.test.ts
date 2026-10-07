import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("armazenamento de senha", () => {
  it("usa Argon2id e valida somente a senha correta", async () => {
    const encoded = await hashPassword("uma frase secreta longa");
    expect(encoded).toContain("$argon2id$");
    await expect(verifyPassword(encoded, "uma frase secreta longa")).resolves.toBe(true);
    await expect(verifyPassword(encoded, "senha errada")).resolves.toBe(false);
  });
});
