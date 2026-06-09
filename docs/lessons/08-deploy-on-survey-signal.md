# Lesson 08 — Deploy on a Red Mesa survey signal

> **Exercise:** Wire the first-session survey into the deploy flow so the pilot deploys a thumper on a selected named resource signal. Store the target on the durable thumper run. No rewards, inventory, event windows, jobs, or scanner upgrades yet.

**Prerequisite:** Lessons 05–07 complete: Red Mesa resource catalog, deterministic first-session survey output, and the thumper-run data-shape plan.

**Out of scope:** resource stacks, economy ledger, claim rewards, thumper event windows, run result math, bloom rotation, resource instances, auth, jobs, WebSockets, group thumpers.

---

## 1. What changed

The app now connects this first-session path:

```text
survey Red Mesa
→ compare Keth Iron / Veyrith Copper / Thornwake Crystal
→ choose a signal
→ deploy a personal thumper on that target
```

The old scaffold stored only a generic timer row. The new shape stores a `target_resource_id` on `thumper_runs`, so the server knows what resource signal the run is for.

---

## 2. Why this is the right next step

The MVP path eventually needs claim to grant the target resource. Claim cannot do that safely if the run only says “a 60-second timer finished.” It must know what signal the player chose at deploy time.

This lesson adds exactly that durable intent:

```text
pilot_id + target_resource_id + deployed_at + duration_seconds + claimed_at
```

That is enough for later claim/reward work, but still avoids premature systems:

- no `resource_stacks`
- no ledger
- no event-window table
- no result math
- no background worker
- no auth or real pilot table

---

## 3. Expected files and responsibilities

| File | Responsibility |
|------|----------------|
| `packages/db/src/schema/thumperRuns.ts` | Renamed run schema with `targetResourceId` |
| `packages/db/src/queries/thumperRuns.ts` | Insert/open/latest/claim helpers for runs |
| `packages/db/drizzle/0003_thumper_runs_target_resource.sql` | Migrates `thumper_events` to `thumper_runs` and backfills target resource |
| `packages/db/drizzle/meta/_journal.json` | Tracks migration 0003 |
| `packages/db/drizzle/meta/0003_snapshot.json` | Drizzle schema snapshot after migration |
| `packages/db/src/index.ts` | Exports renamed run schema/query helpers |
| `packages/db/scripts/smoke.ts` | Verifies target persistence, one-open-run invariant, claim, and redeploy |
| `apps/web/src/routes/+page.server.ts` | Loads survey, validates deploy target, inserts target-specific run, claims idempotently |
| `apps/web/src/routes/+page.svelte` | Displays first-session signals and posts selected `targetResourceId` |

`packages/domain/src/thumper/resolveThumperState.ts` does not need behavior changes. Timer state is still derived from `deployedAt`, `durationSeconds`, and `now`.

---

## 4. Server flow

### Load

`load` now returns:

- `surveyRedMesaFirstSession()` output
- current open thumper run for `DEMO_PILOT_ID`
- resolved timer state for the open run
- target display data from `getRedMesaResource(run.targetResourceId)`

### Deploy

Deploy now:

1. Checks the demo pilot does not already have an open run.
2. Reads `targetResourceId` from the form.
3. Validates it against `RED_MESA_BLOOM_RESOURCES`.
4. Inserts a `thumper_runs` row with `pilotId`, `targetResourceId`, `deployedAt`, and `durationSeconds`.
5. Returns server-derived timer and target display data.

### Claim

Claim remains intentionally reward-free:

1. Find the open run for the demo pilot.
2. Resolve timer state server-side.
3. If claimable, atomically set `claimed_at` with `WHERE claimed_at IS NULL`.
4. Return `{ claimed: true }`.

The idempotency pattern from Lesson 03 stays intact.

---

## 5. UI flow

The page now displays the deterministic Red Mesa first-session survey when no thumper is open:

- Keth Iron
- Veyrith Copper — recommended
- Thornwake Crystal

Each signal is selectable. The radio input posts:

```text
targetResourceId=<resource id>
```

Veyrith Copper is checked by default because it is the tutorial recommendation, but Keth and Thornwake remain visible and selectable. That preserves “recommended, not forced.”

When a run is open, the page shows the selected target display name.

---

## 6. Likely Q&A

### Why store a named resource id instead of a resource instance id?

The first-session survey is still domain-only. There is no `resource_instances` table yet, and adding one now would drag in bloom persistence and rotation. A named `target_resource_id` is the smallest durable link between survey choice and future claim reward.

### Why validate on the server if the radio list comes from the server?

The browser is not authoritative. A user can post any form value. The server must reject anything outside the locked Red Mesa resource ids.

### Why rename `thumper_events` to `thumper_runs`?

The old name was useful for the scaffold, but “event” will mean Signal Drift, Pump Strain, and other event windows. The durable parent record is a run, so `thumper_runs` matches the MVP audit vocabulary.

### Why not grant Veyrith Copper on claim now?

Reward-bearing logic needs resource stacks and a ledger so duplicate claims cannot mint resources. This lesson only stores run intent. Reward grants come after the persistence/audit shape is ready.

---

## 7. Verification

Run:

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Expected:

- domain tests pass
- workspace typecheck passes
- DB smoke proves `target_resource_id` is persisted and redeploy can target a different resource after claim
- web build passes

---

## Recap checklist

- [x] Survey signals are visible in the UI.
- [x] Deploy posts a selected `targetResourceId`.
- [x] Server validates the target against locked Red Mesa resources.
- [x] Thumper run stores `target_resource_id`.
- [x] Open run display shows the selected target name.
- [x] Claim remains idempotent and reward-free.
- [x] No resource stacks, ledger, event windows, jobs, auth, or group thumpers added.

**Next exercise:** Claim grants a fixed quantity of the target resource into a minimal resource stack plus ledger row — only after a GPT-5.5 xHigh review confirms this run-target slice is safe to build on.
