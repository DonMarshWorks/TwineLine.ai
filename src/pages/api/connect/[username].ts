/**
 * Public subdomain existence check for the connect page.
 *
 * GET /api/connect/:username
 * Returns { registered: true } if a DNS A record exists for username.twineline.ai,
 * or { registered: false } if not. No authentication required (read-only).
 */
import type { APIRoute } from "astro";
import { validateConnectUsername } from "../../../lib/connect";
import { lookupDns } from "../../../lib/cloudflare-dns";
import { getCachedDns, setCachedDns } from "../../../lib/dns-cache";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { env, caches } = locals.runtime;

  const raw = params.username ?? "";
  const validation = validateConnectUsername(raw);
  if (!validation.valid) {
    return Response.json({ registered: false }, { status: 400 });
  }

  const username = raw.toLowerCase().trim();

  // Check cache first
  if (caches) {
    const cached = await getCachedDns(caches, username);
    if (cached) {
      return Response.json({
        registered: cached.records.length > 0,
      });
    }
  }

  const result = await lookupDns(
    username,
    env.CLOUDFLARE_ZONE_ID,
    env.CLOUDFLARE_API_TOKEN,
  );

  if (!result.ok) {
    // DNS lookup failed — don't block the user, assume registered
    return Response.json({ registered: true });
  }

  if (caches) {
    await setCachedDns(caches, username, result.records);
  }

  return Response.json({ registered: result.records.length > 0 });
};
