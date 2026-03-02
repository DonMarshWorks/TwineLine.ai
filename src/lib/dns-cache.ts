import type {
  CacheStorage as CloudflareCacheStorage,
  Response as CfResponse,
} from "@cloudflare/workers-types";

const CACHE_TTL_SECONDS = 60;
const CACHE_KEY_PREFIX = "https://dns-cache.twineline.ai/check/";

export interface CachedDnsResult {
  records: Array<{ content: string }>;
  timestamp: number;
}

/**
 * Get cached DNS lookup result from Cloudflare Cache API.
 * Returns null on cache miss.
 */
export async function getCachedDns(
  caches: CloudflareCacheStorage,
  username: string,
): Promise<CachedDnsResult | null> {
  const cache = await caches.open("dns-check");
  const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
  const cached = await cache.match(cacheKey);
  if (!cached) return null;
  return cached.json() as Promise<CachedDnsResult>;
}

/**
 * Store DNS lookup result in Cloudflare Cache API with TTL.
 */
export async function setCachedDns(
  caches: CloudflareCacheStorage,
  username: string,
  records: Array<{ content: string }>,
): Promise<void> {
  const cache = await caches.open("dns-check");
  const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
  const body: CachedDnsResult = { records, timestamp: Date.now() };
  const response = new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `s-maxage=${CACHE_TTL_SECONDS}`,
    },
  });
  await cache.put(cacheKey, response as unknown as CfResponse);
}
