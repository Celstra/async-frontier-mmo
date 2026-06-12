# First-Thump Slice — Implementation Plan

Execution plan for the ground-up flow/UI rewrite locked by **Decision 022**. The implementing agent (Cursor Composer) must read these three documents before writing any code, in this order:

1. `design-docs/FIRST_THUMP_SLICE_SPEC.md` — the product spec. §6 (first-session clock) is the acceptance test for the whole project.
2. `design-docs/DECISION_LOG.md` — Decision 022 (bottom of file) for what is locked; Decisions 017/019/020/021 for the economy structures that must NOT change.
3. This file — the build order.

## Global rules (apply to every phase)

- **Sequential phases.** Complete and verify a phase before starting the next. Each phase ends with the app runnable (`pnpm dev`) and all checks green.
- **Delete in the same phase.** Every phase has a DELETE list. Superseded files are removed in the phase that replaces them — never left behind, never commented out, never renamed to `.old`. If a file in a DELETE list still has a live importer at deletion time, that importer is in scope for the phase: fix it, don't keep the corpse.
- **No `<select>` elements anywhere.** All choices are rendered as selectable rows/lists/buttons. Phase 8 enforces this with a grep that must return zero hits in `apps/web/src`.
- **No new dependencies** without an explicit comment in the PR/commit explaining why. The terminal aesthetic is hand-rolled CSS + monospace, not a UI library.
- **Tuning constants live in one file:** `packages/domain/src/tuning.ts` (created in Phase 1). Any sim-locked number used in code MUST be imported from there. No magic numbers scattered through screens.
- **Verification commands:** `pnpm -r check` (tsc + svelte-check), `pnpm --filter domain test`, `pnpm --filter db test` (needs the local Postgres: `docker compose` setup already running for dev). Migrations: `pnpm --filter db db:generate` then `db:migrate`.
- **Copy is content, not improvisation.** All player-facing strings (prologue, foreman lines, recall banner, nudges) live in `apps/web/src/lib/copy/` modules. The locked strings in the spec (prologue §3, recall banner §6) must appear verbatim.
- **Telemetry from day one.** Each phase that adds player actions emits the §9 funnel events through the existing `playtest_events` write path.

## Tuning constants (Phase 1 creates `packages/domain/src/tuning.ts`)

```ts
SAMPLE_BASE_YIELD = 5            // units; actual = max(1, round(5 * conc/100))
SAMPLE_DURATION_SECONDS = 10
SPOT_SAMPLE_POOL = 5             // hand-samples per pilot per spot
ENERGY_CAP_SAMPLES = 10          // cap = 10 * SAMPLE_ENERGY_COST raw
ENERGY_REGEN_SAMPLES_PER_HOUR = 0.5
HULL_CEILING_EXPONENT = 1.2
HULL_TIER_BASE = { scavenged: 75, patched: 30, basic: 240, strong: 480, exceptional: 700 } // minutes
RUN_TAILS_MINUTES = [15, 60, 240]            // player-facing picker; 20-min tier cut
TUTORIAL_RUN_1_MINUTES = 2                   // 5% hull, falls out of formula
TUTORIAL_RUN_2_MINUTES = 5                   // 30% patched hull
TUTORIAL_RUN_1_YIELD_FLOOR = 25              // scripted, never less
TUTORIAL_RUN_2_YIELD = 60                    // Decision 017 generosity floor
TUTORIAL_ORDER_SA_STACK = 20                 // one Structural Alloy stack
TUTORIAL_ORDER_CM_STACK = 12                 // one Conductive Metal stack
EVENT_WINDOW_SLOTS = { short: 2, push: 3 }   // 15–60m: 2 slots @ 55%; 240m: 3 slots
EVENT_WINDOW_FIRE_CHANCE = 0.55
SCAVENGED_HULL_INTEGRITY = 5                 // %
PATCHED_HULL_INTEGRITY = 30                  // %
```

---

## Phase 0 — App shell, design system, route skeleton

**Objective:** the terminal/console identity and the four-screen skeleton exist; old routes still function untouched.

**Build:**
- `apps/web/src/lib/theme.css` — CSS custom properties: near-black background, single phosphor accent (green), one warning accent (amber), one danger accent, monospace font stack, scanline-subtle borders. Every later component uses only these variables.
- Rewrite `apps/web/src/routes/+layout.svelte`: global theme import; persistent nav bar `[F]IELD  [S]ETTLEMENT  [W]ORKSHOP  [R]IG` with keyboard shortcuts F/S/W/R; a slot for the one-line mission ticker (wired in Phase 4); exactly one nav item may carry the "next action" highlight, driven by tutorial state (wired in Phase 7, hardcoded off until then).
- Skeleton routes, each rendering a framed placeholder: `apps/web/src/routes/field/+page.svelte`, `settlement/`, `workshop/`, `rig/` (+ empty `+page.server.ts` each).

**Delete:** `apps/web/src/lib/layout/loopNav.ts` (replaced by the new nav); its imports in the old layout.

**Accept:** `pnpm -r check` green; `pnpm dev` shows the new shell; F/S/W/R keys navigate; old routes (/survey etc.) still load inside the new shell.

---

## Phase 1 — Domain rebalance + new domain systems (pure TS, test-first)

**Objective:** all Decision 022 math exists in `packages/domain` with tests. No UI.

**Build:**
- `packages/domain/src/tuning.ts` — the constants block above, exported and consumed everywhere below.
- `packages/domain/src/survey/depositTopology.ts` — per-resource-instance concentration field. Deterministic from resource instance id (reuse `seededRng` — move it to `packages/domain/src/rng.ts` since survey now needs it). Grid ~16×11 tiles. Rolls 1–3 peaks; peak maxima drawn from the instance's `concentration_range` (Decision 020 field); smooth radial falloff; guarantee at least one tile within the bottom third of the range adjacent to the player spawn tile (the "first scan lands low" rule). Exports: `getTopology(instanceId)`, `concentrationAt(topology, x, y)`, `spotIdFor(instanceId, x, y)`.
- `packages/domain/src/survey/prospectingSampling.ts` — REWRITE: yield = `max(1, round(SAMPLE_BASE_YIELD * conc/100))`, replacing the flat `SAMPLE_TRICKLE_UNITS`. Per-spot pool enforcement against `SPOT_SAMPLE_POOL`. First-sample-reveals-stats behavior preserved.
- `packages/domain/src/survey/surveyEnergyOutlook.ts` — REWRITE to continuous trickle: state = (rawEnergy, updatedAt); accrual = elapsed hours × `ENERGY_REGEN_SAMPLES_PER_HOUR` × sample cost, clamped to cap. Pure function `accrueEnergy(state, now)`.
- `packages/domain/src/thumper/hullRunCeiling.ts` — `maxRunMinutes(tier, integrityPct) = HULL_TIER_BASE[tier] * (integrityPct/100)^1.2`. Helper `availableTails(tier, integrityPct)` filters `RUN_TAILS_MINUTES` (plus tutorial tails when tutorial state demands).
- Modify `packages/domain/src/thumper/resolveThumperRunResult.ts` + `packages/db/src/queries/thumperRunResolution.ts`: hull reaching 0 mid-run ⇒ **fail-safe auto-recall**: run resolves early at the hull-out timestamp, pro-rata yield kept, result flagged `recall_reason: 'hull_failsafe'`. Assert no code path destroys a thumper; remove any that does.
- Event pacing: modify `generateThumperEventWindows.ts` to `EVENT_WINDOW_SLOTS`/`FIRE_CHANCE` (15–60m: 2 slots @ 55%; 240m: 3 slots).
- **Frame removal (Decision 022 element 5):** delete `frameActionEffects.ts`; remove frame parameters from `getEventWindowResponseOptions.ts`, `thumperWindowResolution.ts`, `eventWindowOutcome.ts` and all signatures that thread frames through. Event responses become frame-less choices with the same three verbs (read / reinforce / suppress) available to everyone.
- `packages/domain/src/settlement/` (new module): `types.ts` (Order = family, stackSize, boundInstanceId | null, delivered, status), `orderBinding.ts` (binds on first sample of a candidate; computes tracker display state incl. split-stack warning), `milestones.ts` (ordered milestone list: `fabricator_online` → grants thumper schematic + scavenged parts; `next_need` posting).

**Delete:** `packages/domain/src/thumper/frameActionEffects.ts`; `packages/domain/src/crafting/starterStockpile.ts` and `packages/domain/src/thumper/starterWornParts.ts` (the settlement bootstrap replaces starter kits — Phase 7 grants scavenged parts via milestones); `assertVeyrithTutorialWindowsReady.ts` (old tutorial assertion; new scripted windows arrive in Phase 7 — if `generateFirstSessionEventWindows.ts` is imported by live resolution code, strip the frame logic now and leave its rewrite to Phase 7).

**Accept:** `pnpm --filter domain test` green including NEW tests: topology determinism + low-first-scan guarantee; sample yield at 25/65/88% = 1/3/4 units; energy accrual/clamp; hull ceiling 5%≈2min, 30%≈7min, 80% basic≈184min; auto-recall pro-rata; order binding + split-stack state. `pnpm -r check` green (db/web compile against changed signatures).

---

## Phase 2 — DB schema + queries

**Objective:** persistence for settlement, tutorial state, energy trickle, sample pools.

**Build (schema + drizzle migration via `db:generate`/`db:migrate`):**
- `settlement_orders` (id, milestone_key, family, stack_size, bound_instance_id nullable FK, delivered_units, status, created_at).
- `settlement_milestones` (key, unlocked_at nullable) — seeded rows per `milestones.ts`.
- `pilot_tutorial_state` (pilot_id PK, step text, updated_at) — steps enumerated in Phase 7.
- Modify `pilot_survey_energy` → trickle fields (raw_energy, updated_at); migrate existing rows.
- Add `samples_taken` int to `pilot_deposit_spot_samples` (pool enforcement).
- Pilots: drop `frame` column; drop `starter_stockpile` flag (migration; data loss accepted — playtest DB).
- Queries: `packages/db/src/queries/settlement.ts` (orders CRUD, bind, deliver-stack transaction: consumes a resource stack via existing `resourceConsumes`, increments delivered, flips milestone when filled), `tutorialState.ts`, rework `prospecting.ts` for topology spot ids + pool counting.

**Delete:** `packages/db/src/queries/starterStockpile.ts`, starter-stockpile branch in `packages/db/src/seed/bloomOneSeed.ts`, frame columns/usages in `thumper_runs` queries (migration drops `thumper_runs.pilot_frame`).

**Accept:** `pnpm --filter db test` green with new tests for deliver-stack (rejects mixed stacks, rejects wrong family, completes order exactly at stack_size) and energy accrual round-trip. Migrations apply cleanly to the dev DB.

---

## Phase 3 — FIELD screen

**Objective:** the heart of the game on one screen, replacing survey/deploy/run/claim.

**Build under `apps/web/src/lib/field/` + `routes/field/`:**
- `FieldMap.svelte` — ASCII grid render per spec §4 sketch: `@` player, `▲` waypoints, `~` shading only on scanned tiles, concentration readout panel (HERE %, best-so-far, range hint). Pure render from server-provided view state.
- Server load + form actions in `routes/field/+page.server.ts`: `scan` (reveal current tile %), `move` (4-dir, energy-free, advances position in session state), `sample` (10s commitment: action returns pending state w/ completes_at; UI shows progress bar; completion grants units + stat reveal + waypoint + binds active order via `orderBinding`), `selectFamily`/`selectResource` (row lists, not dropdowns), `deploy` (on current spot or chosen waypoint: tail picker filtered by `availableTails` from the equipped hull), `respondEventWindow`, `claim`.
- Watched-run mode: when an active run's tail ≤ 5 min (tutorial) the FIELD screen swaps to rig-view: thumper ASCII art, live countdown, threat meter, event windows surfacing as choice rows, recall banner (verbatim spec copy), claim button on completion. Poll via `invalidate` every few seconds — no websockets.
- Waypoints panel: known spots with remaining units ("Sorrel ridge: ~210u left") and expiry-killed spots removed.
- Energy bar component (adapt `SurveyEnergyMeter.svelte`, move to `lib/field/EnergyBar.svelte`).
- Telemetry: `first_scan`, `first_move`, `first_sample`, `first_stat_reveal`, `first_deploy`, `event_window_resolved`, `first_claim`, `second_deploy_voluntary`.

**Delete:** `routes/survey/`, `routes/deploy/`, `routes/run/`, `routes/claim/` (all files); `lib/server/surveyLoad.ts`, `deployLoad.ts`, `runLoad.ts`, `claimLoad.ts`, `claimWorkflow.ts` (claim logic moves into field workflow), `lib/surveyScreen.ts`, `lib/server/targetResource.ts` if its remaining consumers died with the old routes; `lib/SurveyEnergyMeter.svelte` (moved).

**Accept:** manual: full loop scan→move→sample→deploy→watch→claim on a dev pilot entirely on /field; old route URLs 404 or redirect to /field; `pnpm -r check` green; zero `<select>` in new code.

---

## Phase 4 — SETTLEMENT screen

**Objective:** the why. Foreman board, adaptive tracker, turn-ins, milestones.

**Build under `lib/settlement/` + `routes/settlement/`:**
- Board: posted orders as mission cards; the adaptive tracker per spec §4.2 — family-level until bound (`30 units — ONE Structural Alloy stack (no mixing)`), then `BENDREL RIDGE ALLOY — 13/30 — single stack` + one-shot nudge line; split-stack state shows both candidates with "only one stack counts".
- Turn-in flow: eligible stacks as selectable rows; delivery via the Phase 2 transaction; contribution bar fills; on milestone completion a full-screen takeover moment (`FABRICATOR ONLINE` — big ASCII, one keypress to continue).
- Foreman dialogue panel: lines from `lib/copy/foreman.ts`, keyed by tutorial step/milestone.
- Mission ticker line in the layout slot (active bound order, x/N), visible on FIELD.
- Root route `/` becomes a server redirect: tutorial incomplete → current tutorial screen; else → /settlement.
- Telemetry: `first_family_chosen`, `turn_in_completed`, `fabricator_online_seen`.

**Delete:** old pilot-home content — `lib/pilotHome.ts`, `lib/pilotHome.test.ts`, the old `routes/+page.svelte` body (file remains as redirect), `routes/+page.server.ts` rewritten to the redirect logic only.

**Accept:** manual: post-Phase-2 seeded orders visible; sampling on /field updates the ticker and binds the tracker; turn-in completes a milestone with the takeover moment; `/` redirects correctly.

---

## Phase 5 — WORKSHOP screen

**Objective:** crafting as physical assembly. No dropdowns, no jargon-first.

**Build under `lib/workshop/` + `routes/workshop/`:**
- Schematic list: flat rows w/ readiness states (from `schematicReadiness`).
- Schematic detail: ASCII diagram of the item with labeled slot boxes (e.g. the thumper chassis showing HULL / DRILL / PUMP sockets); selecting a slot opens a flat list of eligible stacks (class-call filtering via existing `craftSlotAllocation`), showing the stats the slot reads and the projected property bands (`propertyBand`, `PropertyPreview` logic re-implemented in the new visual language).
- Tuning: point allocation as +/- rows (port logic from `TuningPanel`).
- Assemble action → existing crafting attempt path (`packages/db/queries/crafting.ts`), result explanation via `buildCraftResultExplanation`.
- New schematic: `packages/domain/src/crafting/schematics/thumperChassisAssembly.ts` — the tutorial rig assembly (slots: hull plate, drill head, pump; accepts the scavenged/worn parts granted by the fabricator milestone).
- Telemetry: `rig_assembled`, `schematic_opened`.

**Delete:** `routes/craft/` (all files); `lib/craft/` entirely (`CraftWorkbench.svelte`, `SlotSelector.svelte`, `PropertyPreview.svelte`, `TuningPanel.svelte`, `equipCraftedItem.ts` — equip moves to RIG in Phase 6, port the logic); `lib/server/craftLoad.ts`.

**Accept:** manual: craft a Survey Scanner Mk I end-to-end in the new flow; assemble the tutorial thumper from granted parts; domain + db tests green.

---

## Phase 6 — RIG screen

**Objective:** your machine as a place: status, wear, ceiling, repair, equip.

**Build under `lib/rig/` + `routes/rig/`:**
- Chassis ASCII with slotted components, per-component wear bars, hull integrity and the derived ceiling stated plainly: `MAX RUN: 7 MIN — hull limited`.
- Equip/swap flow (port from old `equipCraftedItem` + `thumperPartEquipment` queries) as slot → flat candidate list.
- Repair: field repair kit usage (existing `fieldRepair` domain/queries) as an action row per damaged component; repair debt from auto-recalls surfaces here.
- Resource stacks readout (compact, grouped by family — replaces the inventory page; stacks also remain visible where they're chosen in WORKSHOP/turn-ins).

**Delete:** `routes/inventory/` (all files).

**Accept:** manual: post-recall repair debt visible and repairable; equipping a better hull visibly raises MAX RUN; inventory URL gone.

---

## Phase 7 — Tutorial orchestration, prologue, telemetry completion

**Objective:** the spec §6 clock, driven by a server-side state machine — not client trickery.

**Build:**
- `pilot_tutorial_state.step` progression: `prologue → first_orders → hunting → turn_in → fabricator_online → assemble_rig → first_deploy → recall_lesson → hull_patch → second_deploy → full_claim → async_reveal → done`. Transitions server-side in the relevant actions; each screen reads the step to decide its highlighted next action (the Phase 0 nav highlight) and any gated content.
- Prologue screen (`routes/prologue/` or a takeover at `/`): the three locked lines, one keypress through.
- Scripted beats: fabricator milestone grants schematic + worn drill + pump + **scavenged hull at 5%**; first deploy forces tail = ceiling (≈2 min) and fires window 1 (Signal Drift) before the hull-out auto-recall with yield = `max(prorata, TUTORIAL_RUN_1_YIELD_FLOOR)`; `hull_patch` step sets hull to 30% (free, foreman line); second deploy allows tail 5 min, fires Signal Drift + Pump Strain, resolves with `TUTORIAL_RUN_2_YIELD`; full claim shows the hand-vs-machine yield comparison line; async reveal posts the next order and unlocks the real tail picker.
- Rewrite `generateFirstSessionEventWindows.ts` → `tutorialEventWindows.ts` (frame-less, the two scripted windows); rewrite/replace `resolveFirstSessionThumperRunResult.ts` and `isTutorialThumperDeploy.ts` against the state machine.
- Remaining telemetry: `prologue_done`, `second_family_started`, `async_duration_chosen`, `return_visit` (layout server hook: gap > 4h since last event ⇒ emit).
- Delete old telemetry emissions: grep for the Decision 011/013 event names (`frame_chosen`, `veyrith_copper_recommended`, `spots_sampled_before_deploy`, `extraction_tail_chosen`, `two_resources_compared`, etc.) and remove every call site. Old rows in `playtest_events` stay (historical data); only the emitting code dies.

**Delete:** `packages/domain/src/thumper/generateFirstSessionEventWindows.ts`, `resolveFirstSessionThumperRunResult.ts`, `isTutorialThumperDeploy.ts` (each replaced above); any remaining frame_chosen UI.

**Accept:** **the spec §6 clock, walked end-to-end on a fresh pilot in a reset dev DB**: prologue → orders → hunt/bind/sample → turn-in → FABRICATOR ONLINE → assemble → 2-min watched run → recall banner verbatim → 25u floor → patch → 5-min run → 60u claim → comparison line → async reveal. Telemetry rows for every §9 event in order. Target wall-clock ≤ 20 min moving deliberately.

---

## Phase 8 — Demolition audit + polish sweep

**Objective:** prove "no dead code" and "no dropdowns" are true, then tighten copy.

- `grep -rn "<select" apps/web/src` → **zero hits**.
- Dead export hunt: every file under `apps/web/src/lib` and `packages/*/src` must have a live importer (entry points excepted). Delete anything orphaned — likely candidates: `displayLabels.ts`, `surveyClarity` UI helpers, `redMesaSurvey.ts` if `activeBloomSurvey` superseded it, old `complicationTable` entries for frame-specific actions.
- Jargon pass: every named term a player sees (family names, resource names, threat, integrity) is introduced by foreman copy or inline parenthetical before first unexplained use. The §3 rule: the interface is the in-fiction tool.
- `pnpm -r check`, `pnpm --filter domain test`, `pnpm --filter db test`, `pnpm build` — all green.
- Update `design-docs/BUILD_PLAN.md` §9–13 pointer block with a one-paragraph note that Decisions 008/011/015 are superseded by 022 and this plan.

---

## Phase boundaries = commits

One commit per phase minimum, message prefix `slice:` (e.g. `slice: phase 3 — FIELD screen, retire survey/deploy/run/claim routes`). Push after each phase so review can happen per-phase.

## What the implementing agent must NOT do

- Do not modify: bloom generation (`bloomGenerator.ts`, `bloomOneSeed.ts`), schematic stat weights (`liveSchematicStatWeights.ts`, Decision 016/021 numbers), the economy ledger, resource stat math, `playtest_events` schema.
- Do not add features not in the spec (no chat, no maps beyond the topology grid, no second thumper slot, no combat).
- Do not soften the deletes. If something in a DELETE list seems still-needed, the correct response is to port the needed logic into the new module in the same phase, then delete the file anyway.
- Do not invent player-facing copy where the spec locks it (prologue, recall banner, tracker formats).
