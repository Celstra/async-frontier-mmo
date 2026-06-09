# Lesson 07 — Thumper run data shape (plan only)

> **Exercise:** Compare today's `thumper_events` demo row to the MVP **Thumper Run** audit record. Decide the smallest schema step that ties a personal deploy to one target resource signal — without event windows, jobs, or group thumpers yet.

**Prerequisite:** Lessons 04–06 complete (`pilot_id` + open-run query, six Red Mesa resources in domain, `surveyRedMesaFirstSession()`).

**Out of scope (this lesson):** `thumper_event_windows` table, `thumper_run_results` table, economy ledger, resource stacks, equipped Drill/Pump/Hull item refs, run mode, visible run-state JSON, bloom `resource_instance` rows, workers/jobs, group thumpers, claim rewards.

**Learning goal:** Understand why the demo timer table is not yet a Thumper Run — and what one column (target resource) buys you before complications land.

---

## 1. Timer row vs audit run — vocabulary

Two ideas get conflated when the table is called `thumper_events`:

| Concept | What it is | Where it lives today |
|---------|------------|----------------------|
| **Thumper timer** | Pure math: given `deployed_at`, `duration_seconds`, and `now`, is the run still ticking or ready to claim? | `packages/domain` → `resolveThumperState()` |
| **Thumper run** | Durable server record: *who* deployed, *what signal* they targeted, *when*, and whether it is still open or finished | `packages/db` → `thumper_events` table (demo name) |

```text
Timer (domain):   deployed_at + duration  →  active | claimable
Run (database):   pilot + target + timing + claimed_at  →  open history the server trusts
```

The timer answers **"is claim allowed right now?"**
The run answers **"what deployment is this pilot allowed to claim, and what was it for?"**

Lesson 03–04 taught run **ownership** and **idempotent claim**. This lesson adds run **intent** (target resource) so claim can eventually grant the right named resource.

---

## 2. Current `thumper_events` fields

Schema today (`packages/db/src/schema/thumperEvents.ts`):

| Column | Type | Role |
|--------|------|------|
| `id` | `uuid` PK | Stable run identity for claim idempotency |
| `pilot_id` | `text` NOT NULL | Owner (`DEMO_PILOT_ID` = `'demo-pilot'`) — Lesson 04 |
| `deployed_at` | `timestamptz` NOT NULL | Run start (server timestamp) |
| `duration_seconds` | `integer` NOT NULL | Fixed timer length (demo: 60s) |
| `claimed_at` | `timestamptz` NULL | NULL = open run; set once on claim — Lesson 03 |

Queries in use:

- `getOpenThumperForPilot` — `pilot_id` + `claimed_at IS NULL`
- `insertThumperEvent` — insert with pilot + timing
- `claimThumperEvent` — atomic update where `claimed_at IS NULL`
- Partial unique index `thumper_events_one_open_per_pilot` — at most one open run per pilot

What this row **can** represent: a personal async countdown with claim gate.
What it **cannot** represent yet: which Red Mesa signal the player chose at deploy.

---

## 3. MVP audit spine — what surrounds a Thumper Run

Decision 012 / `MVP_SCOPE_REFERENCE.md` lists eleven authoritative records. Thumper-related ones:

| MVP record | Purpose | In scaffold today? |
|------------|---------|-------------------|
| **Pilot** | Player identity + frame | Implicit via `DEMO_PILOT_ID` constant (no `pilots` table) |
| **Resource Instance** | Named resource in a bloom, immutable stats | Domain catalog only (`RED_MESA_BLOOM_RESOURCES`) — no DB row |
| **Resource Stack** | Pilot-owned quantity of an instance | Not yet |
| **Thumper Run** | Target resource, equipped parts, run mode, visible state, timing | **Partial** — timing + pilot only |
| **Thumper Event Window** | Each complication, player response, before/after state | Not yet |
| **Thumper Run Result** | Final payout, waste, wear, damage, salvage explanation | Not yet |
| **Economy Ledger** | Append-only mutation log | Not yet |

Full **Thumper Run** (design intent):

```text
Thumper Run
  ├── pilot_id
  ├── target (resource instance or named signal)
  ├── equipped drill / pump / hull (item refs)
  ├── run_mode (default vs push — later)
  ├── visible_state (Projected Recovery, Signal Lock, … — later)
  ├── timing (deployed_at, duration or ends_at)
  └── status lifecycle (in progress → awaiting claim → claimed / recalled)
```

Full MVP loop (later lessons):

```text
deploy run  →  2–3 event windows  →  resolve  →  claim  →  Thumper Run Result  →  ledger grants stack
```

This lesson stops after the run row knows **which resource signal** it targets.

---

## 4. Field-by-field gap analysis

| Concern | `thumper_events` today | MVP Thumper Run | This lesson |
|---------|------------------------|-----------------|-------------|
| Run identity | `id` | `id` | Keep |
| Owner | `pilot_id` | `pilot_id` | Keep (`DEMO_PILOT_ID`) |
| Start time | `deployed_at` | `deployed_at` | Keep |
| Duration | `duration_seconds` | same (or `ends_at` later) | Keep |
| Finished? | `claimed_at` | claimed / recalled terminal state | Keep `claimed_at` for now |
| Target signal | **missing** | `target_resource_id` or `resource_instance_id` | **Add** `target_resource_id` |
| Equipped parts | **missing** | drill/pump/hull item FKs | Defer |
| Run mode | **missing** | default / push | Defer |
| Visible state | **missing** | five run-state meters (JSON or columns) | Defer |
| Complications | **missing** | `thumper_event_windows` child rows | Defer (name next step only) |
| Payout audit | **missing** | `thumper_run_results` + ledger | Defer |
| Table name | `thumper_events` (misleading) | `thumper_runs` | Optional rename in implementation |

**Why not jump straight to `resource_instance_id`?**
Bloom rotation and `resource_instances` tables are a later lesson. For the first-session tutorial, the player compares three **named** signals (Keth / Veyrith / Thornwake) and deploys on one. Storing `target_resource_id` as a `NamedResourceId` text code (`'veyrith_copper'`) matches domain types and survey output. When bloom DB rows exist, deploy can snapshot `resource_instance_id` *and* keep the named id for display — not required for this step.

---

## 5. Recommended minimal schema shape (next implementation)

### Table: `thumper_runs` (preferred) or evolved `thumper_events`

Rename is optional but recommended — "events" will mean **event windows** in MVP vocabulary.

```typescript
// packages/db/src/schema/thumperRuns.ts (conceptual)
export const thumperRuns = pgTable('thumper_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  pilotId: text('pilot_id').notNull(),
  targetResourceId: text('target_resource_id').notNull(), // NamedResourceId from domain
  deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true })
});
```

### Constraints to preserve

```sql
-- Same invariant as Lesson 04
CREATE UNIQUE INDEX thumper_runs_one_open_per_pilot
  ON thumper_runs (pilot_id)
  WHERE claimed_at IS NULL;
```

### Validation rule (app layer)

`target_resource_id` must be one of the six locked `NamedResourceId` values from `packages/domain`. First-session deploy will likely pass `'veyrith_copper'` from survey recommendation; later, deploy form sends the player's choice.

### What stays in domain (unchanged)

`resolveThumperState({ deployedAt, durationSeconds, now })` — no DB columns for `active` / `claimable`; still computed.

### Demo pilot

Keep `DEMO_PILOT_ID` from `packages/shared`. Auth later replaces *how* you get `pilotId`, not the column.

---

## 6. Migration sketch (when you implement — not now)

1. **Rename table** `thumper_events` → `thumper_runs` (Drizzle migration + query renames), *or* add column first and rename in a follow-up migration.
2. **Add column** `target_resource_id text`.
3. **Backfill** existing rows: `UPDATE thumper_runs SET target_resource_id = 'veyrith_copper' WHERE target_resource_id IS NULL`.
4. **Set NOT NULL** on `target_resource_id`.
5. **Re-create** partial unique index on new table name if renamed.
6. **Update** `insertThumperRun` input: `{ pilotId, targetResourceId, deployedAt, durationSeconds }`.
7. **Update** deploy action: require `targetResourceId` (form field or constant for first wire-up).
8. **Update** smoke script: assert inserted row carries expected `target_resource_id`.

No change to claim idempotency pattern.

---

## 7. What we are explicitly deferring

| Deferred | Why wait |
|----------|----------|
| `thumper_event_windows` | Needs complication generation, player responses, before/after snapshots |
| `thumper_run_results` | Needs resolution math (recovery, waste, wear) |
| Economy ledger + resource stacks | Claim must grant quantities; run result explains why |
| Drill / Pump / Hull item FKs | Needs `items` table and equip flow |
| `run_mode`, visible state JSON | Needs event resolution and UI meters |
| `resource_instance_id` FK | Needs bloom persistence lesson |
| Jobs / workers | MVP resolves from timestamps + claim action; no per-second ticks |
| Group thumpers | Personal thumper only for MVP |

---

## 8. Tiny next step after this plan (Lesson 07 implementation)

One vertical slice — still no rewards, no event windows:

```text
surveyRedMesaFirstSession()  →  UI shows 3 signals
deploy form posts targetResourceId (start with hidden field or constant 'veyrith_copper')
insertThumperRun(..., targetResourceId)
load shows open run + target display name from getRedMesaResource(targetResourceId)
claim unchanged (idempotent, no inventory)
```

Optional stretch (same lesson, still small): deploy form lets player pick among the three first-session signals; server validates id ∈ allowed set.

**Not** in this slice: generating Signal Drift / Pump Strain windows.

---

## 9. Likely Q&A before editing code

### 1. What is the difference between a thumper timer and a thumper run?

The timer is pure math in `packages/domain`: given `deployedAt`, `durationSeconds`, and `now`, it returns active vs claimable. The run is the durable database record the server trusts: pilot, target resource, timing, and claim status.

### 2. Why does the target resource belong on the run?

The first-session path is survey → choose a signal → deploy → claim → craft. If the run is only an anonymous 60-second timer, claim cannot know whether to grant Veyrith Copper, Keth Iron, or Thornwake Crystal later. Storing `target_resource_id` ties the player's deploy choice to the eventual result without adding inventory yet.

### 3. Why do choices/results need audit records later?

Resource rewards must be explainable and replay-safe. Event windows, player responses, final yield/waste/wear, and ledger rows answer “where did this Veyrith Copper come from?” and protect the economy from duplicate or unaudited mutations.

---

## 10. Expected files for the implementation lesson

The minimal implementation should touch:

- `packages/db/src/schema/thumperRuns.ts` — rename the schema module and add `targetResourceId`.
- `packages/db/src/queries/thumperRuns.ts` — rename query helpers and require `targetResourceId` on insert.
- `packages/db/drizzle/0003_thumper_runs_target_resource.sql` plus generated metadata — migrate existing local rows safely.
- `packages/db/src/index.ts` — export the renamed schema/query helpers.
- `packages/db/scripts/smoke.ts` — assert target-resource persistence and one-open-run invariant.
- `apps/web/src/routes/+page.server.ts` — validate posted `targetResourceId`, insert the target, and return target display data.
- `apps/web/src/routes/+page.svelte` — display survey signals and submit the selected target resource.

`resolveThumperState` does not need behavior changes because timer state is still derived from timing fields only.

---

## Recap checklist

- [x] Run row stores `target_resource_id` (`NamedResourceId` text)
- [x] `pilot_id` + open-run query + one-open-per-pilot index unchanged
- [x] `deployed_at`, `duration_seconds`, `claimed_at` unchanged semantics
- [x] Table renamed `thumper_events` → `thumper_runs`
- [x] Deploy passes validated target; load can show target display name
- [x] No event windows, jobs, group thumpers, or claim rewards yet
- [x] `pnpm check` + db smoke pass

**Next exercise (after this lands):** Claim grants a fixed quantity of the target resource into a minimal `resource_stacks` + ledger row — still no event windows.
