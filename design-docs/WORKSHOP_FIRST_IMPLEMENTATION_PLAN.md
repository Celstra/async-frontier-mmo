# Workshop-First Crafting Slice - Composer Implementation Plan

Status: ready for Composer execution after Ryan hands this document to the implementation agent.

Source decisions:

- `design-docs/DECISION_LOG.md` - Decision 024 is the active rollout target.
- `design-docs/WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md` - product spec.
- `design-docs/research/RESEARCH_CRAFTING_WOW_MOMENT_COMPOSER_BRIEF.md` - required crafting UX brief.
- `design-docs/research/RESEARCH_SWG_CRAFTING_REPAIR_ACTIVE_EVENTS.md` - SWG crafting / repair principles.
- `design-docs/research/RESEARCH_SWG_RESOURCE_CRAFTING_FEEDBACK.md` - SWG resource economy lessons.
- `design-docs/experimentation_sim.py` - simulation evidence for the full two-pulse experimentation model.

## 0. Non-Negotiables

Composer must not simplify this slice into a basic tutorial craft.

- Start the player in **WORKSHOP**.
- FIELD, RIG, and SETTLEMENT are visible but **In Development**.
- Implement the full crafting experience, including the existing two-pulse Careful / Standard / Overdrive experimentation model.
- Do not replace experimentation with a simplified Safe Craft / Careful Experiment flow.
- Use the current resource names/slugs, but reduce their active playtest stats into low-to-mid bench-stock values.
- Do not invent new resource names for this slice.
- Do not grant high-end or unicorn resources at the start.
- Do not add workshop credits or another currency.
- Persist favorites, reclaim/breakdown, crates, resource grants, crafting attempts, and telemetry in the database.
- Add detailed telemetry. This is a real playtest and testers may return later.
- Before implementing resource crates/reclaim constants, run a supply simulation and stop for review.

All shell commands in this repo should use `rtk`.

## 1. Review Gate Protocol

This plan is intentionally split into phases. Composer must stop at each review gate.

At every `STOP FOR REVIEW`:

1. Do not continue to the next phase.
2. Send Ryan:
   - files changed;
   - short behavior summary;
   - commands run and results;
   - screenshots or local URL if UI changed;
   - known risks or questions.
3. Ryan will send the diff back to Codex as review agent.
4. Continue only after Ryan says the review is accepted.

Suggested Ryan prompt for review:

```text
Review this phase against design-docs/WORKSHOP_FIRST_IMPLEMENTATION_PLAN.md and Decision 024. Prioritize bugs, scope drift, missing tests, telemetry gaps, and any simplification of SWG-style crafting.
```

## 2. Active Bench Resource Set

Use the existing resource identities. For this playtest, reduce their stats instead of creating variants.

Prototype active bench stats:

| Resource | Family | OQ | Cond | Hard | HR | Mall | Role |
|---|---|---:|---:|---:|---:|---:|---|
| Keth Iron | Structural Alloy | 440 | 180 | 560 | 360 | 430 | baseline alloy |
| Asterion Frame Alloy | Structural Alloy | 580 | 160 | 760 | 420 | 470 | Hardness specialist |
| Bendrel Ridge Alloy | Structural Alloy | 560 | 150 | 420 | 330 | 740 | Malleability specialist |
| Red Mesa Conductive Slag | Conductive Metal | 340 | 410 | 220 | 620 | 310 | Heat Resistance specialist |
| Veyrith Copper | Conductive Metal | 620 | 760 | 180 | 390 | 360 | Conductivity specialist, downgraded |
| Sorrel Vein Copper | Conductive Metal | 520 | 560 | 230 | 430 | 720 | Malleability specialist |
| Pale Ember Crystal | Reactive Crystal | 600 | 360 | 220 | 760 | 300 | Heat Resistance specialist |
| Thornwake Crystal | Reactive Crystal | 500 | 720 | 260 | 180 | 320 | awkward Conductivity specialist |
| Glimmerfall Shard | Reactive Crystal | 700 | 540 | 260 | 600 | 210 | OQ / Heat Resistance support |

Starter grant:

- 180 units of each named resource.
- Schematics visible/craftable in this slice:
  - `Basic Drill Head`
  - `Efficient Pump`
  - `Reinforced Hull Plate`
- Hide or lock non-slice schematics from the main workflow, including Survey Scanner, Field Repair Kit, and chassis assembly.

Guardrails:

- No stat is 800+.
- Every family has at least one awkward specialist.
- Veyrith remains recognizable but is not a unicorn.
- Future field/bloom work may reintroduce high-end chase values. This playtest bench does not.

## 3. Supply And Inflation Model

The player must not soft-lock by exhausting resources. The system must also avoid uncontrolled resource inflation.

Do not code final crate/reclaim constants until the simulation phase is reviewed.

Recommended candidate mechanics to simulate:

- Reclaim/breakdown returns a percentage of the exact named resources consumed by the item.
- Candidate reclaim rates: 25%, 35%, 50%.
- Round returned units down to a stable increment, such as 5 units.
- Reclaim never changes resource stats and never returns more than was consumed.
- Timer supply crate is available even if the player has not crafted enough items.
- Candidate timer cadence: 5, 10, 15 minutes.
- Candidate craft-count crate: every 4 completed crafts.
- Candidate crate payload: 3 named stacks, one per family, 60-90 units each, low-to-mid stats only.
- Optional emergency anti-stuck crate: if a player has no possible craftable thumper-part attempt, make a small crate available.

Simulation must report:

- crafts possible in first 10, 20, 30, and 60 minutes;
- probability of soft-lock before next timed crate;
- net resources minted by crates;
- net resources returned by reclaim;
- net resources consumed by crafting and Overdrive scrap;
- median and p95 inventory remaining after active crafting;
- whether any strategy creates positive resource loops by crafting and reclaiming repeatedly;
- whether Reinforced Hull Plate material weight creates structural-alloy starvation.

The output should recommend one constant set, but Composer must stop for review before coding those constants.

## 4. Phase 0 - Baseline Audit

Goal: confirm current state and avoid building against stale assumptions.

Composer actions:

- Read all source docs listed at the top of this plan.
- Run:

```bash
rtk git status --short
rtk pnpm --filter @async-frontier-mmo/domain test
rtk pnpm --filter @async-frontier-mmo/db test
rtk pnpm --filter web check
```

- If tests fail before changes, document failures and do not fix unrelated issues unless Ryan approves.
- Inspect current files:
  - `apps/web/src/routes/workshop/+page.server.ts`
  - `apps/web/src/routes/workshop/+page.svelte`
  - `apps/web/src/lib/server/workshopLoad.ts`
  - `apps/web/src/lib/workshop/WorkshopBench.svelte`
  - `apps/web/src/lib/workshop/CraftResultReveal.svelte`
  - `packages/domain/src/crafting/experimentation.ts`
  - `packages/domain/src/crafting/schematicEngine.ts`
  - `packages/db/src/queries/crafting.ts`
  - `packages/db/src/schema/items.ts`
  - `packages/db/src/schema/resourceInstances.ts`
  - `packages/db/src/schema/resourceStacks.ts`
  - `packages/db/src/schema/playtestEvents.ts`

Deliverable:

- A short implementation note in the Composer thread summarizing current baseline and any failing checks.

STOP FOR REVIEW.

## 5. Phase 1 - Supply Simulation

Goal: lock crate/reclaim constants from evidence before coding them into the app.

Composer actions:

- Add `design-docs/workshop_supply_sim.py`.
- Simulate the candidate reclaim rates, crate cadences, crate payloads, and craft patterns from section 3.
- Include Overdrive scrap using the current experimentation model.
- Include all three active schematics and real recipe input quantities.
- Print a clear `VERDICT` section with:
  - recommended reclaim percentage;
  - recommended timer cadence;
  - recommended craft-count crate rule;
  - recommended crate payload;
  - soft-lock risk;
  - inflation risk.

Commands:

```bash
rtk python3 design-docs/workshop_supply_sim.py
```

Acceptance:

- No hidden constants in prose only. The sim must show them.
- The sim must make it obvious whether a player can run out of craftable material.
- The sim must make it obvious whether reclaim/crates produce an infinite material loop.

STOP FOR REVIEW.

## 6. Phase 2 - Domain Constants And Pure Rules

Goal: encode workshop-specific rules in the domain layer, test-first.

Likely files:

- `packages/domain/src/workshop/benchResources.ts`
- `packages/domain/src/workshop/reclaim.ts`
- `packages/domain/src/workshop/supplyCrates.ts`
- `packages/domain/src/workshop/workshopSlice.ts`
- `packages/domain/src/index.ts`

Rules:

- Bench resource stats use the table in section 2 unless review changed it.
- Reclaim returns lossy named-resource quantities using constants from reviewed sim.
- Supply crates use constants from reviewed sim.
- Supply crates never generate 800+ starter/playtest stats.
- No workshop credits.
- Full experimentation remains in `packages/domain/src/crafting/experimentation.ts`.

Tests:

- bench resource stats contain no 800+ value;
- all 9 existing resource slugs present;
- starter grant gives 180 units each;
- only three active schematics are exposed for workshop-first slice;
- reclaim returns less than consumed and preserves resource identity;
- reclaim cannot be repeated for the same item in pure-rule model;
- supply crate payload stays low-to-mid and includes craft-useful families;
- no pure craft/reclaim loop increases total material.

Commands:

```bash
rtk pnpm --filter @async-frontier-mmo/domain test
```

STOP FOR REVIEW.

## 7. Phase 3 - Database Persistence

Goal: make the workshop slice real-playtest persistent.

Schema changes to consider:

- Add to `items`:
  - `favorited_at timestamp with time zone null`
  - `reclaimed_at timestamp with time zone null`
- Add `workshop_reclaims`:
  - `id uuid primary key`
  - `pilot_id`
  - `item_id`
  - `idempotency_key`
  - `returned_resources jsonb`
  - `created_at`
  - unique `(pilot_id, idempotency_key)`
- Add `pilot_workshop_state`:
  - `pilot_id primary key`
  - `starter_granted_at`
  - `craft_count_since_crate`
  - `next_timed_crate_at`
  - `crate_sequence`
  - `updated_at`
- Add `workshop_crates`:
  - `id uuid primary key`
  - `pilot_id`
  - `sequence`
  - `reason` (`timer`, `craft_count`, `emergency`, `starter`)
  - `status` (`available`, `opened`, `expired` if needed)
  - `available_at`
  - `opened_at`
  - `payload jsonb`
  - unique `(pilot_id, sequence)`

Query modules to add or extend:

- `packages/db/src/queries/workshopSlice.ts`
- `packages/db/src/queries/workshopReclaims.ts`
- `packages/db/src/queries/workshopCrates.ts`
- `packages/db/src/queries/crafting.ts`
- `packages/db/src/queries/resourceGrants.ts`
- `packages/db/src/queries/economyLedger.ts`

Persistence requirements:

- Starter grant is idempotent per pilot.
- Crate availability is DB-derived and survives refresh/return visits.
- Crate opening grants resource stacks through existing resource/economy ledger paths.
- Reclaim marks the item reclaimed and returns resources in one transaction.
- Reclaim cannot apply to favorited items without explicit user confirmation.
- Reclaim cannot run twice.
- Favoriting persists and is queryable in item lists.
- Every economy mutation has ledger coverage.
- Telemetry is not economy truth; ledger/current tables are.

Tests:

- starter grant idempotency;
- favorite/unfavorite persistence;
- reclaim transaction returns expected resource quantities;
- reclaim writes ledger entries;
- double reclaim rejected/idempotent;
- crate availability by time;
- crate opening grants expected resources and writes ledger entries;
- no resource stack goes negative;
- craft-count crate availability increments after completed crafts.

Commands:

```bash
rtk pnpm --filter @async-frontier-mmo/db test
```

STOP FOR REVIEW.

## 8. Phase 4 - Workshop-Only Routing And Disabled Screens

Goal: make the playtest start in workshop and prevent old funnel leakage.

Likely files:

- `apps/web/src/lib/server/rootRedirect.ts`
- `apps/web/src/routes/+page.server.ts`
- `apps/web/src/routes/+page.svelte`
- `apps/web/src/routes/workshop/+page.server.ts`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/routes/rig/+page.svelte`
- `apps/web/src/routes/settlement/+page.svelte`
- `apps/web/src/routes/+layout.svelte`
- `apps/web/src/lib/server/nextActionLoad.ts`
- `apps/web/src/lib/server/tutorialOrchestration.ts`

Requirements:

- Fresh playable pilot lands on `/workshop`.
- Workshop grants starter bench stock idempotently.
- Workshop shows only the three thumper-part schematics as the primary slice.
- FIELD, RIG, and SETTLEMENT show In Development states.
- In Development pages must not expose old buttons/actions/forms from Decision 022.
- Nav remains visible to communicate product shape.
- No old prologue, settlement order, field sampling, rig assembly, first deploy, or tutorial call-to-action should be required.
- If old server actions remain for future work, they must not be reachable from the active UI.

Tests/checks:

- root redirects to `/workshop`;
- `/field`, `/rig`, `/settlement` render In Development copy;
- no old first-thump required action appears in active UI;
- no `<select>` elements introduced;
- `web check` passes.

Commands:

```bash
rtk pnpm --filter web check
```

STOP FOR REVIEW.

## 9. Phase 5 - Full Workshop Crafting UX

Goal: make crafting the complete fun slice.

Required UX:

- Schematic list for three thumper parts.
- Resource slot picker with named resources, quantities, stat bands, and readable slot fit.
- Property preview bars before craft.
- Tuning controls.
- Full two-pulse experimentation:
  - pulse 1 property line + push size;
  - pulse 2 property line + push size;
  - Careful / Standard / Overdrive labels and probability text;
  - no simplified mode.
- Craft result reveal that does not vanish after inventory refresh.
- Pulse-by-pulse result rows:
  - success;
  - wasted;
  - crit band loss;
  - crit scrap.
- Overdrive crit scrap is visible and specific about material loss.
- Final item card shows property scores, bands, provenance, condition, integrity.
- Result history shows last craft and best craft per schematic this session/pilot.
- Favorite/keep control.
- Reclaim/breakdown control, with confirmation if not favorited and stronger warning if favorited.
- No auto-install.

Use existing brief:

- `design-docs/research/RESEARCH_CRAFTING_WOW_MOMENT_COMPOSER_BRIEF.md`

Likely files:

- `apps/web/src/lib/workshop/CraftResultReveal.svelte`
- `apps/web/src/lib/workshop/WorkshopBench.svelte`
- `apps/web/src/lib/workshop/SchematicList.svelte`
- `apps/web/src/lib/workshop/SlotSelector.svelte`
- `apps/web/src/lib/workshop/TuningPanel.svelte`
- `apps/web/src/lib/workshop/PropertyPreview.svelte`
- `apps/web/src/routes/workshop/+page.svelte`
- `apps/web/src/routes/workshop/+page.server.ts`
- `apps/web/src/lib/server/workshopLoad.ts`
- `apps/web/src/lib/server/craftOutcome.ts`

Tests/checks:

- after craft, consumed resources are still visible in result reveal;
- pulse results are visible;
- overdrive crit scrap warning renders when present;
- favorite persists after reload;
- best result per schematic is visible;
- item comparison can be viewed without installing;
- no auto-install occurs after craft;
- web check passes.

Commands:

```bash
rtk pnpm --filter web check
rtk pnpm --filter @async-frontier-mmo/domain test
rtk pnpm --filter @async-frontier-mmo/db test
```

STOP FOR REVIEW.

## 10. Phase 6 - Reclaim And Supply Crates UI

Goal: keep experimentation moving without soft-locks or hidden inflation.

Requirements:

- Reclaim/breakdown available for crafted thumper parts.
- Reclaim preview shows exact named resources and quantities returned.
- Reclaim is disabled or requires explicit confirmation for favorited items.
- Reclaimed items no longer appear as usable craft results, but remain auditable.
- Timed crate state is visible:
  - available now;
  - next crate timer;
  - reason for crate if craft-count or emergency.
- Crate opening shows resource names, quantities, and stat bands.
- Crate grants persist through DB and ledger.
- No workshop credits.
- No high-quality resource buys.

Tests/checks:

- reclaim UI cannot double-submit into extra resources;
- crate opening cannot double-submit;
- timer crate survives reload;
- emergency anti-stuck crate appears only when rules say it should;
- telemetry fires for reclaim and crate open.

Commands:

```bash
rtk pnpm --filter web check
rtk pnpm --filter @async-frontier-mmo/db test
```

STOP FOR REVIEW.

## 11. Phase 7 - Telemetry

Goal: make the real playtest analyzable.

Use existing `playtest_events` table. Do not add third-party analytics.

Required events:

- `workshop_started` - once per pilot entering active slice.
- `starter_resources_viewed` - once after starter inventory visible.
- `schematic_selected` - repeat event, payload schematic id.
- `resource_slot_filled` - repeat event, payload slot id, resource id, resource stats summary.
- `resource_slot_replaced` - repeat event, payload old/new resource ids.
- `tuning_changed` - repeat event, payload allocation.
- `experiment_pulse_configured` - repeat event, payload pulse index, property, push.
- `craft_started` - repeat event.
- `craft_completed` - repeat event, payload item id, schematic, property scores, pulse outcomes, scrap units.
- `result_compared` - repeat event.
- `item_favorited` - repeat event.
- `item_unfavorited` - repeat event.
- `item_reclaim_previewed` - repeat event.
- `item_reclaimed` - repeat event, payload returned resources.
- `supply_crate_available` - repeat event.
- `supply_crate_opened` - repeat event, payload crate reason and resource payload.
- `repeat_same_schematic` - repeat event when same schematic crafted again.
- `crafted_each_thumper_part` - once when pilot has crafted all three active schematics.
- `no_craftable_resources_state` - repeat event if anti-stuck condition appears.
- `return_visit` - once/repeat according to existing return-visit convention.

Telemetry payload rules:

- Include compact stat snapshots, not full giant objects.
- Include quantities and resource ids for economy comprehension.
- Include pulse outcomes so experimentation can be analyzed.
- Do not record personal data beyond pilot/session identifiers already used.
- Economy correctness comes from ledger, not telemetry.

Tests:

- once events are once;
- repeat events repeat;
- craft completion event includes pulse outcomes;
- reclaim event includes returned resource quantities;
- crate event includes crate reason and payload;
- `crafted_each_thumper_part` fires only after all three schematics crafted.

Commands:

```bash
rtk pnpm --filter @async-frontier-mmo/db test
rtk pnpm --filter web check
```

STOP FOR REVIEW.

## 12. Phase 8 - End-To-End Verification

Goal: prove the slice is ready for real testers.

Fresh pilot acceptance path:

1. Land on WORKSHOP.
2. See only active crafting slice, not old settlement tutorial.
3. View starter resources.
4. Craft Basic Drill Head with two experiment pulses.
5. See result reveal with resources, tuning, pulse outcomes, final item, provenance.
6. Craft Efficient Pump.
7. Craft Reinforced Hull Plate.
8. Favorite one result.
9. Reclaim a non-favorite result and see partial named resources returned.
10. Open a crate and see low-to-mid named resources granted.
11. Return after reload and see favorites, items, crates, and resources persisted.
12. FIELD / RIG / SETTLEMENT show In Development.

Commands:

```bash
rtk pnpm --filter @async-frontier-mmo/domain test
rtk pnpm --filter @async-frontier-mmo/db test
rtk pnpm --filter web check
rtk pnpm build
rtk git diff --check
```

Manual/browser verification:

- Start the local dev server.
- Open the app in the browser.
- Test desktop and mobile width.
- Screenshot the workshop before craft, result reveal, reclaim preview, crate open, and In Development pages.
- Verify no text overlap and no dead controls.

STOP FOR FINAL REVIEW.

## 13. Final Review Checklist For Codex

When Ryan sends the implementation back to Codex, review against this checklist:

- Did Composer preserve Decision 024 as active target?
- Did it avoid old field/settlement/rig tutorial leakage?
- Did it use current resource names with reduced stats rather than new invented resources?
- Are all starter stats below 800?
- Is full two-pulse experimentation exposed in UI?
- Did Composer avoid simplifying SWG-style crafting?
- Are favorites persisted?
- Is reclaim persisted and lossy?
- Are supply crates persisted and anti-stuck?
- Is there any resource inflation loop?
- Are all economy mutations ledgered?
- Is telemetry detailed enough to analyze repeat crafting?
- Are FIELD / RIG / SETTLEMENT disabled cleanly?
- Are tests meaningful, not just snapshots?
- Did frontend text fit and avoid overlapping controls?

## 14. Ready State

This document is ready to hand to Composer.

There are no open product questions blocking implementation. The only constants not hard-locked are reclaim percentage and crate cadence/payload, and those are intentionally assigned to Phase 1 simulation plus review before coding.
