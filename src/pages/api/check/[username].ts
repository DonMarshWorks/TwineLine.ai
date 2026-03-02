/**
 * Subdomain availability check API.
 *
 * This endpoint is designed for SERVER-TO-SERVER use only.
 * TwineLine server instances call this API to check/register subdomains.
 * It is NOT called from the browser.
 *
 * Authentication: X-API-Key header must match PHONEBOOK_API_KEY env var.
 *
 * The IP comparison logic (CF-Connecting-IP vs DNS A record) works because:
 * - The caller IS the Hetzner server that owns the subdomain
 * - CF-Connecting-IP is set by Cloudflare's edge and reflects the true client IP
 * - If the server's IP matches the existing DNS record, it's re-registering its own name
 */
import type { APIRoute } from "astro";
import { validateUsername } from "../../../lib/username";
import { lookupDns } from "../../../lib/cloudflare-dns";
import { getCachedDns, setCachedDns } from "../../../lib/dns-cache";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { env, caches } = locals.runtime;

  // Validate API key
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey || apiKey !== env.PHONEBOOK_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate username (RFC 1035 subdomain rules + reserved names)
  const rawUsername = params.username;
  if (!rawUsername) {
    return Response.json(
      { error: "Username parameter is required" },
      { status: 400 },
    );
  }

  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return Response.json(
      { available: false, error: validation.error },
      { status: 400 },
    );
  }

  const username = rawUsername.toLowerCase().trim();

  // Check cache first (prevents DoS via Cloudflare API rate limits)
  if (caches) {
    const cached = await getCachedDns(caches, username);
    if (cached) {
      return buildAvailabilityResponse(cached.records, request);
    }
  }

  // DNS lookup with retry on transient failures
  const dnsResult = await lookupDns(
    username,
    env.CLOUDFLARE_ZONE_ID,
    env.CLOUDFLARE_API_TOKEN,
  );

  if (!dnsResult.ok) {
    return Response.json(
      { available: false, message: dnsResult.message },
      { status: dnsResult.status },
    );
  }

  // Cache the result (guard for dev mode where Cache API is unavailable)
  if (caches) {
    await setCachedDns(caches, username, dnsResult.records);
  }

  return buildAvailabilityResponse(dnsResult.records, request);
};

/**
 * Build the availability response from DNS records.
 *
 * Only trusts CF-Connecting-IP (set by Cloudflare edge, not spoofable)
 * for the IP ownership check. X-Forwarded-For is intentionally excluded.
 */
function buildAvailabilityResponse(
  records: Array<{ content: string }>,
  request: Request,
): Response {
  if (!records || records.length === 0) {
    return Response.json({ available: true, message: "" });
  }

  const existingIp = records[0].content;
  const requesterIp = request.headers.get("CF-Connecting-IP") ?? "";

  if (existingIp === requesterIp) {
    return Response.json({ available: true, message: "" });
  }

  return Response.json({
    available: false,
    message: "Already in use by another server",
  });
}
