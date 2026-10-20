# CLAUDE.md -- TwineLine.ai (the marketing site)

Read this before any deploy, branch, or file-removal work in this repo.

## !! NEVER DEPLOY OR PROMOTE `archive/pre-saas` !!

Renamed from `master` on 2026-08-29, precisely so nobody reaches for it by
reflex. GitHub keeps a redirect from the old name, so `master` still
resolves -- the hazard did not go away, it just got a name that says so.

It contains **only** `src/pages/guide.astro` and `src/pages/index.astro`.
It has **no API routes at all** and predates everything since. (It used to
matter most because deploying it removed the Google OAuth relay; that relay
is retired, but the branch is still stale and must not be promoted.)

This is a live footgun because `.github/workflows/deploy.yml` triggers on
`branches: ['**']` -- every branch that is pushed gets deployed. Whether a
deploy becomes *production* depends on which branch the Cloudflare Pages
project calls production, which is a dashboard setting not visible in this
repo.

It is roughly 20 commits behind and predates the SaaS pivot. Treat it as
abandoned. If you are wondering whether to merge or promote it: no.

Note the rename does NOT disarm the CI: a push to `archive/pre-saas` still
builds and deploys it. The name is a guardrail, not a lock.

## The Google OAuth relay is RETIRED (2026-10-20)

`src/pages/api/auth/google/{start,callback,poll,refresh}.ts` used to be
live infrastructure: the backend's server-side Google Takeout import
signed in through it. That import was retired (TwineLineFire
`docs/plans/retire-server-imports.md`; the browser extension is the only
Google path), the backend no longer calls it, and the routes, the
`GOOGLE_AUTH_KV` binding and the `GOOGLE_CLIENT_*` secrets were removed.
Do not bring them back.

**Check after every production deploy:**

    curl -s https://twineline.ai/api/auth/google/start | head -c 60

**The holding page's HTML (`<!DOCTYPE html>`, status 200) is correct now**:
the site answers every unknown path with the page, so a retired route looks
like any other. A 400 or JSON there would mean the relay came back.

## Branches

* `preview` -- the full working site. Active development happens here.
* `holding` -- the production holding page. Deliberately minimal: one page
  plus the API routes. Promote THIS to production.
* `archive/pre-saas` -- abandoned, dangerous. See above. Was `master` until
  2026-08-29; the repo default is now `preview`.

## Retired endpoints (2026-10-20)

The self-hosted era's phonebook (`/api/register`, `/api/check/[username]`,
`/api/connect/[username]`: DNS records for each customer's own server) and
the desktop-app downloads (`/releases/...`, `public/install.{ps1,sh}`) were
removed from this branch with their helpers, the `RELEASES` R2 binding and
the `CLOUDFLARE_*` / `PHONEBOOK_API_KEY` types. Nothing in TwineLine calls
them (TwineLineFire's `web_access` / `cloud_dns` / `tunnel_manager` are gone).
`/api/register` could create DNS records for any `*.twineline.ai` name, so do
not bring it back. `preview` still carries them (its old self-hosted pages
use them); without the secrets they refuse every request.

## Working in this repo

* `npm run lint` is `prettier --check` + `astro check`. On this branch
  `astro check` is clean (its one old error went with
  `src/pages/releases/[...path].ts`). `prettier --check` still flags files
  that predate it, CLAUDE.md and wrangler.jsonc among them.
* `npm test` -- 124 vitest tests.
* `astro preview` does NOT work: the Cloudflare adapter refuses it. To run a
  build the way production runs it, use
  `npx wrangler pages dev dist --port 4321 --compatibility-date=2025-01-01`.
* The site is `output: 'static'` by default; pages needing per-request logic
  must opt in with `export const prerender = false`, which costs them their
  cached-artifact status.

## Concurrent sessions

Another session may have uncommitted edits in this working tree. Commit only
your own files, by explicit pathspec. **Do not run `git checkout --` on files
you did not modify** -- uncommitted changes are shared across branches, not
per-branch, and discarding them is unrecoverable. This has already destroyed
someone's work once (2026-08-29).
