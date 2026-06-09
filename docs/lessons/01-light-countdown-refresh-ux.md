# Lesson 01 — Light countdown refresh UX

> **Exercise:** Add a client-side countdown display for an active thumper, then refresh server data when the timer hits zero so the Claim button can appear — without WebSockets, SSE, cron, or `packages/jobs`.

**Prerequisite:** Deploy + claim + Postgres persistence working (`pnpm db:smoke` passes).

---

## 1. Why the server is still the source of truth

Today your page already follows the right pattern:

```text
load / action  →  read/write Postgres  →  resolveThumperState (domain)  →  return { thumperDemo }
```

The server decides:

- whether a thumper exists
- whether it is `active` or `claimable`
- whether a claim is allowed (`claim` action + `fail(400)` if too early)

The browser only **displays** what the server last said. That does not change in this exercise.

**Rule:** Never let the client countdown *become* the authority (“I think it’s claimable, so skip the server check”). The **Claim** button can appear when the UI *predicts* claimability, but `actions.claim` must still call `resolveThumperState` with server `now` before updating `claimed_at`.

---

## 2. Why client countdown is only presentation

A countdown timer in the browser is a **convenience**:

- avoids manual refresh every few seconds while a thumper is `active`
- makes the page feel alive

It is **not** game state.

```text
Server (authoritative):  deployed_at + duration_seconds + now  →  status, secondsRemaining
Client (cosmetic):       tick display down from last server snapshot until next refresh
```

If the user’s clock is wrong, or they leave the tab backgrounded, the client display may drift. That is acceptable **as long as** we re-fetch from the server when the countdown hits zero (and claim still validates on the server).

We will **not** run `resolveThumperState` in the browser for real gameplay — we only animate a number between server refreshes.

---

## 3. Why jobs are premature right now

`packages/jobs` is for **server-side work on a schedule or queue**, for example:

- rotating resource spawns
- resolving thumper timeouts if nobody visits the site
- cleanup tasks

For **one player watching their own thumper page**, you do not need a background worker:

| Approach | When it fits |
|----------|----------------|
| **Client tick + `invalidateAll()`** | User has the page open; refresh load when timer hits 0 |
| **Postgres jobs / cron** | Work must happen when nobody is on the site |

Jobs add process management, locking, and failure modes. Your design docs say: avoid per-second server simulation and avoid realtime until proven necessary. A light poll/refresh on the page you already have is enough for this vertical slice.

---

## 4. What file(s) will change

| File | Change |
|------|--------|
| `apps/web/src/routes/+page.server.ts` | Return a small extra field from `load` / deploy action — e.g. `loadedAt` (ISO string) so the client knows when the server computed `secondsRemaining` |
| `apps/web/src/routes/+page.svelte` | While `thumperDemo.status === 'active'`: run a 1s interval, decrement displayed seconds, call `invalidateAll()` when display reaches 0 |

**Not changing:**

- `packages/domain` — math stays pure
- `packages/db` — no new columns
- `packages/jobs` — not created
- `actions.claim` — still enforces eligibility server-side

Optional later (not this step): extract a tiny `$lib/thumperCountdown.svelte` — only if the page file gets hard to read.

---

## 5. Behavior before and after

### Before (today)

1. Deploy → server returns `active`, e.g. `60s remaining`
2. Dev line shows `60s remaining` until you **manually refresh**
3. After duration passes, manual refresh shows `claimable` and the Claim button
4. Claim → server validates → `claimed_at` set

**Pain:** stale UI while waiting; easy to forget to refresh.

### After (this exercise)

1. Deploy → server returns `active`, `60s remaining`, `loadedAt`
2. UI ticks `59, 58, 57…` locally (presentation only)
3. When display hits `0` → `invalidateAll()` → `load` runs again
4. Server returns `claimable` → Claim button appears
5. Claim early (tamper with UI or click fast) → server still returns `fail(400)` if not claimable

**Important:** If `invalidateAll()` is slow, the user might see `0` for a second — that is fine. The server refresh is the truth moment.

---

## 6. Quiz

Answer in chat before we edit code. Number your answers `1–4`.

**Q1.** Who decides whether a thumper is `claimable` — the browser countdown or the server `claim` action?

**Q2.** What SvelteKit API will we use to re-run `load` when the client countdown reaches zero (without WebSockets)?

**Q3.** Why are we **not** adding `packages/jobs` for this exercise?

**Q4.** What should happen if a user clicks **Claim** while the thumper is still `active` according to the server?

---

## Next step

Reply with quiz answers. I will review them, show the exact intended code, then ask whether you want to type it yourself or have me apply it.

**Do not say `go` until you are ready for implementation.**
