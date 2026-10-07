import "server-only";
import { headers } from "next/headers";
import { isTrustedMutationRequest } from "@/lib/csrf";
import { logSecurityEvent } from "@/lib/security-log";

export async function assertTrustedMutation() {
  const requestHeaders = await headers();
  const trusted = isTrustedMutationRequest({
    origin: requestHeaders.get("origin"),
    referer: requestHeaders.get("referer"),
    host: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    fetchSite: requestHeaders.get("sec-fetch-site"),
  });
  if (!trusted) {
    logSecurityEvent("csrf.denied", { reason: "untrusted-or-missing-origin" });
    throw new Error("Requisição não autorizada");
  }
}
