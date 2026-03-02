export interface DnsRecord {
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
        return { ok: false, status: 502, message: "Could not check DNS records" };
      }

      const data = (await response.json()) as { result: DnsRecord[] };
      return { ok: true, records: data.result ?? [] };
    } catch {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) =>
          setTimeout(r, RETRY_DELAY_MS * (attempt + 1)),
        );
        continue;
      }
      return { ok: false, status: 502, message: "Could not check DNS records" };
    }
  }

  return { ok: false, status: 502, message: "Could not check DNS records" };
}
