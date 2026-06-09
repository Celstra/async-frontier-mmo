# Lesson 04 — Demo pilot / open thumper (replace global latest)

> **Exercise:** Scope thumper state to one hardcoded demo pilot. Query the pilot’s **open** run (`claimed_at IS NULL`), not the latest row globally. Block a second deploy while one is open.

**Prerequisite:** Lesson 03 complete (idempotent claim at DB + server action).

**Out of scope:** Auth, multiplayer, resources, crafting, new UI screens.

---

## 1. Why global latest-event state is dangerous

Today the scaffold does this:

```typescript
getLatestThumperEvent(db)  // ORDER BY deployed_at DESC LIMIT 1
```

That answers: **“What is the newest row in the table?”**

It does **not** answer: **“What is *my* current thumper run?”**

Problems that appear as soon as you have more than one player — or even one player with history:

| Scenario | Global latest behavior | What we want |
|----------|------------------------|--------------|
| Pilot A deploys, Pilot B deploys | B sees A’s thumper (or vice versa) | Each pilot sees only their open run |
| Pilot claims run #1, deploys run #2 | Latest row is correct by accident | Open run for pilot — claimed rows are history |
| Old unclaimed row exists in DB | Might surface a stale run | Only unclaimed run for this pilot |
| Load uses latest; claim uses latest | Works in solo demo | Wrong ownership model for MVP |

```text
Global latest:   thumper_events  →  newest row wins
Pilot open run:  pilot_id + claimed_at IS NULL  →  my active/claimable run
```

Lesson 03 fixed **double claim**. This lesson fixes **whose thumper** — the minimum step before resource rewards attach to a pilot.

---

## 2. Why a hardcoded demo pilot is okay before auth

MVP needs **pilot ownership** (`MVP_SCOPE_REFERENCE.md` audit spine lists Pilot). Real auth (sessions, accounts) comes later.

For the learning scaffold we use one constant:

```typescript
export const DEMO_PILOT_ID = 'demo-pilot';
```

Why this is fine now:

- **Same server-authoritative pattern** — actions pass a pilot id into queries; auth later swaps “hardcoded constant” for “pilot id from session”.
- **No fake multiplayer** — one pilot, one browser; we are not simulating two users.
- **Schema habit** — `pilot_id` column exists from day one; no painful migration when rewards land.
- **Teaches the right query** — `getOpenThumperForPilot`, not `getLatestThumperEvent`.

Auth replaces *how we get* `pilotId`, not *what we do with* it.

---

## 3. What query we actually want

**Open run** = thumper event for a pilot where `claimed_at IS NULL`.

```sql
SELECT *
FROM thumper_events
WHERE pilot_id = $1
  AND claimed_at IS NULL
LIMIT 1;
```

Optional DB guard (recommended): partial unique index so Postgres rejects a second open run:

```sql
CREATE UNIQUE INDEX thumper_events_one_open_per_pilot
  ON thumper_events (pilot_id)
  WHERE claimed_at IS NULL;
```

Deploy flow becomes:

```text
getOpenThumperForPilot(demoPilotId)
  → if row exists → fail(400) "already have open thumper"
  → else insert with pilot_id
```

Load / claim flow:

```text
getOpenThumperForPilot(demoPilotId)
  → if null → no thumper UI
  → else resolveThumperState → active / claimable
```

Claim still uses idempotent `claimThumperEvent` from lesson 03.

---

## 4. Migration / schema / query changes needed

### Schema — `packages/db/src/schema/thumperEvents.ts`

Add a non-null text column:

```typescript
pilotId: text('pilot_id').notNull(),
```

### Migration — `packages/db/drizzle/0002_add_pilot_id.sql` (new)

Roughly:

1. `ADD COLUMN pilot_id text` (nullable first if backfilling existing rows).
2. `UPDATE thumper_events SET pilot_id = 'demo-pilot' WHERE pilot_id IS NULL`.
3. `ALTER COLUMN pilot_id SET NOT NULL`.
4. **Close stale open rows** from pre-pilot dev data — keep only the newest unclaimed row per `pilot_id`, set `claimed_at` on the rest (otherwise the unique index fails).
5. `CREATE UNIQUE INDEX … WHERE claimed_at IS NULL`.

Run `pnpm --filter @async-frontier-mmo/db db:generate` / `db:migrate` after schema edit.

**If migrate fails on the unique index:** old dev data may have several unclaimed rows (from the global-latest era). Migration step 4 closes stale open runs, keeping only the newest per `pilot_id`. Re-run `db:migrate` after pulling the fixed `0002_add_pilot_id.sql`.

### Shared constant — `packages/shared/src/index.ts`

```typescript
export const DEMO_PILOT_ID = 'demo-pilot';
```

### Queries — `packages/db/src/queries/thumperEvents.ts`

| Function | Change |
|----------|--------|
| `getLatestThumperEvent` | **Remove** (or stop exporting) |
| `getOpenThumperForPilot(db, pilotId)` | **Add** — `WHERE pilot_id = ? AND claimed_at IS NULL` |
| `insertThumperEvent` | **Add** `pilotId` to input |
| `claimThumperEvent` | Unchanged |

### Web — `apps/web/src/routes/+page.server.ts`

- Import `DEMO_PILOT_ID` from `shared`.
- `load` / `claim` → `getOpenThumperForPilot(db, DEMO_PILOT_ID)`.
- `deploy` → check open run first; `fail(400)` if one exists; insert with `pilotId: DEMO_PILOT_ID`.

### Exports — `packages/db/src/index.ts`

Export `getOpenThumperForPilot`; drop `getLatestThumperEvent`.

Domain (`resolveThumperState`) — **no change** (still pure timer math).

---

## 5. What test or smoke check proves this works

### Automated

```bash
pnpm check
pnpm --filter @async-frontier-mmo/domain test   # unchanged
pnpm --filter @async-frontier-mmo/db db:smoke   # update script
pnpm --filter web build
```

### Extend `packages/db/scripts/smoke.ts`

Prove the invariant at the DB layer:

1. Insert open thumper for `DEMO_PILOT_ID`.
2. `getOpenThumperForPilot` returns that row.
3. Second insert with same pilot (or deploy via app) should fail — unique index or app guard.
4. Claim sets `claimed_at` → `getOpenThumperForPilot` returns `null`.
5. New deploy after claim succeeds.

### Manual (browser)

1. Deploy → dev note shows active thumper.
2. Deploy again → error (open thumper exists).
3. Wait / claim → claimed.
4. Deploy again → succeeds (no open run).

---

## 6. Predict which files change

Before editing, list every file you expect to touch and why.

Hints:

- Where is `getLatestThumperEvent` called today?
- Where should `DEMO_PILOT_ID` live so web and smoke share it?
- Does domain need edits, or only db + web?
- What new file appears under `packages/db/drizzle/`?

Reply in chat with your file list. The coach will confirm, apply minimal edits, run checks, and update lesson 03’s “next exercise” pointer if needed.

---

## 7. Apply + verify (coach step)

After your prediction:

1. Add `DEMO_PILOT_ID` to `shared`.
2. Schema + migration + queries.
3. Wire `+page.server.ts` deploy guard.
4. Update smoke script.
5. Run verification commands above.

---

## Recap checklist

- [ ] No more `getLatestThumperEvent` in app code
- [ ] `pilot_id` on `thumper_events`; existing rows backfilled
- [ ] At most one open run per pilot (index or guard)
- [ ] Deploy blocked while open run exists
- [ ] `pnpm check` + smoke pass

**Next exercise:** [Lesson 05 — Red Mesa resource definitions](05-red-mesa-resource-definitions.md) — six locked resources in `packages/domain`, TDD documentation tests, no DB yet.
