import { describe, expect, it } from "vitest";
import { isTrustedMutationRequest } from "./csrf";
import { loginRateLimitDescriptors } from "./login-rate-limit-key";

describe("barreiras de requisições sensíveis", () => {
  it("exige Origin ou Referer do mesmo host", () => {
    expect(isTrustedMutationRequest({ origin: "https://almox.example.com", referer: null, host: "almox.example.com", fetchSite: "same-origin" })).toBe(true);
    expect(isTrustedMutationRequest({ origin: null, referer: "https://almox.example.com/ferramentas", host: "almox.example.com", fetchSite: "same-origin" })).toBe(true);
    expect(isTrustedMutationRequest({ origin: null, referer: null, host: "almox.example.com", fetchSite: null })).toBe(false);
    expect(isTrustedMutationRequest({ origin: "https://evil.example", referer: null, host: "almox.example.com", fetchSite: "cross-site" })).toBe(false);
  });

  it("limita tentativas por conta e IP sem criar bloqueio global", () => {
    const first = loginRateLimitDescriptors("admin", "192.0.2.1");
    const otherIp = loginRateLimitDescriptors("admin", "192.0.2.2");
    const otherAccount = loginRateLimitDescriptors("other", "192.0.2.1");
    expect(first.map((item) => item.scope)).toEqual(["account", "ip"]);
    expect(first[0].key).toBe(otherIp[0].key);
    expect(first[1].key).toBe(otherAccount[1].key);
  });
});
