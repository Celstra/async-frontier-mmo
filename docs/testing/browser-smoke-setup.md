# Browser smoke setup

Playwright smoke lives in `apps/web/tests/`. Layout smoke needs Chromium only. Path smoke also needs **Postgres** (`DATABASE_URL`).

## One-time setup

From the repo root:

```bash
pnpm install
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter web smoke:browser:install
```

Copy `apps/web/.env.example` to `apps/web/.env` (or use `packages/db/.env`). Path and gate scripts load those files automatically; shell `export DATABASE_URL=...` still wins if set.

`smoke:browser:install` runs `playwright install chromium`. `global-setup` retries this if Chromium is missing, but CI and fresh clones should run the install step explicitly.

## Scripts

| Script | What it runs |
|--------|----------------|
| `pnpm --filter web smoke:browser` | Quick layout smoke only (`chromium` + `mobile`) — **no DB required** |
| `pnpm --filter web smoke:browser:path` | End-to-end first-session path — **fails fast** if `DATABASE_URL` is unset |
| `pnpm --filter web smoke:browser:gate` | Layout + path — **fails fast** if `DATABASE_URL` is unset (release gate; runs **serially**, one worker) |

Playwright `baseURL` and the smoke pilot cookie both use `http://127.0.0.1:5173` (override with `PLAYWRIGHT_BASE_URL`).

## Running path smoke

With Playwright starting the dev server (`apps/web/.env` is loaded automatically):

```bash
pnpm --filter web smoke:browser:path
```

Or with a dev server already running:

```bash
export DATABASE_URL=...
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173
pnpm --filter web smoke:browser:path
```

## What path smoke covers

`first-session-path.smoke.spec.ts` walks:

1. Prologue brief → highlighted next slice
2. **Both** foreman orders (sample + turn-in loops until each stack is complete)
3. Fabricator takeover dismiss → starter worn parts → rig assembly
4. Tutorial deploy → RIG active panel → claim (DB fast-forward for timers)
5. Recall / patch / second deploy / async 15m → `.reserve-notice` hull plate first copy

Path smoke resets shared Keth Iron deposit yields in `beforeAll` (spots drain across pilots). Restart `pnpm dev` if the server was running before pulling these changes.

## Domain-only gate

```bash
pnpm --filter web smoke:domain
```

Vitest `firstSessionGate` invariants — not a browser substitute.

## Refreshing tuning for Python sims

```bash
pnpm --filter @async-frontier-mmo/db exec tsx ../../design-docs/export_domain_tuning.ts
python design-docs/first_hull_path_sim.py
```
