/**
 * GET /api/auth/google/start?session=UUID
 *
 * Redirects the user's browser to Google's OAuth consent screen.
 * The session UUID correlates this auth attempt with the TwineLine
 * server that will poll for the resulting tokens.
 */
import type { APIRoute } from "astro";
import { buildAuthUrl } from "../../../../lib/google-auth";

export const prerender = false;

const REDIRECT_URI = "https://twineline.ai/api/auth/google/callback";

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const { env } = locals.runtime;
  const session = url.searchParams.get("session");

  if (!session || session.length < 8) {
    return Response.json(
      { error: "Missing or invalid session parameter" },
      { status: 400 },
    );
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "Google OAuth not configured" },
      { status: 500 },
    );
  }

  const authUrl = buildAuthUrl(clientId, REDIRECT_URI, session);
  return redirect(authUrl, 302);
};
