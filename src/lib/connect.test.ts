import { describe, it, expect } from "vitest";
import { validateConnectUsername, buildConnectRedirectUrl } from "./connect";

describe("validateConnectUsername", () => {
  describe("valid usernames", () => {
    it.each(["don", "alice", "my-photos", "a1b2", "ab"])("accepts '%s'", (name) => {
      expect(validateConnectUsername(name)).toEqual({ valid: true });
    });

    it("accepts max length (63 chars)", () => {
      expect(validateConnectUsername("a".repeat(63))).toEqual({ valid: true });
    });

    it("normalizes uppercase", () => {
      expect(validateConnectUsername("DON")).toEqual({ valid: true });
    });

    it("trims whitespace", () => {
      expect(validateConnectUsername("  don  ")).toEqual({ valid: true });
    });

    it("accepts consecutive hyphens", () => {
      expect(validateConnectUsername("my--photos")).toEqual({ valid: true });
    });

    it("accepts all-numeric username", () => {
      expect(validateConnectUsername("1234")).toEqual({ valid: true });
    });

    it("accepts min length (2 chars)", () => {
      expect(validateConnectUsername("ab")).toEqual({ valid: true });
    });
  });

  describe("invalid usernames", () => {
    it("rejects empty string", () => {
      const result = validateConnectUsername("");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/required/i);
    });

    it("rejects single character", () => {
      expect(validateConnectUsername("a")).toEqual({
        valid: false,
        error: "Username must be at least 2 characters",
      });
    });

    it("rejects leading hyphen", () => {
      expect(validateConnectUsername("-don")).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects trailing hyphen", () => {
      expect(validateConnectUsername("don-")).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects dots", () => {
      expect(validateConnectUsername("a.b")).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects underscores", () => {
      expect(validateConnectUsername("a_b")).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects spaces in name", () => {
      expect(validateConnectUsername("a b")).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects too long (64 chars)", () => {
      expect(validateConnectUsername("a".repeat(64))).toEqual({
        valid: false,
        error: "Letters, numbers, and hyphens only (2-63 characters)",
      });
    });

    it("rejects whitespace-only input", () => {
      expect(validateConnectUsername("   ")).toEqual({
        valid: false,
        error: "Username is required",
      });
    });
  });

  describe("reserved names", () => {
    it.each([
      "www", "api", "app", "mail", "ftp", "admin", "dashboard", "status",
      "docs", "blog", "support", "help", "ns1", "ns2", "twineline", "connect",
    ])(
      "rejects reserved name '%s'",
      (name) => {
        expect(validateConnectUsername(name)).toEqual({
          valid: false,
          error: "This name is reserved",
        });
      },
    );

    it("rejects reserved names case-insensitively", () => {
      expect(validateConnectUsername("CONNECT")).toEqual({
        valid: false,
        error: "This name is reserved",
      });
    });
  });
});

describe("buildConnectRedirectUrl", () => {
  it("builds correct URL", () => {
    expect(buildConnectRedirectUrl("don")).toBe(
      "https://don.twineline.ai/firetv/",
    );
  });

  it("lowercases username", () => {
    expect(buildConnectRedirectUrl("DON")).toBe(
      "https://don.twineline.ai/firetv/",
    );
  });

  it("trims whitespace", () => {
    expect(buildConnectRedirectUrl("  don  ")).toBe(
      "https://don.twineline.ai/firetv/",
    );
  });

  it("handles hyphenated usernames", () => {
    expect(buildConnectRedirectUrl("my-photos")).toBe(
      "https://my-photos.twineline.ai/firetv/",
    );
  });
});
