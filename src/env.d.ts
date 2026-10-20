/// <reference types="astro/client" />

import type { CacheStorage as CloudflareCacheStorage } from "@cloudflare/workers-types";

// No bindings or secrets since the Google relay and the self-hosted-era
// endpoints were retired (2026-10-20); the page is static.
type CloudflareEnv = Record<string, never>;

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: CloudflareEnv;
        caches: CloudflareCacheStorage;
        cf: unknown;
        ctx: { waitUntil(promise: Promise<unknown>): void };
      };
    }
  }
}
