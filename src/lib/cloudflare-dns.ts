export interface DnsRecord {
  id: string;
  content: string;
}

export interface DnsLookupResult {
  ok: true;
  records: DnsRecord[];
}

export interface DnsLookupError {
  ok: false;
  status: number;
  message: string;
}

export type DnsResult = DnsLookupResult | DnsLookupError;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Query Cloudflare DNS API for A records matching `{username}.twineline.ai`.
 * Retries up to MAX_RETRIES times on transient failures (5xx, 429, network errors).
 */
export async function lookupDns(
  username: string,
  zoneId: string,
  apiToken: string,
): Promise<DnsResult> {
  const fqdn = `${username}.twineline.ai`;
  const url = `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/dns_records?type=A&name=${encodeURIComponent(fqdn)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, RETRY_DELAY_MS * (attempt + 1)),
          );
          continue;
        }
        return {
          ok: false,
          status: 502,
          message: "DNS service temporarily unavailable",
        };
      }

      if (!response.ok) {
        if (attempt < MAX_RETRIES && response.status >= 500) {
          await new Promise((r) =>
            setTimeout(r, RETRY_DELAY_MS * (attempt + 1)),
          );
          continue;
        }
        return {
          ok: false,
          status: 502,
          message: `DNS lookup failed (upstream ${response.status})`,
        };
      }

      const data = (await response.json()) as { result: DnsRecord[] };
      return { ok: true, records: data.result ?? [] };
    } catch {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { ok: false, status: 502, message: "Could not check DNS records" };
    }
  }

  return { ok: false, status: 502, message: "Could not check DNS records" };
}

export interface DnsMutationSuccess {
  ok: true;
}

export interface DnsMutationError {
  ok: false;
  status: number;
  message: string;
}

export type DnsMutationResult = DnsMutationSuccess | DnsMutationError;

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

/**
 * Create a new proxied DNS A record for `{name}.twineline.ai`.
 */
export async function createDnsRecord(
  name: string,
  ip: string,
  zoneId: string,
  apiToken: string,
): Promise<DnsMutationResult> {
  const url = `${CF_API_BASE}/zones/${encodeURIComponent(zoneId)}/dns_records`;
  const body = JSON.stringify({
    type: "A",
    name: `${name}.twineline.ai`,
    content: ip,
    proxied: true,
    ttl: 1,
  });

  return mutateWithRetry(url, "POST", body, apiToken);
}

/**
 * Update an existing DNS A record by ID.
 */
export async function updateDnsRecord(
  recordId: string,
  name: string,
  ip: string,
  zoneId: string,
  apiToken: string,
): Promise<DnsMutationResult> {
  const url = `${CF_API_BASE}/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`;
  const body = JSON.stringify({
    type: "A",
    name: `${name}.twineline.ai`,
    content: ip,
    proxied: true,
    ttl: 1,
  });

  return mutateWithRetry(url, "PUT", body, apiToken);
}

async function mutateWithRetry(
  url: string,
  method: string,
  body: string,
  apiToken: string,
): Promise<DnsMutationResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, RETRY_DELAY_MS * (attempt + 1)),
          );
          continue;
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          status: 500,
          message: `DNS mutation failed (upstream ${response.status})`,
        };
      }

      return { ok: true };
    } catch {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { ok: false, status: 500, message: "Cloudflare API error" };
    }
  }

  return { ok: false, status: 500, message: "Cloudflare API error" };
}
