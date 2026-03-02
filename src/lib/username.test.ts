import { describe, it, expect } from "vitest";
import { validateUsername } from "./username";

describe("validateUsername", () => {
  describe("valid usernames", () => {
    it.each(["alice", "bob123", "my-server", "a1b", "a".repeat(63)])(
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

    it("rejects 2-char username", () => {
      const result = validateUsername("ab");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least 3/);
    });

    it("accepts exactly 3 characters", () => {
      expect(validateUsername("abc")).toEqual({ valid: true });
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
      expect(validateUsername(undefined as unknown as string).valid).toBe(false);
    });

    it("trims whitespace", () => {
      expect(validateUsername("  alice  ")).toEqual({ valid: true });
    });
  });
});
