import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupDns, createDnsRecord, updateDnsRecord } from "./cloudflare-dns";

const ZONE_ID = "test-zone-id";
const API_TOKEN = "test-api-token";

describe("lookupDns", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns records on successful lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [{ content: "1.2.3.4" }] }),
      }),
    );

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true, records: [{ content: "1.2.3.4" }] });
  });

  it("returns empty records when no DNS entries exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      }),
    );

    const result = await lookupDns("newname", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true, records: [] });
  });

  it("retries on 500 errors and eventually fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("retries on 429 rate limit and succeeds on second attempt", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true, records: [] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error and succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network fail"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: [{ content: "5.6.7.8" }] }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true, records: [{ content: "5.6.7.8" }] });
  });

  it("does not retry on 4xx errors (except 429)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("encodes the FQDN in the URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await lookupDns("test-name", ZONE_ID, API_TOKEN);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain(
      encodeURIComponent("test-name.twineline.ai"),
    );
  });

  it("sends Authorization header with Bearer token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await lookupDns("alice", ZONE_ID, API_TOKEN);
    const calledHeaders = mockFetch.mock.calls[0][1].headers as Record<
      string,
      string
    >;
    expect(calledHeaders.Authorization).toBe(`Bearer ${API_TOKEN}`);
  });

  it("handles null result array from Cloudflare API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: null }),
      }),
    );

    const result = await lookupDns("alice", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true, records: [] });
  });
});

describe("createDnsRecord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with correct body and returns ok on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await createDnsRecord("don", "1.2.3.4", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain(`/zones/${ZONE_ID}/dns_records`);
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      type: "A",
      name: "don.twineline.ai",
      content: "1.2.3.4",
      proxied: true,
      ttl: 1,
    });
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers.Authorization).toBe(`Bearer ${API_TOKEN}`);
  });

  it("returns error on Cloudflare API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    );

    const result = await createDnsRecord("don", "1.2.3.4", ZONE_ID, API_TOKEN);
    expect(result.ok).toBe(false);
  });

  it("retries on 500 errors", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await createDnsRecord("don", "1.2.3.4", ZONE_ID, API_TOKEN);
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("updateDnsRecord", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends PUT with correct URL and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await updateDnsRecord(
      "record-123",
      "don",
      "5.6.7.8",
      ZONE_ID,
      API_TOKEN,
    );
    expect(result).toEqual({ ok: true });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain(`/zones/${ZONE_ID}/dns_records/record-123`);
    expect(opts.method).toBe("PUT");
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      type: "A",
      name: "don.twineline.ai",
      content: "5.6.7.8",
      proxied: true,
      ttl: 1,
    });
  });

  it("returns error on Cloudflare API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );

    const result = await updateDnsRecord(
      "record-123",
      "don",
      "5.6.7.8",
      ZONE_ID,
      API_TOKEN,
    );
    expect(result.ok).toBe(false);
  });

  it("retries on network error and succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network fail"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await updateDnsRecord(
      "record-123",
      "don",
      "5.6.7.8",
      ZONE_ID,
      API_TOKEN,
    );
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
