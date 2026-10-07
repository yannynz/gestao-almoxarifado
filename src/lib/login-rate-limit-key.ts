import { createHash } from "node:crypto";

export type LoginRateLimitDescriptor = {
  scope: "account" | "ip";
  key: string;
  maxAttempts: number;
  resetOnSuccess: boolean;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function loginRateLimitDescriptors(username: string, clientAddress: string): LoginRateLimitDescriptor[] {
  return [
    { scope: "account", key: digest(`account\0${username}`), maxAttempts: 5, resetOnSuccess: true },
    { scope: "ip", key: digest(`ip\0${clientAddress}`), maxAttempts: 20, resetOnSuccess: true },
  ];
}

export function loginRateLimitKey(_username: string, clientAddress: string) {
  return loginRateLimitDescriptors("", clientAddress)[1].key;
}
