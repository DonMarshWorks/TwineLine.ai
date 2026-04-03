import { describe, it, expect } from "vitest";
import { validateUsername, validateIpv4 } from "./username";

describe("validateUsername", () => {
  describe("valid usernames", () => {
    it.each(["ab", "alice", "bob123", "my-server", "a1b", "a".repeat(63)])(
      "accepts '%s'",
      (name) => {
        expect(validateUsername(name)).toEqual({ valid: true });
      },
    );
  });

  describe("length constraints", () => {
    it("rejects empty string", () => {
      const result = validateUsername("");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/required/i);
    });

    it("rejects 1-char username", () => {
      const result = validateUsername("a");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least 2/);
    });

    it("accepts exactly 2 characters", () => {
      expect(validateUsername("ab")).toEqual({ valid: true });
    });

    it("accepts exactly 63 characters", () => {
      expect(validateUsername("a".repeat(63))).toEqual({ valid: true });
    });

    it("rejects 64-char username", () => {
      const result = validateUsername("a".repeat(64));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at most 63/);
    });
  });

  describe("character constraints", () => {
    it("normalizes uppercase to lowercase and accepts", () => {
      expect(validateUsername("ABC")).toEqual({ valid: true });
    });

    it("rejects leading hyphen", () => {
      expect(validateUsername("-abc").valid).toBe(false);
    });

    it("rejects trailing hyphen", () => {
      expect(validateUsername("abc-").valid).toBe(false);
    });

    it("rejects single hyphen", () => {
      expect(validateUsername("-").valid).toBe(false);
    });

    it("rejects dots", () => {
      expect(validateUsername("a.b.c").valid).toBe(false);
    });

    it("rejects spaces", () => {
      expect(validateUsername("a b c").valid).toBe(false);
    });

    it("rejects underscores", () => {
      expect(validateUsername("a_b_c").valid).toBe(false);
    });

    it("rejects special characters", () => {
      expect(validateUsername("a@b!c").valid).toBe(false);
    });
  });

  describe("reserved names", () => {
    it.each(["www", "api", "app", "mail", "admin", "twineline"])(
      "rejects reserved name '%s'",
      (name) => {
        const result = validateUsername(name);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/reserved/i);
      },
    );

    it("rejects reserved names case-insensitively", () => {
      const result = validateUsername("WWW");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/reserved/i);
    });
  });

  describe("edge cases", () => {
    it("handles null-like input", () => {
      expect(validateUsername(null as unknown as string).valid).toBe(false);
      expect(validateUsername(undefined as unknown as string).valid).toBe(
        false,
      );
    });

    it("trims whitespace", () => {
      expect(validateUsername("  alice  ")).toEqual({ valid: true });
    });
  });
});

describe("validateIpv4", () => {
  describe("valid public addresses", () => {
    it.each(["1.2.3.4", "8.8.8.8", "203.0.114.1", "44.55.66.77"])(
      "accepts '%s'",
      (ip) => {
        expect(validateIpv4(ip)).toEqual({ valid: true });
      },
    );
  });

  describe("invalid format", () => {
    it("rejects empty string", () => {
      expect(validateIpv4("").valid).toBe(false);
    });

    it("rejects null-like input", () => {
      expect(validateIpv4(null as unknown as string).valid).toBe(false);
      expect(validateIpv4(undefined as unknown as string).valid).toBe(false);
    });

    it("rejects octet > 255", () => {
      expect(validateIpv4("256.1.1.1").valid).toBe(false);
      expect(validateIpv4("1.1.1.256").valid).toBe(false);
    });

    it("rejects too few octets", () => {
      expect(validateIpv4("1.2.3").valid).toBe(false);
    });

    it("rejects too many octets", () => {
      expect(validateIpv4("1.2.3.4.5").valid).toBe(false);
    });

    it("rejects non-numeric", () => {
      expect(validateIpv4("a.b.c.d").valid).toBe(false);
    });

    it("rejects IPv6", () => {
      expect(validateIpv4("::1").valid).toBe(false);
      expect(validateIpv4("2001:db8::1").valid).toBe(false);
    });

    it("rejects trailing/leading spaces in octets", () => {
      expect(validateIpv4("1. 2.3.4").valid).toBe(false);
    });

    it("rejects leading zeros in octets", () => {
      expect(validateIpv4("01.2.3.4").valid).toBe(false);
      expect(validateIpv4("1.02.3.4").valid).toBe(false);
      expect(validateIpv4("1.2.003.4").valid).toBe(false);
    });
  });

  describe("private and reserved ranges", () => {
    it.each([
      ["0.0.0.0", "current network"],
      ["0.1.2.3", "current network"],
      ["10.0.0.1", "private (10/8)"],
      ["10.255.255.255", "private (10/8)"],
      ["127.0.0.1", "loopback"],
      ["127.255.255.255", "loopback"],
      ["169.254.1.1", "link-local"],
      ["172.16.0.1", "private (172.16/12)"],
      ["172.31.255.255", "private (172.16/12)"],
      ["192.168.0.1", "private (192.168/16)"],
      ["192.168.255.255", "private (192.168/16)"],
      ["100.64.0.1", "CGNAT"],
      ["100.127.255.255", "CGNAT"],
      ["224.0.0.1", "multicast"],
      ["240.0.0.1", "reserved"],
      ["255.255.255.255", "broadcast"],
    ])("rejects %s (%s)", (ip) => {
      const result = validateIpv4(ip);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/public/i);
    });

    it("accepts 172.15.0.1 (just below private range)", () => {
      expect(validateIpv4("172.15.0.1")).toEqual({ valid: true });
    });

    it("accepts 172.32.0.1 (just above private range)", () => {
      expect(validateIpv4("172.32.0.1")).toEqual({ valid: true });
    });

    it("accepts 100.63.255.255 (just below CGNAT range)", () => {
      expect(validateIpv4("100.63.255.255")).toEqual({ valid: true });
    });

    it("accepts 100.128.0.1 (just above CGNAT range)", () => {
      expect(validateIpv4("100.128.0.1")).toEqual({ valid: true });
    });
  });

  it("trims surrounding whitespace", () => {
    expect(validateIpv4("  1.2.3.4  ")).toEqual({ valid: true });
  });
});
