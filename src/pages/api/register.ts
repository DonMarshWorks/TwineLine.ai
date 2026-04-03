/**
 * Subdomain registration API.
 *
 * Creates or updates a proxied DNS A record for `{name}.twineline.ai`.
 * Server-to-server only — called by TwineLine server instances.
 *
 * POST /api/register
 * Body: { "name": "don", "ip": "1.2.3.4" }
 * Auth: X-API-Key header matching PHONEBOOK_API_KEY
 */
import type { APIRoute } from "astro";
import { validateUsername, validateIpv4 } from "../../lib/username";
import {
  lookupDns,
  createDnsRecord,
  updateDnsRecord,
} from "../../lib/cloudflare-dns";
import { setCachedDns } from "../../lib/dns-cache";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { env, caches } = locals.runtime;

  // Validate API key
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey || apiKey !== env.PHONEBOOK_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: { name?: string; ip?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate name
  const rawName = body.name;
  if (!rawName) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const nameValidation = validateUsername(rawName);
  if (!nameValidation.valid) {
    return Response.json({ error: nameValidation.error }, { status: 400 });
  }

  const name = rawName.toLowerCase().trim();

  // Validate IP
  const rawIp = body.ip;
  if (!rawIp) {
    return Response.json({ error: "IP address is required" }, { status: 400 });
  }

  const ipValidation = validateIpv4(rawIp);
  if (!ipValidation.valid) {
    return Response.json({ error: ipValidation.error }, { status: 400 });
  }

  const ip = rawIp.trim();

  // Look up existing record
  const dnsResult = await lookupDns(
    name,
    env.CLOUDFLARE_ZONE_ID,
    env.CLOUDFLARE_API_TOKEN,
  );

  if (!dnsResult.ok) {
    return Response.json(
      { error: dnsResult.message },
      { status: dnsResult.status },
    );
  }

  // Skip mutation if record already matches (idempotency)
  const existingRecord = dnsResult.records[0];

  if (existingRecord && existingRecord.content === ip) {
    return Response.json({
      success: true,
      hostname: `${name}.twineline.ai`,
    });
  }

  const mutationResult = existingRecord
    ? await updateDnsRecord(
        existingRecord.id,
        name,
        ip,
        env.CLOUDFLARE_ZONE_ID,
        env.CLOUDFLARE_API_TOKEN,
      )
    : await createDnsRecord(
        name,
        ip,
        env.CLOUDFLARE_ZONE_ID,
        env.CLOUDFLARE_API_TOKEN,
      );

  if (!mutationResult.ok) {
    return Response.json(
      { error: mutationResult.message },
      { status: mutationResult.status },
    );
  }

  // Invalidate DNS cache so the check endpoint reflects the new record
  if (caches) {
    await setCachedDns(caches, name, [{ content: ip }]);
  }

  return Response.json({
    success: true,
    hostname: `${name}.twineline.ai`,
  });
};
