import { describe, it, expect } from "vitest";
import { buildAuthUrl } from "./google-auth";

describe("buildAuthUrl", () => {
  it("builds a valid Google OAuth URL", () => {
    const url = buildAuthUrl(
      "test-client-id",
      "https://twineline.ai/api/auth/google/callback",
      "test-session-uuid",
    );

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://twineline.ai/api/auth/google/callback",
    );
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBe("test-session-uuid");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("scope")).toContain("drive");
    expect(parsed.searchParams.get("scope")).toContain("email");
  });
});
