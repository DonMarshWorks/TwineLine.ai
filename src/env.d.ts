/// <reference types="astro/client" />

import type {
  CacheStorage as CloudflareCacheStorage,
  KVNamespace,
  R2Bucket,
} from "@cloudflare/workers-types";

type CloudflareEnv = {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  PHONEBOOK_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_AUTH_KV: KVNamespace;
  RELEASES: R2Bucket;
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
