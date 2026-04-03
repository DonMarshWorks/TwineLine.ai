/**
 * GET /api/auth/google/poll?session=UUID
 *
 * Called by the TwineLine server to retrieve tokens after the user
 * completes Google OAuth in their browser. Returns pending/completed.
 * Tokens are deleted from KV after first successful retrieval.
 */
import type { APIRoute } from "astro";
import { consumeTokens } from "../../../../lib/google-auth";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const { env } = locals.runtime;
  const session = url.searchParams.get("session");

  if (!session || session.length < 8) {
    return Response.json(
      { error: "Missing or invalid session parameter" },
      { status: 400 },
    );
  }

  // Atomic consume: read + delete in sequence (first poller wins)
  const tokens = await consumeTokens(env.GOOGLE_AUTH_KV, session);

  if (!tokens) {
    return Response.json({ status: "pending" });
  }

  return Response.json({
    status: "completed",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    email: tokens.email,
    expires_in: tokens.expires_in,
  });
};
