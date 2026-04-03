/**
 * GET /api/auth/google/callback
 *
 * Receives the OAuth redirect from Google after user consent.
 * Exchanges the authorization code for tokens, stores them in KV
 * keyed by session UUID, and shows a success page.
 */
import type { APIRoute } from "astro";
import {
  exchangeCodeForTokens,
  fetchUserEmail,
  storeTokens,
} from "../../../../lib/google-auth";

export const prerender = false;

const REDIRECT_URI = "https://twineline.ai/api/auth/google/callback";

export const GET: APIRoute = async ({ url, locals }) => {
  const { env } = locals.runtime;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // session UUID
  const error = url.searchParams.get("error");

  // User denied consent or other error
  if (error) {
    return new Response(errorPage("Authorization denied", error), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code || !state) {
    return new Response(
      errorPage("Missing parameters", "No code or state received from Google."),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  // Exchange code for tokens
  const result = await exchangeCodeForTokens(
    code,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );

  if (!result.ok || !result.access_token) {
    return new Response(
      errorPage("Token exchange failed", result.error ?? "Unknown error"),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  // Fetch user email (best-effort)
  const email = await fetchUserEmail(result.access_token);

  // Store tokens in KV for TwineLine server to retrieve
  await storeTokens(env.GOOGLE_AUTH_KV, state, {
    access_token: result.access_token,
    refresh_token: result.refresh_token ?? "",
    email,
    expires_in: result.expires_in ?? 3600,
  });

  return new Response(successPage(email), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};

function successPage(email: string | null): string {
  const emailLine = email
    ? `<p style="color:#aaa;margin-top:8px">${email}</p>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TwineLine — Google Drive Connected</title>
<style>body{background:#1a1a2e;color:#eee;font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{text-align:center;padding:40px;max-width:400px}
.check{font-size:64px;margin-bottom:16px}
h1{font-size:1.4rem;font-weight:600;margin:0}
p{font-size:0.95rem;margin-top:16px;color:#aaa}</style></head>
<body><div class="card">
<div class="check">&#10003;</div>
<h1>Google Drive Connected</h1>
${emailLine}
<p>You can close this tab and return to TwineLine.</p>
</div></body></html>`;
}

function errorPage(title: string, detail: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TwineLine — Error</title>
<style>body{background:#1a1a2e;color:#eee;font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{text-align:center;padding:40px;max-width:400px}
.icon{font-size:64px;margin-bottom:16px}
h1{font-size:1.4rem;font-weight:600;margin:0;color:#ff6b6b}
p{font-size:0.95rem;margin-top:16px;color:#aaa}</style></head>
<body><div class="card">
<div class="icon">&#10007;</div>
<h1>${title}</h1>
<p>${detail}</p>
<p>Close this tab and try again in TwineLine.</p>
</div></body></html>`;
}
