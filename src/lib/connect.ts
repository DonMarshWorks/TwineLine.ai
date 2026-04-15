/**
 * Connect page validation and URL logic, imported by connect.astro.
 */

const USERNAME_RE = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

const RESERVED = new Set([
  "www",
  "api",
  "app",
  "mail",
  "ftp",
  "admin",
  "dashboard",
  "status",
  "docs",
  "blog",
  "support",
  "help",
  "ns1",
  "ns2",
  "twineline",
  "connect",
]);

export interface ConnectValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate a username for the connect page.
 * Returns { valid: true } or { valid: false, error: "..." }.
 */
export function validateConnectUsername(raw: string): ConnectValidation {
  const username = raw.toLowerCase().trim();
  if (!username) {
    return { valid: false, error: "Username is required" };
  }
  if (username.length < 2) {
    return { valid: false, error: "Username must be at least 2 characters" };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      valid: false,
      error: "Letters, numbers, and hyphens only (2-63 characters)",
    };
  }
  if (RESERVED.has(username)) {
    return { valid: false, error: "This name is reserved" };
  }
  return { valid: true };
}

/**
 * Build the redirect URL for a given username.
 */
export function buildConnectRedirectUrl(username: string): string {
  return `https://${username.toLowerCase().trim()}.twineline.ai/firetv/`;
}
