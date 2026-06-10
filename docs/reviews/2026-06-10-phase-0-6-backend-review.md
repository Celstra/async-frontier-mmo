# Phase 0–6 Backend Review — pre-Phase-7 gate

> Date: 2026-06-10. Goal: verify everything through Lesson 6.5 is hooked up backend-wise
> and aligned with the MVP slice (Decisions 001–021) before the Phase 7 UI/UX pass.
> This file is the running checkpoint log. Update statuses as the review progresses
> so a future session can resume from the last incomplete checkpoint.

## Checkpoint status

| # | Checkpoint | Status | Notes |
|---|---|---|---|
| CP1 | Workspace health: `pnpm check`, domain tests, db tests/smoke | DONE | All green 2026-06-10. |
| CP2 | Lesson 6.5 working-tree state | DONE | Tree clean; `269e490` committed prospecting/sampling. |
| CP3 | Domain review: purity + Decisions 001–021 compliance | DONE | No blockers; 6 warns, see findings. |
| CP4 | DB review: Decision 012 records, transactions, idempotency, ledger, migrations | DONE | No economy blockers; migration meta drift is the big one. |
| CP5 | Web wiring: actions → domain → db, full-slice action coverage pre-Phase-7 | DONE | Build green. 1 real blocker (seeded-run claim), known Phase-7 gaps enumerated. |
| CP6 | Consolidate findings, apply approved fixes, re-verify | DONE | All 5 pre-Phase-7 fixes + both canon decisions applied 2026-06-10; full suite green. |

## Review scope

- Phases 0–6 of `docs/ASYNC_FRONTIER_MMO_LEARNING_PATH_V2.md` (Lessons through 6.5 / doc 22b).
- "Full slice" checklist at the top of the learning path is the target shape.
- Out of scope: Phase 7 screens themselves, Phase 8 telemetry, anything in LAYERED_FEATURE_BACKLOG.

## Findings log

### CP1 — Workspace health

- `pnpm check`: 0 errors across shared/domain/db/web.
- Domain tests: 28 files / 113 tests pass.
- DB tests: 4 files / 11 tests pass against local Postgres (`async-frontier-postgres` container).
- `db:smoke`: deploy → claim → double-claim idempotency path passes (`already_claimed`, `invalid_windows`).
- Web build: see CP5.

### CP2 — Lesson 6.5 state

- Working tree clean. Last commit `269e490 feat: prospecting, sampling, and survey energy`
  contains `prospectingSampling.ts` + tests + lesson doc 22b. No dangling work.

### CP3 — Domain (`packages/domain`)

**Passed:** purity (no svelte/db/http imports, no `Math.random()`/`Date.now()` in production
code — RNG seeded, time injected); Decision 010 crafting math + bands; 016-A/B and 021-A
weights in all five schematics; 4 complications + 4 actions, data-driven frame multipliers;
2-window default / 3-window push; tutorial Drift→Strain; Recall Early semantics; 9-resource
bloom generator within family caps; resource stat immutability; first-session resolver
delegates to the general resolver (no duplicated math).

**Warns:**

- W-D1 — Three parallel survey models: `redMesaSurvey` (tutorial, pre-021 shape),
  `activeBloomSurvey` (always shows stat hints — conflicts with Decision 019 hidden-until-
  sampled), `prospectingSampling` (Decision 019, correct, unwired). Needs consolidation;
  Phase 7.2 is the natural place, but decide the canonical path before building the screen.
- W-D2 — `prospectingSampling` exports entirely unconsumed by db/web (Lesson 6.5 stopped at
  domain). Wiring is Phase-7.2 prerequisite work, not screen work.
- W-D3 — Decision 021-C per-recipe slot quantities not implemented:
  `CRAFT_QUANTITY_PER_SLOT = 1` flat (`packages/domain/src/crafting/starterStockpile.ts`).
  021-C says Hull 60/40/20, Drill/Pump 40/40/40, Scanner 30/30/30, Repair 25/20/15.
- W-D4 — Careful Experiment +3% can exceed `resourceCeiling` (capped only at 100), and a test
  asserts that behavior. Decision 009 wording says experiment variance stays inside the
  resource-defined ceiling. Canon clarification needed: hard 100 cap vs resource ceiling.
- W-D5 — Seed-bloom concentration ranges live only in the DB seed, not the domain catalog;
  generator rolls a generic 15–55% min band rather than per-family scarcity bands.

**Test gaps (info):** `scanFamilyProspect` / spot-count bounds untested;
`applyProspectingScannerWear` untested; Careful Experiment 75/20/5 thresholds untested with
known seeds; no explicit Safe-Craft determinism assertion; no full push-run (3-window)
resolution test.

### CP4 — DB (`packages/db`)

**Passed:** all 11 Decision 012 records exist (schematics correctly live in domain as
versioned data); no out-of-scope tables; claim/craft/repair/equip/rotation/grants all inside
`db.transaction`; stack updates use atomic SQL (`ON CONFLICT … DO UPDATE` increments,
conditional decrements); double-claim guarded by conditional `claimed_at` update + unique
`thumper_run_results.thumper_run_id`; double-craft guarded by `(pilot_id, idempotency_key)`
unique; stat immutability enforced in the query layer and tested; bloom #1 seed has the nine
021 resources and is idempotent; core mutations write ledger rows in the same transaction.

**Warns:**

- W-B1 — **Drizzle meta drift.** `_journal.json` lists 0000–0016 but `meta/` snapshots stop
  at 0004; migrations 0005+ are hand-written. `drizzle-kit generate` would diff against
  snapshot 0004 and emit a destructive mega-migration. Treat `db:generate` as unsafe until
  the snapshot chain is rebaselined.
- W-B2 — Ledger event types `survey_completed`, `thumper_deployed`, `thumper_claimed` are
  declared in `economy/eventTypes.ts` but never written. Deploy writes no ledger row; claim
  writes only `resource_granted`.
- W-B3 — Workshop repair (`applyRepairKitToItemForPilot`) has no idempotency key —
  double-submit consumes two kits. (Kit row itself is guarded by `consumed_at IS NULL`,
  so the same kit can't double-spend, but a second kit can be burned.)
- W-B4 — Concurrent bloom rotation unguarded (two rotations can race); dev-only action, low
  priority.
- W-B5 — Drizzle TS schema drifts from applied SQL (e.g. part-snapshot unique constraint and
  some FKs exist in SQL but not in schema files) — compounds W-B1.
- W-B6 — Missing indexes on hot paths: `economy_ledger.pilot_id`, `items.pilot_id`,
  `thumper_runs (pilot_id, deployed_at)`.
- W-B7 — Status/event columns are unconstrained `text` (no CHECK/enum).

**Test gaps (info):** repair, equip, starter-grant one-shot, deploy transaction, and
`bloom_rotated` ledger row have no integration tests (smoke script covers deploy/claim only).

### CP5 — Web wiring (`apps/web`)

**Passed:** `pnpm --filter web build` green; single server entry point; web imports only
package APIs (no raw Drizzle/SQL); client imports only `shared` types; actions follow
parse → domain validate → db transaction → structured `fail(400)`; tutorial loop
(deploy → respond incl. kit-gated Field Repair / hold / recall → idempotent claim with wear
+ ledger) fully wired; all five craft actions wired with idempotency keys; equip scanner +
parts wired; `rotateBloom` correctly dev-gated. (Subagent flagged a missing favicon —
false positive; `src/lib/assets/favicon.svg` exists and build passes.)

**Blocker:**

- B-W1 — **Non-tutorial runs cannot be claimed.** Claim is gated on
  `run.runSeed === TUTORIAL_RUN_SEED` (`+page.server.ts` L183, L483) and resolution always
  goes through `resolveFirstSessionThumperRunResult`. Seeded/push runs can deploy and
  respond but never claim — the repeat loop (the actual toy) is broken backend-side. The
  general `resolveThumperRunResult` exists and is tested in domain; it just isn't wired.

**Known Phase-7 wiring gaps (expected, enumerated so 7.x lessons can claim them):**

| Player action | Status | Belongs to |
|---|---|---|
| Choose frame (persist to pilot) | missing (no `setPilotFrame` db helper) | 7.1 |
| Family scan + sample spot (energy, trickle grant, stat reveal) | domain-only | 7.2 (+ db helper) |
| Deploy on sampled spot with concentration multiplier | deploy targets bloom slug only | 7.3 |
| Extraction tail choice (15 m/1 h/4 h/8 h) | hardcoded `durationSeconds = 60` | 7.3 (needs Decision 017 confirmed) |
| Claim seeded/push runs | **B-W1 — should be fixed now** | pre-7 |
| Craft preview before commit | preview only runs inside craft transaction | 7.6 |
| Workshop repair action | db helper exists, no action | 7.6 |
| Craft repair-kit form in UI | action exists, no form | 7.6 |
| Unequip scanner | not supported server-side | 7.6 (decide if needed) |

**Warns:**

- W-W1 — No schema validation (Zod/Valibot) at the action boundary; manual `FormData`
  parsing throughout. BUILD_PLAN names Zod/Valibot as the boundary-validation layer.
- W-W2 — `DEMO_PILOT_ID` hardcoded in ~30 call sites. Fine for the demo, but Lesson 7.1
  (frame choice / real pilot) will touch every action; consider a single
  `resolvePilotId(event)` helper now to make 7.1 a one-line change later.
- W-W3 — `claim` action has no try/catch around the workflow; a grant mismatch inside the
  transaction throws → raw 500 instead of structured failure.

### CP6 — Consolidated fix list (proposed order)

**Fix before Phase 7 (backend correctness):**

1. B-W1 — Wire `resolveThumperRunResult` into the claim path for non-tutorial runs
   (web + `claimOpenThumperRunForPilot` resolver hook). Highest value: closes the repeat loop.
2. W-B1/W-B5 — Rebaseline Drizzle meta snapshots so `db:generate` is safe again, and align
   TS schema with applied SQL. Mechanical but operationally important.
3. W-B2 — Emit `thumper_deployed` and `thumper_claimed` ledger rows in their transactions
   (and reserve `survey_completed` for the sampling db helper).
4. W-D1/W-D2 — Decide the canonical survey path (prospecting/sampling per Decision 019) and
   add the db helper for sample persistence + trickle grant + `survey_completed`, so 7.2 is
   purely a screen lesson.
5. W-W2 — Introduce `resolvePilotId()` indirection ahead of Lesson 7.1.

**Decide (canon questions for Ryan, not code yet):**

6. W-D4 — Careful Experiment ceiling: hard 100 cap (current code) vs resource-defined
   ceiling (Decision 009 wording). Pick one; update DECISION_LOG or code + test.
7. W-D3 — Decision 021-C per-recipe slot quantities: implement now (affects economy balance
   + starter stockpile sizing) or defer to a tuning pass before playtest.
8. Extraction tails require Decision 017 lock (learning path says confirm before Phase 7
   polish).

**Nice-to-have / fold into later lessons:**

9. W-W1 — Zod/Valibot at action boundary (could be its own small lesson during 7.x).
10. W-B3 — Idempotency key on workshop repair.
11. W-B6/W-B7 — Indexes + CHECK constraints in the next hand migration.
12. Test gaps: push-run resolution, Careful Experiment seed thresholds, repair/equip/starter
    integration tests, `bloom_rotated` ledger assertion.

### CP6 — Resolution (2026-06-10, applied via agents, all verified)

Ryan's decisions: apply all five pre-Phase-7 fixes; Careful Experiment caps at the
resource-defined ceiling (Decision 009 as written); Decision 021-C quantities implemented now.

**Applied:**

1. B-W1 fixed — seeded/push runs claim through `resolveThumperRunResult` (tutorial path
   unchanged); claim grants reference the active bloom; claim action wrapped against
   unexpected transaction errors; integration tests for seeded claim + idempotency.
2. W-B2 fixed — deploy writes `thumper_deployed`, claim writes `thumper_claimed` (plus the
   existing `resource_granted`), both in-transaction. `survey_completed` now written by the
   sampling helper.
3. W-B1/W-B5/W-B6 fixed — Drizzle meta rebaselined (`0017_rebaseline_meta` empty migration
   with full snapshot; journal `when` values for 0017+ are synthetic and must stay ordered);
   TS schema aligned with applied SQL (pilot equip FKs, part-snapshot unique, partial unique
   open-run index); hot-path indexes added in `0018_hot_path_indexes`. `db:generate` is safe
   again and reports no drift.
4. W-D1/W-D2 partially resolved — sampling persistence layer added (`0019`):
   `pilot_survey_energy` (timestamp-resolved regen), `pilot_resource_stat_reveals`,
   `pilot_deposit_spot_samples`; helpers `getPilotProspectingProgress`, `scanFamilyForPilot`,
   `sampleSpotForPilot` (energy spend, trickle grant, stat reveal, `survey_completed` ledger,
   scanner wear when equipped, idempotent re-sample). Spots derive on read from the bloom
   seed; only pilot progress persists. Legacy `redMesaSurvey`/`activeBloomSurvey` remain wired
   in the web load — swapping the screen to the prospecting flow is Lesson 7.2.
5. W-W2 fixed — `resolvePilotId(event)` helper (`apps/web/src/lib/server/pilot.ts`) replaces
   all hardcoded `DEMO_PILOT_ID` uses; Lesson 7.1 swaps its body for session identity.
6. W-D4 fixed — Careful Experiment final score = min(tuned × 1.03, resourceCeiling, 100);
   tests inverted accordingly.
7. W-D3 fixed — per-slot `inputQuantity` on schematic definitions (Hull 60/40/20,
   Drill/Pump 40/40/40, Scanner 30/30/30, Repair Kit 25/20/15); db crafting consumes/ledgers
   real quantities; starter stockpile 35 Keth + 35 Pale Ember; tutorial projected recovery 113
   (≈118 claimed with Recon bonus) so the first scanner craft clears the 30-unit core.

**Final verification:** `pnpm check` clean; domain 115/115; db 16/16; `db:smoke` ok;
`db:generate` no changes; web build ok.

**Carry into Phase 7 (noted for the lesson plan):**

- 7.1: replace `resolvePilotId` body with session pilot + add `setPilotFrame` db helper.
- 7.2: swap web survey load/actions from `redMesaSurvey`/`activeBloomSurvey` to
  `scanFamilyForPilot`/`sampleSpotForPilot`; consider a read-only progress view (scan always
  spends energy); decide whether family scans get their own ledger event.
- 7.3: deploy must accept a sampled `spot_id` and use its `true_concentration_percent` as the
  extraction multiplier; extraction-tail choice needs Decision 017 locked.
- 7.6: craft UI must display per-slot `inputQuantity` and filter short stacks; wire workshop
  repair action + repair-kit craft form; craft preview action.
- Deferred from this review: Zod at the action boundary (9), workshop-repair idempotency key
  (10), CHECK constraints (11), test gaps (12), W-D5 concentration metadata in domain.
