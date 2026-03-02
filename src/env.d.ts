/// <reference types="astro/client" />

import type { CacheStorage as CloudflareCacheStorage } from "@cloudflare/workers-types";

type CloudflareEnv = {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  PHONEBOOK_API_KEY: string;
};

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
