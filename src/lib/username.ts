/** Valid subdomain: 3-63 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen */
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/** Reserved subdomains that cannot be registered */
const RESERVED_NAMES = new Set([
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
]);

export interface UsernameValidation {
  valid: boolean;
  error?: string;
}

export function validateUsername(username: string): UsernameValidation {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const normalized = username.toLowerCase().trim();

  if (normalized.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (normalized.length > 63) {
    return { valid: false, error: "Username must be at most 63 characters" };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error:
        "Username must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen",
    };
  }

  if (RESERVED_NAMES.has(normalized)) {
    return { valid: false, error: "This name is reserved" };
  }

  return { valid: true };
}
