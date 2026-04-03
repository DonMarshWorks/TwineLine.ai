/**
 * Google OAuth relay — handles auth code flow on behalf of TwineLine instances.
 *
 * TwineLine devices can't receive OAuth redirects directly (Fire TV, local
 * machines without public URLs), so twineline.ai acts as the redirect target.
 * Tokens are held briefly in Cloudflare KV (globally consistent) and
 * retrieved by the TwineLine server via polling.
 */

import type { KVNamespace } from "@cloudflare/workers-types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo";

/** Full drive scope — needed to read and delete Takeout zips. */
const SCOPE = "https://www.googleapis.com/auth/drive email";

const KV_TTL_SECONDS = 300; // 5 minutes

// ─── KV helpers ────────────────────────────────────────────────────────────

export interface CachedTokens {
  access_token: string;
  refresh_token: string;
  email: string | null;
  expires_in: number;
}

/**
 * Retrieve and atomically consume tokens from KV.
 *
 * Reads the value, then immediately deletes it so no concurrent
 * poll can retrieve the same tokens.
 */
export async function consumeTokens(
  kv: KVNamespace,
  session: string,
): Promise<CachedTokens | null> {
  const value = await kv.get(session, "json");
  if (!value) return null;

  // Delete immediately — first poller wins
  await kv.delete(session);

  return value as CachedTokens;
}

export async function storeTokens(
  kv: KVNamespace,
  session: string,
  tokens: CachedTokens,
): Promise<void> {
  await kv.put(session, JSON.stringify(tokens), {
    expirationTtl: KV_TTL_SECONDS,
  });
}

// ─── Auth URL ──────────────────────────────────────────────────────────────

/**
 * Build the Google OAuth consent URL.
 */
export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  session: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state: session,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

// ─── Token exchange ────────────────────────────────────────────────────────

export interface TokenExchangeResult {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<TokenExchangeResult> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = (await resp.json()) as Record<string, unknown>;

  if (!resp.ok || !data.access_token) {
    return {
      ok: false,
      error: (data.error_description ??
        data.error ??
        "Token exchange failed") as string,
    };
  }

  return {
    ok: true,
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string | undefined,
    expires_in: data.expires_in as number | undefined,
  };
}

// ─── Token refresh ─────────────────────────────────────────────────────────

export interface TokenRefreshResult {
  ok: boolean;
  access_token?: string;
  expires_in?: number;
  error?: string;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenRefreshResult> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await resp.json()) as Record<string, unknown>;

  if (!resp.ok || !data.access_token) {
    return {
      ok: false,
      error: (data.error_description ??
        data.error ??
        "Token refresh failed") as string,
    };
  }

  return {
    ok: true,
    access_token: data.access_token as string,
    expires_in: data.expires_in as number | undefined,
  };
}

// ─── User info ─────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's email (best-effort).
 */
export async function fetchUserEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const resp = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    return (data.email as string) ?? null;
  } catch {
    return null;
  }
}
