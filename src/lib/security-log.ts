type SecurityEvent = "auth.success" | "auth.failure" | "auth.rate_limited" | "auth.logout" | "authz.denied" | "csrf.denied" | "session.create_failure";

export function logSecurityEvent(event: SecurityEvent, details: Record<string, string>) {
  const entry = JSON.stringify({ event, at: new Date().toISOString(), ...details });
  if (event === "auth.success" || event === "auth.logout") console.info(entry);
  else console.warn(entry);
}
