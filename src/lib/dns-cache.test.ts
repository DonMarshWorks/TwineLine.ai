import { describe, it, expect, vi } from "vitest";
import { getCachedDns, setCachedDns } from "./dns-cache";

function createMockCaches() {
  const store = new Map<string, Response>();
  const mockCache = {
    match: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, response: Response) => {
      store.set(key, response.clone());
    }),
  };
  return {
    open: vi.fn(async () => mockCache),
    _store: store,
    _mockCache: mockCache,
  };
}

describe("dns-cache", () => {
  it("returns null on cache miss", async () => {
    const caches = createMockCaches();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getCachedDns(caches as any, "alice");
    expect(result).toBeNull();
  });

  it("round-trips a cached value", async () => {
    const caches = createMockCaches();
    const records = [{ content: "1.2.3.4" }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setCachedDns(caches as any, "alice", records);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getCachedDns(caches as any, "alice");

    expect(result).not.toBeNull();
    expect(result!.records).toEqual(records);
    expect(result!.timestamp).toBeGreaterThan(0);
  });

  it("uses consistent cache keys for same username", async () => {
    const caches = createMockCaches();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setCachedDns(caches as any, "bob", []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await getCachedDns(caches as any, "bob");

    const putKey = caches._mockCache.put.mock.calls[0][0];
    const matchKey = caches._mockCache.match.mock.calls[0][0];
    expect(putKey).toBe(matchKey);
  });

  it("opens the 'dns-check' cache namespace", async () => {
    const caches = createMockCaches();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await getCachedDns(caches as any, "test");
    expect(caches.open).toHaveBeenCalledWith("dns-check");
  });

  it("sets Cache-Control header with TTL on stored responses", async () => {
    const caches = createMockCaches();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await setCachedDns(caches as any, "alice", [{ content: "1.2.3.4" }]);

    const storedResponse = caches._mockCache.put.mock.calls[0][1] as Response;
    expect(storedResponse.headers.get("Cache-Control")).toMatch(/s-maxage=60/);
  });
});
