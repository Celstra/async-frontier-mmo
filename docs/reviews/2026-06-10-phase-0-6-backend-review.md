# Phase 0–6 Backend Review — pre-Phase-7 gate

> CONTINUED: Phase 7–8.1 review appended below as CP7/CP8 (2026-06-10 evening).

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
| CP7 | Phase 7–8.1 review: six screens + telemetry, UX findings | DONE | Health green (126 domain / 22 db tests). Findings below. |
| CP8 | UX pass: run-screen consequence feedback + player-language sweep | DONE | All 3 batches applied 2026-06-10; suite green (131 domain / 23 db). |

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

---

## CP7 — Phase 7–8.1 review (2026-06-10 evening)

Health: `pnpm check` clean; domain 126/126; db 22/22. All six screens + Decision 013
telemetry committed (5b2d70a..79bd015). Structure is right: screens load via server,
domain/db boundaries respected. The problems are comprehension, not wiring.

### UX-1 (the big one) — Event windows give zero consequence feedback

`apps/web/src/routes/run/+page.svelte`: after responding, a window shows only
"Responded: Signal Tune — sharpen the lock". Nothing tells the player:
(a) what the response just did (no meter delta, no outcome line);
(b) what would have happened on hold (stakes are invisible before choosing);
(c) what each option costs/risks.
Backend reality: `thumper_event_windows` stores only complication/response/timestamps —
no before/after state (Decision 012 actually requires before/after on the window record).
Resolution math runs at claim. The claim screen's explanation chain is good, but the
comprehension moment is at the window, not 60s later.
Decision 013's "event-action comprehension" gate cannot pass with this UI.

### UX-2 — Dev/designer language leaks into player screens

Player-facing copy cites decision numbers and internal jargon everywhere:
"Run state (Decision 005)", "Decision 019 — family scan lists…", "Decision 013
comprehension: every line below…", "Thinking-craft (Decision 008)", "Absent-player
fallback (Decision 005): … Jobs/workers apply that later", "(client countdown; server
timestamps are authoritative at claim)". A playtester should never see decision IDs,
"jobs/workers", or architecture notes. These belong in code comments or dev-only blocks.

### UX-3 — Dev debug blocks render inside the player flow

Pilot Home bottom: "Dev: resource stat codes from shared: OQ, conductivity…" and
"Dev: thumper state from server (none): no thumper deployed" sit directly under the
main nav links. They are `import.meta.env.DEV`-gated but visually indistinguishable
from game UI. Same for the claim screen dev audit (that one at least has a border).
Dev output needs to be visually quarantined (collapsed details element) or removed.

### UX-4 — No persistent navigation or loop orientation

Each screen has ad-hoc links ("← Pilot Home", "Red Mesa Survey → · Crafting + Gear →").
The loop (Survey → Deploy → Run → Claim → Craft) is never shown, so the player can't
see where they are in it. A small persistent header nav in +layout.svelte showing the
loop stages (with current stage highlighted and run-status badge) would orient every
screen at once.

### UX-5 — Raw internals shown to players

- Deploy screen shows `Spot: veyrith_copper:spot:2` (raw spot id) instead of "Spot 3".
- Family scan button text: "Scan conductive metal family (−8 energy)" via
  `replaceAll('_',' ')` on an enum id.
- Claim totals list "Resolution: completed" (raw enum).
- Tail picker shows "~0.50× passive yield vs 1 h" — multiplier math without saying
  what it means in units; preview doesn't update projected units per tail.

### UX-6 — Confirmation/feedback states are thin

Sample outcome is one small line; craft results exist but success states generally
render as bare `<p><strong>{form.message}</strong></p>`. No visual differentiation
between error and success anywhere (same markup for both).

### CP8 — Proposed UX fix batches (composer-2.5)

- Batch 1 (UX-1): per-window stakes + consequence feedback. Before responding: each
  option shows its effect in plain language with real domain numbers (matching action:
  what it protects + frame bonus if any; hold: the bounded penalty; recall: keep
  secured / forfeit rest). After responding: an outcome line with meter deltas
  ("Signal Lock 62% → 90%, projected recovery preserved"). Backend: compute window
  outcome at respond time from existing domain math; store before/after snapshot on
  the window row (closes the Decision 012 gap) and surface it in load/action returns.
- Batch 2 (UX-2/3/5): player-language sweep across all six screens — strip decision
  numbers and architecture notes from player copy (move to code comments), humanize
  enums/ids (spot labels, resolution labels, family names), quarantine dev blocks in
  collapsed <details class="dev"> styling.
- Batch 3 (UX-4/6): persistent loop nav in layout (Survey → Deploy → Run → Claim →
  Craft with active stage + run badge), distinct success/error message styling,
  richer sample/craft confirmation lines.

### Production-point question (Ryan): solo fun vs testers

Decision 014 ladder: Stage 3 (clickable vertical slice — now) is tuned by RYAN ALONE
until the loop feels worth repeating; Stage 4 (instrumented playtest, the build 8.1
telemetry exists for) is when 2–5 outside testers come in. BUILD_PLAN §15/§19 quotes
"playtesters" only at the gate review. If it isn't fun solo, testers only confirm
that. Current verdict "flow is terrible" = correct Stage 3 signal; fix UX, self-tune,
then recruit.

### CP8 — Resolution (applied via composer-2.5 agents, all verified)

- Batch 1 (UX-1): new domain module `eventWindowOutcome.ts` — `describeEventWindowStakes`
  (per-option plain-language stakes with real numbers shared with claim math),
  `resolveEventWindowOutcome` (deterministic before/after meter snapshot), consistency
  test proving stakes preview == claim-time hold penalty. Migration 0023 adds
  `before_state`/`after_state` jsonb to thumper_event_windows (closes the Decision 012
  gap); respond stores the snapshot; run screen shows stakes under each button before,
  and "Signal Tune — Signal Lock 62% → 90% (+5 Recon bonus)" style outcome lines after.
  Run meters now chain from the latest after_state.
- Batch 2 (UX-2/3/5): decision citations and architecture notes removed from all player
  copy on Home/Survey/Deploy/Claim/Craft; `displayLabels.ts` helpers humanize families,
  spots ("Spot 3"), resolution types, part slots, tails; dev blocks quarantined in
  collapsed `details.dev-panel`; success/error messages use flash classes.
- Batch 3 (UX-4/6): persistent loop nav in layout (Home · Survey → Deploy → Run → Claim
  → Craft + Gear, active stage highlighted, one-query run badge), global flash/dev-panel
  styles, text-first typographic baseline (~52rem container).
- NOTE (process): migrations 0020–0022 from the Phase 7 lessons were hand-written again
  without meta snapshots — the same drift fixed in CP6. Agent 1's 0023 snapshot re-synced
  the chain (db:generate clean again). Future lessons: always use `db:generate`, never
  hand-write journal entries.
- Leftovers flagged, not blocking: claim `explanation.summary` prose may still contain a
  raw resolution word; per-tail projected units not exposed server-side (tail options use
  qualitative phrasing); stat codes (OQ etc.) intentionally kept as game vocabulary.

### Next after CP8

Stage 3 self-tuning: Ryan plays the loop solo until it earns repeats; then Lesson 8.2
(production-point review prep) and a 2–5 tester instrumented playtest (Stage 4).

---

## CP9 — First solo-playtest findings + fixes (2026-06-10 night)

Ryan's Stage 3 playtest surfaced: craft tuning/crafting reloads jump to page top with no
feedback; nav badge stuck on "active" when claimable; equip 500 then "server dead"; event
windows are a non-choice ("yeah why not tune"); resource slotting feels like accepting
defaults; tuning feels bad.

**Root cause of the 500/dead server: Postgres connection exhaustion.** `getGameDb()`
created a NEW postgres.js pool on every load/action (and the new layout badge load made it
every navigation) and never closed it → "FATAL: sorry, too many clients already" → every
action 500s. Fixed: pool cached on `globalThis` (HMR-safe singleton) in
`apps/web/src/lib/server/gameDb.ts`; Postgres container restarted to clear leaked
connections. The dev server itself was never dead.

**Event tension design (implemented as tunable domain data, numbers NOT locked — Ryan
locks after play):** each window rolls a visible severity (minor/serious) from the run
seed (tutorial always minor); hold penalty scales with severity; matching actions now cost
small Condition wear on the related part (Signal Tune→Drill, Clear Pump→Pump, Suppress
Threat→Hull; Field Repair burns the kit); frame bonus unchanged. The choice each window:
"is this complication bad enough to spend gear condition on?" Stakes preview numbers are
consistency-tested against claim math. Severity persisted on windows (migration 0024).

**Craft screen rebuilt (kimi-k2.5):** client-side workbench (`lib/craft/`) — slot
comparison cards with per-slot relevant stats and live what-if deltas ("Survey Clarity
71 → 83"), +/- tuning steppers with remaining-of-3 and per-line ceilings, Safe/Careful as
a stakes choice, craft result inline with fresh idempotency key per attempt, equip/repair
flashes adjacent to item rows. Live preview runs the pure domain `previewCraftProperties`
client-side; server remains authoritative.

**Run screen rebuilt (kimi-k2.5):** severity-treated window cards, options as decision
cards showing benefit AND cost, stored outcome lines after responding, status banner
(active/ready-to-claim/recalled), Projected Recovery as the primary meter.

**Also:** use:enhance on Home/Survey/Deploy/Claim forms (no more scroll-to-top), badge
gains 'ready to claim' state.

## CP10 — Deposit spot depletion (Decision 019 gap, Ryan: "it was always moving in SWG")

Spots were infinite — re-deploying the same high spot forever at the same yield. Now:
- `deposit_spot_yields` world-state table (migration 0025): deterministic capacity
  150–400 units per spot (floor clears the ~118-unit tutorial claim), drained atomically
  inside the claim transaction; payout capped at remaining units with an explanation line
  ("The deposit ran dry…"); exhausted_at set at zero.
- Survey shows sampled spots as Rich / Thinning / Nearly dry / Exhausted; exhausted spots
  lose their deploy link; deploy rejects exhausted spots server-side and caps the preview.
- Claim shows "This deposit is exhausted — survey for a new spot" when it empties.
- Sampling trickle does not drain. Stockpiles/provenance untouched.
- The SWG "it moved" feel = finite spots + hunt again + bloom lifespans/rotation.

**Verification (combined):** pnpm check clean; domain 140/140; db 28/28; smoke ok;
db:generate no drift; web build ok.

**Open for Ryan's next playtest:** do severity frequencies/penalties feel right; is
150–400 capacity the right hunt cadence; craft screen — does slotting now feel like a
decision? All knobs are domain constants.
