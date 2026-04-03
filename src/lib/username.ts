/** Valid subdomain: 1-63 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen */
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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

  if (normalized.length < 2) {
    return { valid: false, error: "Username must be at least 2 characters" };
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

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export interface Ipv4Validation {
  valid: boolean;
  error?: string;
}

export function validateIpv4(ip: string): Ipv4Validation {
  if (!ip || typeof ip !== "string") {
    return { valid: false, error: "IP address is required" };
  }

  const match = IPV4_REGEX.exec(ip.trim());
  if (!match) {
    return { valid: false, error: "Invalid IPv4 address" };
  }

  const octets: number[] = [];
  for (let i = 1; i <= 4; i++) {
    // Reject leading zeros (e.g. "01", "001")
    if (match[i].length > 1 && match[i][0] === "0") {
      return { valid: false, error: "Invalid IPv4 address" };
    }
    const octet = parseInt(match[i], 10);
    if (octet > 255) {
      return { valid: false, error: "Invalid IPv4 address" };
    }
    octets.push(octet);
  }

  // Reject private, loopback, link-local, multicast, and reserved ranges
  const [a, b] = octets;
  if (
    a === 0 || // 0.0.0.0/8  — current network
    a === 10 || // 10.0.0.0/8 — private
    a === 127 || // 127.0.0.0/8 — loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 — link-local
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 — private
    (a === 192 && b === 168) || // 192.168.0.0/16 — private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 — CGNAT
    a >= 224 // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  ) {
    return { valid: false, error: "Public IPv4 address required" };
  }

  return { valid: true };
}
