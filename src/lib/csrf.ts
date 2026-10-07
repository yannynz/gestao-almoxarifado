export type MutationRequestMetadata = {
  origin: string | null;
  referer: string | null;
  host: string | null;
  fetchSite: string | null;
};

export function isTrustedMutationRequest({ origin, referer, host, fetchSite }: MutationRequestMetadata) {
  if (!host || fetchSite === "cross-site") return false;
  const source = origin ?? referer;
  if (!source || source === "null") return false;
  try {
    return new URL(source).host.toLowerCase() === host.split(",")[0].trim().toLowerCase();
  } catch {
    return false;
  }
}
