# CLAUDE.md -- TwineLine.ai (the marketing site)

Read this before any deploy, branch, or file-removal work in this repo.

## !! NEVER DEPLOY OR PROMOTE `archive/pre-saas` !!

Renamed from `master` on 2026-08-29, precisely so nobody reaches for it by
reflex. GitHub keeps a redirect from the old name, so `master` still
resolves -- the hazard did not go away, it just got a name that says so.

It contains **only** `src/pages/guide.astro` and `src/pages/index.astro`.
It has **no API routes at all**. Deploying it to production would delete the
Google OAuth broker (below) and break Google Takeout imports for every user.

This is a live footgun because `.github/workflows/deploy.yml` triggers on
`branches: ['**']` -- every branch that is pushed gets deployed. Whether a
deploy becomes *production* depends on which branch the Cloudflare Pages
project calls production, which is a dashboard setting not visible in this
repo.

It is roughly 20 commits behind and predates the SaaS pivot. Treat it as
abandoned. If you are wondering whether to merge or promote it: no.

Note the rename does NOT disarm the CI: a push to `archive/pre-saas` still
builds and deploys it. The name is a guardrail, not a lock.

## THE ONE THING THIS SITE MUST KEEP SERVING

    src/pages/api/auth/google/{start,callback,poll,refresh}.ts

This is **live production infrastructure**, not marketing. The backend in the
sibling repo hardcodes it:

* `TwineLineFire/app/google_oauth.py` -> `https://twineline.ai/api/auth/google/refresh`
* `TwineLineFire/app/api/importers.py` -> `{RELAY_BASE}/api/auth/google/start`
  and `/poll`, where `RELAY_BASE = "https://twineline.ai"`

That broker carries every Google Takeout import. If a deploy removes it, the
failure is **silent and delayed**: nothing breaks at deploy time, and then
users' imports stop when a token next needs refreshing.

**Check after every production deploy:**

    curl -s -o /dev/null -w "%{http_code}\n" https://twineline.ai/api/auth/google/start

**400 is correct** (it is rejecting a request with no session parameter).
**404 means you have broken imports for every user.**

The long-term fix is to move this broker into FastAPI -- it is fold F2 of
`TwineLineFire/docs/plans/app-website-surface-split.md`, not yet done. Until
then, this repo is a hard dependency of the backend's import path.

## Branches

* `preview` -- the full working site. Active development happens here.
* `holding` -- the production holding page. Deliberately minimal: one page
  plus the API routes. Promote THIS to production.
* `archive/pre-saas` -- abandoned, dangerous. See above. Was `master` until
  2026-08-29; the repo default is now `preview`.

## Other endpoints, less critical but check before removing

`src/pages/api/register.ts`, `api/check/[username].ts`,
`api/connect/[username].ts`, `releases/[...path].ts`. Measured 2026-08-29:
all four return 404 on live production, so nothing currently depends on them
being served from here -- but `TwineLineFire/scripts/deploy_apex_worker.py`
reasons about an apex Worker's `/api/register` shadowing this site's, so
confirm before assuming they are dead.

## Working in this repo

* `npm run lint` is `prettier --check` + `astro check`. There is one
  PRE-EXISTING `astro check` error in `src/pages/releases/[...path].ts` (a
  Cloudflare workers-types vs DOM `ReadableStream` mismatch). Do not claim
  you introduced it, and do not claim lint is clean without saying so.
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
