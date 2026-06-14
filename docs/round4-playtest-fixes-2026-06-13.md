# Round-4 playtest fixes — composer handoff (2026-06-13)

Implementing agent: **Cursor Composer**. Repo is a pnpm workspace — UI in `apps/web`,
pure game rules in `packages/domain` (no UI/DB imports), queries in `packages/db`.
Server-authoritative. After each group run `pnpm test` (domain + db) and
`pnpm --filter web check` (svelte-check). Constants marked **SIM-LOCKED** /
**SIM-GATED** come from `design-docs/`; do not change those numbers without
rerunning the named sim.

## Context — read first

This builds on `docs/first-loop-tightening-plan-2026-06-13.md` (Groups A–F). **That
plan is already implemented in the working tree (uncommitted).** A round-4 tutorial
walkthrough on 2026-06-13 ran against that WIP and found:
- bugs *inside* the new fail-safe / time code (Groups B);
- curation gaps the prior plan only half-closed (C, D1);
- the D2 dead-end the prior plan predicted, now reproduced live (pt 15);
- two features the tester explicitly asked for (live-rig dashboard, workshop stations).

This pass = **fix the WIP bugs + close the gaps + build the 2 features**. It is NOT a
rewrite of A–F; assume A–F's code is present.

### Sim gate (done — no new sims required)
`design-docs/first_hull_path_sim.py` (new, passing) models the tutorial-exit →
first-hull-craft path against live constants. Verdict:
- The hull-tier ceilings reproduce the playtest trip times exactly
  (`scavenged@5% = 2:04`, `patched@30% = 7:04`).
- **D2 order quantities `RC=12` / `CM=18` are SAFE** — they do not strand the hull.
  The pt-15 brick was **acquisition mode** (the tester *hand-sampled* ~11 RC and
  turned it all in; hand-sampling caps at ~4u/sample) not order size. RC is a
  **two-thump ask** (~44u from 1 waived + 1 recalled run) that comfortably clears the
  hull's 20 + the order's 12.
- First hull is ~2–4 short runs away with tutorial SA banked, ~8 from empty — the
  intended gate, not a wall. Grind levers (if testing says so) are listed in the sim,
  but **do not lower RC/CM for dead-end reasons**.

Events (`event_choice_liveness_sim.py`) and experimentation (`experimentation_sim.py`)
remain the locked stochastic models. The live-rig dashboard and workshop stations are
pure presentation — no balance, no sim.

## Prior-plan status verified in tree

| Group | State | This pass |
|---|---|---|
| A binding trap | ✅ bind gated on `energyCost>0` ([prospecting.ts:702](../packages/db/src/queries/prospecting.ts)); copy in constants.ts | Group 5 turns long copy into a tag |
| B fail-safe visibility | ⚠️ built, **buggy** | Group 1 (float time ×2, footer overflow) |
| C curation | 🟡 foreman lines ✅; workshop default partial | Groups 2, 3 |
| D1 shopping list | 🟡 rollup in workshop, not on FIELD ticker | Group 6A |
| D2 order alignment | 🟡 constants only ([tuning.ts:39](../packages/domain/src/tuning.ts)) | Group 6 (SIM-GATED, confirmed) |
| E event variability | ✅ domain (ranges + meter coupling) | Group 4 makes it *visible* |
| F experimentation | ✅ domain + 2-pulse UI | not touched this pass |

---

## Group 1 — Time + fail-safe display bugs (P0, trivial, do first)

The tester saw `rig secured at 2:3.588061121938267` and `secures at ~7:4.441666…`.
Two separate functions format `m:ss` without flooring the seconds.

### 1A. `formatMmSs` (run header + result + countdown)
[`apps/web/src/routes/field/+page.svelte:31`](../apps/web/src/routes/field/+page.svelte) —
`const seconds = totalSeconds % 60;` must floor:
```ts
const seconds = Math.floor(totalSeconds % 60);
```
Fixes the run-header `… remaining`, the `FAIL-SAFE TRIPPED — rig secured at m:ss`,
and the `fail-safe in m:ss` lines.

### 1B. `hullDeployWarningLine` (deploy preview "Secures at ~m:ss")
[`packages/domain/src/thumper/hullTier.ts:74`](../packages/domain/src/thumper/hullTier.ts) —
same bug, separate code path:
```ts
const seconds = Math.floor(effectiveSeconds % 60);
```

### 1C. ASCII footer overflow → `(fail-s` truncation
The deployed-rig footer is `${hullLine} · THREAT ${threat}%` where `hullLine`
includes integrity + `(fail-safe)`. At ~52 chars it overflows the 38-char frame and
`center()` truncates it ([`thumperAscii.ts:28`](../apps/web/src/lib/rig/thumperAscii.ts);
footer assembled at [`field/+page.svelte:43`](../apps/web/src/routes/field/+page.svelte)).
**Do not widen the frame.** Pull hull condition, integrity, threat OUT of the ASCII
footer and into a real meter panel — this is exactly Group 4, so implement them
together. Interim (if Group 4 slips): keep only `HULL nn%` in the footer and move the
integrity/`(fail-safe)`/threat into the existing `.meter-list`
([`field/+page.svelte:231`](../apps/web/src/routes/field/+page.svelte)).

### 1D. Frozen result keeps ticking
Prior plan B2 flagged the result-view countdown not stopping. Verify the
`frozenResult` branch ([`field/+page.svelte:117`](../apps/web/src/routes/field/+page.svelte))
clears the interval; the `FAIL-SAFE TRIPPED` line must be static.

**Tests:** unit-test `formatMmSs` and `hullDeployWarningLine` with float inputs
(e.g. `123.588 → "2:03"`, effective `424.4 → "7:04"`).

---

## Group 2 — Navigation truth (P0)

**Symptom (pts 4, 8, 9, 10):** FIELD stays highlighted when the player must turn in
or acknowledge at SETTLEMENT; player gets lost on every round trip.

**Root cause:** the nav highlight (and foreman line) are a **pure function of
`tutorialStep`** — [`tutorialNextActionScreen(step)`](../packages/domain/src/tutorial/tutorialSteps.ts)
consumed at [`+layout.server.ts:32`](../apps/web/src/routes/+layout.server.ts) /
[`+layout.svelte:60`](../apps/web/src/routes/+layout.svelte). It goes stale whenever
the real next action depends on transient state the step hasn't caught up to:
- an order *completes in the field* but step is still `hunting` (→ field) when the
  player should turn in (→ settlement);
- a *claim is pending* on field after a recall;
- a *claim was acknowledged* and a foreman briefing is waiting at settlement.

**Fix:** make the next-action screen state-aware, not step-only. Either (preferred)
advance the tutorial step on those events (order-filled → `turn_in`; claim-pending
holds `field`; ack’d → settlement step), or compute `nextActionScreen` in
`+layout.server.ts` from live state (open-order-ready, claimable run, pending
briefing) layered over `tutorialNextActionScreen`. The foreman line
([`foreman.ts`](../apps/web/src/lib/copy/foreman.ts)) must agree with the highlight at
every step — verify the pair together.

---

## Group 3 — Workshop: station selector + step-aware default (P1, new feature)

**Symptom (pts 7, 11):** after assembling the rig, the workshop defaults to the
locked Survey Scanner and shows "cannot craft" — feels like a punishment. Later the
scanner is auto-selected again. The tester proposed a stations model.

### 3A. Station selector — Thumper / Fabricator
Add a top-level station picker to the workshop: **Thumper** (rig assembly / equipped
parts) first, **Fabricator** second. Selecting Fabricator shows the schematic list
top-to-bottom with the **fabricator ASCII art on the right** (reuse the once-shown
fab art — promote it from the unlock cutscene into a reusable asset in
[`apps/web/src/lib/ascii.ts`](../apps/web/src/lib/ascii.ts), mirroring how the thumper
art renders). Wire in [`workshop/+page.svelte`](../apps/web/src/routes/workshop/+page.svelte)
and [`WorkshopBench.svelte`](../apps/web/src/lib/workshop/WorkshopBench.svelte).

### 3B. Step-aware default schematic
[`defaultSchematicId()` at `workshopLoad.ts:306`](../apps/web/src/lib/server/workshopLoad.ts)
falls to `SURVEY_SCANNER_MK_I` at `first_deploy` (post-assembly) — the "cannot craft"
dump. Extend it: at `first_deploy` do **not** default to the scanner — either redirect
to FIELD (the foreman already says "Deploy on the deposit — FIELD") or show an
assembled-rig confirmation. Keep `assemble_rig → chassis` and `done & !ownsHull →
reinforced_hull_plate`. Never auto-select a locked schematic.

### 3C
Remove the scanner auto-highlight when nothing scanner-related is the current goal.

---

## Group 4 — Live Rig dashboard, lean (P1, new feature)

**Symptom (pts 8, 13 + closing note):** events read as a solved/opaque equation
("5 units of what?", "is anything random actually happening?"), and the run has no
"place." The tester asked for a live rig view with `▓▓▓▓▓` bars for each component,
where events are answered and you watch choices move the meters.

**Scope this pass (lean):** a RIG run-view (extend the existing field rig view, or a
dedicated RIG section) that renders, using the existing `SegmentedBar` `▓` component:
- **Signal Lock**, **Pump Flow** (already in `runMeters`) as bars;
- **Hull condition** and **Hull integrity** as distinct bars (integrity styled apart;
  this is where the fail-safe story lives — replaces the Group 1C footer);
- **Drill condition**, **Pump condition**, **Threat** as bars;
- the event window inline, with the **range** ("Lose 4–8 units") and the realised roll
  in the resolved-window log (E is already seeded server-side — just surface it).

Bars update on the existing 3s poll ([`field/+page.svelte:60`](../apps/web/src/routes/field/+page.svelte)).
This makes E's variability legible and answers "is anything random happening" — the
matching action costs 9 Condition and resets the meter; Hold's loss scales with the
meter; the player can now *see* it.

**Future slice (documented, NOT this pass):** the full animated dashboard — per-event
delta animation, bar tweening, an arrival "deploy → RIG" transition. Logged here as a
follow-up slice; keep this pass static-on-poll.

---

## Group 5 — Teaching copy, tags, mode clarity (P1)

### 5A. Order-aware recommend TAG, tutorial-only
[`resourceTeachingNote` (`constants.ts:30`)](../apps/web/src/lib/field/constants.ts)
returns long orange paragraphs on every resource. During the tutorial, replace with a
short **`[RECOMMENDED]` tag** on the resource that is *hand-fillable for the current
order* (Sorrel/Red Mesa for the CM order; Keth for the SA order) — not Veyrith, which
is the thumper target. Veyrith gets a thumper-target tag only in a thump context.
After tutorial (`done`), show **no** recommend tags (the tester noted recommend tags
should be a tutorial-only training wheel).

### 5B. Order progress in the sample window
The sample-result block on FIELD should show progress toward the bound order
("11/12 toward order") so the player sees the order fill without leaving the screen.

### 5C. "Same waypoint" constraint (pt 12)
[`field/+page.server.ts:363`](../apps/web/src/routes/field/+page.server.ts) rejects a
second tutorial deploy on a new waypoint *after the fact*. Pre-warn at deploy time and
name the resource ("Second run uses your first waypoint — Keth Iron · Red Mesa"), or
lift the constraint. Don't surface it only as an error.

### 5D. Sampling-vs-thumping mode line
The tester wasted energy hand-sampling a spot they only needed to *thump* (pt 12).
Add one line distinguishing the modes where both are reachable: hand-sample = order
top-up (small, energy-bound); thumper = bulk haul (hull materials). This is the same
lesson the first-hull sim depends on (Group 6C).

---

## Group 6 — Hull path / D2 (P1, SIM-GATED — confirmed by first_hull_path_sim.py)

### 6A. Hull bill as the headline FIELD goal (D1 pin)
The workshop already shows `materialRollup`
([`workshop/+page.svelte:52`](../apps/web/src/routes/workshop/+page.svelte)), but the
player never sees a single "you need 100 SA + 20 RC, have X/Y" while hunting. Pin the
active hull bill to the FIELD order ticker
([`field/+page.svelte:166`](../apps/web/src/routes/field/+page.svelte)) so the player
hunts toward it. `schematicMaterialRollup` exists in
`packages/domain/src/crafting/experimentation.ts` — reuse it.

### 6B. Run-length must not mutate the shown mission (pt 14)
Selecting the 15-min run flipped the displayed "Current mission" CM→RC. **Diagnose**
why mission display is coupled to run-length selection (likely the order/mission is
re-derived as a side effect of the async-tail state transition in
[`firstAsyncTailState.ts`](../apps/web/src/lib/server/firstAsyncTailState.ts) or the
settlement load). The post-tutorial order must be **deterministic and decoupled** from
the run-length picker.

### 6C. Orders are subsets of the hull bill, not competitors
Keep `NEXT_NEED_ORDER_RC_STACK=12` / `NEXT_NEED_ORDER_CM_STACK=18`
([`tuning.ts:39`](../packages/domain/src/tuning.ts)) — **SIM-CONFIRMED safe**. Make the
RC order read as a *subset* of the hull's 20 RC (one thumped haul fills both), and
ensure CM 18 stays hand-fillable from leftover tutorial CM so it never touches SA/RC.
Combined with 5D + the live-rig framing, RC/SA acquisition points at the thumper, which
is what closes the dead-end. **Do not change quantities** without rerunning
`first_hull_path_sim.py`.

---

## Group 7 — Settlement landing acknowledgement (P2, optional)

On returning to SETTLEMENT mid-progress, give a foreman beat that confirms progress and
points to the next step ("Half the lot's in — back to FIELD for structural alloy").
[`foreman.ts`](../apps/web/src/lib/copy/foreman.ts); tie to the Group 2 live state so
copy and highlight agree. Low priority — Group 2 may make this redundant.

---

## Sequencing
1. **G1, G2** — P0 loop + truth bugs, cheap, ship first.
2. **G3, G4** — the two features that fix the worst feel (scanner dump, opaque runs).
   G4 absorbs G1C.
3. **G5, G6** — copy/tags + the SIM-GATED hull path.
4. **G7** — optional, likely folded into G2.

After landing, log the amendment in `design-docs/DECISION_LOG.md` referencing
`first_hull_path_sim.py`, and fix the stale anti-substitution ratio citation
("6.4–8.5%" → current 4.2–8.1%, 6.5% at Keth-PEAK) noted in the prior plan.

## Future slices (documented, not this pass)
- **Full animated Rig dashboard** — per-event delta animation, bar tweening, deploy→RIG
  transition (Group 4 is the static-on-poll precursor).
- **One-shot 15-min waiver UI hint** — the first-async waiver is worth ~2× a recalled
  run (sim); the deploy UI should signal it's a one-time bonus.
- **Reclaimer** (Decision 023 candidate) — recycler for stranded expired stacks.

## Manual verification path (full first loop)
prologue → settlement (one mission pre-selected, CTA to FIELD) → pick CM family →
free-taste does NOT bind → recommend **tag** points at the hand-fillable resource →
paid samples fill SA order (binds), order progress shows in sample window → return:
SETTLEMENT is highlighted (Group 2) → turn in → fab online → WORKSHOP defaults to
Thumper/chassis, station selector visible → assemble → not dumped on the scanner
(Group 3) → FIELD deploy: honest `secures at ~m:ss` (Group 1) → RIG dashboard shows
live bars + event ranges (Group 4) → recall → SETTLEMENT highlighted to acknowledge →
patch → hull bill pinned on FIELD ticker (Group 6A) → thump RC + SA (not hand-sample)
→ craft hull with a real experimentation choice → first 1h deploy.
