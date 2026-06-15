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
| `pnpm --filter web smoke:browser:craft-reveal` | Fabricator craft reveal path — **fails fast** if `DATABASE_URL` is unset |
| `pnpm --filter web smoke:browser:gate` | Layout + path + craft reveal — **fails fast** if `DATABASE_URL` is unset (release gate; runs **serially**, one worker) |

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

## What craft-reveal smoke covers

`craft-reveal.smoke.spec.ts` (project `chromium-craft-reveal`) walks:

1. Seeded pilot with fabricator unlocked and scanner materials in inventory
2. Workshop slot picks via stable `data-testid` hooks (`workshop-stack-{slotId}-{slug}`)
3. Tuning + experiment craft → frozen `CraftResultReveal` overlay
4. Compare for RIG → Keep current → Craft another dismisses reveal

Requires `DATABASE_URL`. Uses `deleteAllSmokePilotData` for teardown (all pilot FK tables).

## Playwright project layout

| Project | Specs | DB |
|---------|-------|-----|
| `chromium` | Layout smoke | No |
| `mobile` | Layout smoke (Pixel 7) | No |
| `chromium-path` | `first-session-path.smoke.spec.ts` | Yes |
| `chromium-craft-reveal` | `craft-reveal.smoke.spec.ts` | Yes |

DB smokes run in a **dedicated project** (not mobile) so layout and timing stay predictable.

## Smoke test conventions

- **Pilot cookie:** `seedPilotCookie(context, pilotId, baseURL)` — always pass Playwright's `baseURL` fixture so the cookie matches the dev server port.
- **Slot selection:** prefer `data-testid="workshop-stack-{slotId}-{resourceSlug}"` and assert `aria-pressed="true"` plus hidden `input[name="slot_{slotId}"]` value — not CSS `.selected` alone.
- **Hydration:** wait for `.workshop-bench[data-workshop-ready]` (set in `WorkshopBench` `onMount`) before clicking slot cards — SSR renders the bench before Svelte attaches handlers.
- **Cleanup:** use `cleanupScannerCraftPilotForSmoke` / `deleteAllSmokePilotData` from `@async-frontier-mmo/db` — do not delete pilots inline in web tests.

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
