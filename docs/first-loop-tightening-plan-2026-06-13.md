# First-loop tightening + systems plan — 2026-06-13

Prompt for the implementing agent (Cursor Composer). Repo is a pnpm workspace:
UI in `apps/web`, game rules in `packages/domain` (no UI/DB imports), queries in
`packages/db`. Server-authoritative. After each group run `pnpm test`
(domain + db) and `pnpm --filter web check` (svelte-check). Constants marked
**SIM-LOCKED** come from the balance sims in `design-docs/` — do not change the
numbers without rerunning the named sim.

Source of this plan: a full tutorial walkthrough on 2026-06-13 (dev pilot
`2350ea6f-…`) plus two new sims —
`design-docs/event_choice_liveness_sim.py` and
`design-docs/experimentation_sim.py`. Read both sims' VERDICT sections before
starting Groups E and F; the locked constants below are their output.

Goal: a player should reach a satisfying first **1–2 hour** thump without
hitting a dead end. The walkthrough found four loop-killers (Groups A–D) and two
"boring system" gaps (Groups E–F).

---

## Group A — the binding trap (P0, do first)

**Symptom:** the tutorial tells the player to take the free "wow" sample on
Veyrith Copper. That sample binds the Conductive Metal order to Veyrith
(`bindSettlementOrdersOnSample`), so the recommended path commits the order to a
resource the player then can't farm by hand — energy-impossible. The free taste
should never bind; only a *paid* sample (a deliberate farming act) should.

### A1. Free samples do not bind the order
`packages/db/src/queries/prospecting.ts` (~line 702). The sample transaction
already has `sampleResult` in scope (it computed `energyCost`). The first sample
of a resource is energy-free (`sampleResult.energyCost === 0`). Gate the bind:

```ts
if (sampleResult.energyCost > 0) {
  await bindSettlementOrdersOnSample(tx, {
    pilotId: input.pilotId,
    resourceInstanceId: input.resourceInstanceId,
    family
  });
}
```

Player model becomes clean: **free taste reveals stats; the first paid sample
commits the order.** No new UI — the "YOUR COMMITMENT" panel already appears the
moment an order binds.

### A2. Copy nudges so the trap can't half-survive
`apps/web/src/lib/field/constants.ts` (~line 32, signal subtitles):
- Veyrith: append "— let the thumper haul this one; hand-fill orders from richer
  ground." (keep "recommended first thump target").
- Add a parallel hint where the Structural Alloy family lists Keth Iron: mark
  Keth as the hand-sampler's pick (it opens at 55–95%, fillable by hand), so the
  SA order isn't bound blind.

### A3. Test
Add/extend a db query test: a free (first) sample of a resource does NOT set
`bound_instance_id`; the next paid sample of the same family DOES. Reuse the
existing prospecting test harness.

---

## Group B — fail-safe visibility (P0)

**Symptom:** the scavenged/patched hull recalls the run early, but the player
can't see why. The trip time is **deterministic and known at deploy** —
`effectiveThumperRunDurationSeconds(hullConfig)` computes it from integrity at
deploy time. Surface it instead of letting it surprise.

### B1. Show integrity in the run header
`apps/web/src/routes/field/+page.svelte` (rig view, the `HULL nn% · THREAT nn%`
line). For a hull whose fail-safe is active, show both numbers and which one ends
the run:
`HULL — cond 55% · integrity 5% (fail-safe)`. Integrity styled distinct from
condition. `hullIntegrityAdvisoryLine` / `hullTierFromIntegrity` already exist.

### B2. Fail-safe countdown marker
The run already streams `rigView.thumperDemo.secondsRemaining`. Add a second
client-side marker for the fail-safe trip, derived from
`effectiveThumperRunDurationSeconds`: surface that effective duration in
`fieldLoad.ts` rig payload (compute it where the rig view is assembled), and in
`+page.svelte` render **"fail-safe in m:ss"** counting down alongside the run
timer. When it reaches 0, swap the timer line to a frozen
`FAIL-SAFE TRIPPED — rig secured at m:ss. Hull integrity spent.` and stop the
client tick (the result-view countdown currently keeps ticking — bug, fix it).

### B3. Honest deploy preview
The deploy panel already warns "the rig will secure itself early." Append the
number now that it's known: "…secures at ~m:ss." So the warning becomes a
prediction the player then watches happen — this is the lesson that motivates
the hull build.

---

## Group C — screen curation (P1)

Principle: **the tutorial curates every screen it sends you to.**

### C1. Workshop default schematic follows the step
`apps/web/src/lib/server/workshopLoad.ts` (~line 273). The fallback is hardcoded
`SURVEY_SCANNER_MK_I.id` (a locked scanner — confusing first thing post-fab).
Make the default step-aware: during `assemble_rig` →
`THUMPER_CHASSIS_ASSEMBLY.id` (already special-cased); once the tutorial is
`done` and no hull plate is crafted yet → `reinforced_hull_plate`; else current
behaviour. Pass tutorial step / hull-owned state into `workshopLoad`.

### C2. Foreman lines for the gap steps
`apps/web/src/lib/copy/foreman.ts` — the fallback "No open orders right now.
Check back after the next bloom rotation." fires at peak momentum (right after
fab comes online, step `assemble_rig`). Add cases:
- `assemble_rig`: "Parts are on the bench. Assemble your rig in WORKSHOP."
- `first_deploy`: "Rig's ready. Deploy on the deposit you sampled — FIELD."
Verify against `tutorialNextActionScreen` so copy and nav highlight agree.

### C3. One yield number per tutorial run
Tutorial-seeded runs show a scripted yield. Ensure the deploy button, foreman
line, and claim banner all read from the same scripted source — currently the
foreman promises "sixty units" while the deploy button can show "~28u" for the
same run. Single source of truth in the tutorial run config.

### C4. Kill dead copy
Remove "starter stockpile" references (workshop "can't craft yet" hints,
`apps/web/src/lib/server/workshopLoad.ts` material-shortfall lines). That text
describes removed-frame-era inventory that doesn't exist.

---

## Group D — the hull path (P1; D2 is a balance decision)

Post-tutorial reality: player holds ~86u Conductive Metal, the Reinforced Hull
Plate needs **100 Structural Alloy + 20 Reactive Crystal**, and the foreman
immediately posts a 30 SA order — the board sets the goal then taxes it.

### D1. Aggregate the hull shopping list (display — uncontroversial)
The schematic panel lists per-socket needs separately. Add a roll-up total on
the Reinforced Hull Plate schematic: "Needs 100 Structural Alloy + 20 Reactive
Crystal total." Then promote the deferred Group-E pin item: surface the active
hull bill on the FIELD order ticker so the player hunts toward it. (This was
backlog; the walkthrough makes it the #1 post-tutorial dead-end.)

### D2. Align next-need orders with the hull bill (**balance decision — confirm with Ryan**)
Instead of paying material rewards for turn-ins (breaks the turn-in-ledger
premise), align the post-tutorial orders so progress and goal point the same
way. Proposed quantities (tunable data per Decision 022,
`packages/domain/src/tuning.ts` NEXT_NEED_ORDER_*):
- Swap the SA-30 order for a **Reactive Crystal order (~12u)** — RC is also a
  hull ingredient, so filling the order doubles as hull prospecting.
- Keep a small CM order (~18u) — instantly fillable from the 86u Veyrith, a
  fast satisfying second turn-in.
- Every Keth (SA) unit thumped then flows untaxed to the 100-SA hull socket.
Result: 15-min Keth runs ×N → RC order chain → craft hull → first 1h thump,
with no activity competing against the goal. **Do not implement D2 until Ryan
confirms the order swap.**

---

## Group E — event variability (P1) — **SIM-LOCKED**

Source: `design-docs/event_choice_liveness_sim.py` (rerun it; read VERDICT +
the "2D SWEEP" section). Current events are a solved equation: the matching
action costs 3 Condition (~3.3u) and fully protects yield, so it dominates —
Hold and Recall are never the right call (action 92% / hold 0% / recall 8%).

The sim's finding: **ranges alone don't fix it; the matching action must cost
something.** Locked config (Candidate A + wear lever, no surcharge needed):

- **Hold penalty ranges (seeded per window):** minor **4–8u**, serious
  **12–22u**. Replace the fixed constants in
  `packages/domain/src/thumper/eventWindowSeverity.ts`
  (`HOLD_PENALTY_BY_SEVERITY`) with `{minor: [4,8], serious: [12,22]}` and seed
  the realised value per window from the run seed (server-authoritative so async
  runs resolve identically unattended).
- **Meter coupling:** the realised loss = `lo + (1 − λ)·(hi − lo)`, where λ is
  the relevant meter (Signal Lock for signal windows, Pump Flow for pump
  windows) at resolution, 0–1. High meter → mild end; low meter → severe end.
  The meters already exist as display values — wire them into outcome resolution
  in `packages/domain/src/thumper/eventWindowOutcome.ts`.
- **Matching action wear 3 → 9 Condition** (`MATCHING_ACTION_WEAR_CONDITION`).
  This is the lever that makes events a choice. Matching action protects this
  window's yield and resets the relevant meter to ~0.9 for future windows, but
  now costs real durability.
- **No hull-threat surcharge** — the wear lever alone lifts Recall to ~23%.

Locked outcome (sim): **action 37.5% / hold 39.2% / recall 23.3%** across the
state space — all three options optimal in ≥15%, none >60%.

UI: option lines already show consequence previews (Group D2 of the prior fix
plan). Update them to show the *range* ("Lose 4–8 units") and, where cheap, the
meter-implied point. Resolved-window log (already built) shows the realised
value.

**Tutorial runs keep scripted, deterministic mid-rolls** — the teaching windows
must not randomise. Gate the ranges behind `!isTutorialRunSeed`.

Verification: rerun `python3 design-docs/event_choice_liveness_sim.py`, confirm
the 2D sweep still reports Candidate A / wear 9 / surcharge 0 passing. Add a
domain test that a seeded window with λ=0.9 lands near the range floor and λ=0.1
near the ceiling, and that tutorial seeds bypass the range.

---

## Group F — crafting experimentation (P1) — **SIM-LOCKED**

Source: `design-docs/experimentation_sim.py` (rerun it; read VERDICT). Current
5% flat defect is inert (EV +2.17, downside cosmetic, always-press). Replace
with SWG-style bet-sizing: per craft the player gets **2 experiment pulses**;
per pulse pick a property line and a **push size**:

| Push      | Band gain | Success | Crit  |
|-----------|-----------|---------|-------|
| Careful   | +1        | 0.90    | 0.02  |
| Standard  | +2        | 0.65    | 0.10  |
| Overdrive | +3        | 0.40    | 0.25  |

- Non-success non-crit = pulse wasted (no change).
- **Crit:** Careful/Standard → −1 band on that line. Overdrive → scrap one
  socket's resource stack (material cost, band unchanged) — model/scrap the
  **largest socket**. Even the failure feeds the core loop (refill = more
  thumping). No item destruction in MVP.
- **Resource quality caps the line** (band cap from `getStatBand`); a push that
  would exceed the cap clamps to it. Experimentation polishes toward what the
  gradient hunt found — it never substitutes for hunting better resources (same
  guard philosophy as sampling-vs-thumping).
- Bands are the display + push unit (`packages/domain/src/survey/statBand.ts`),
  so every success is visible by construction.

Locked crit_od: **0.25** (gentle MVP default; sim passes all three checks). The
sim's max-spread recommendation is 0.30 (OO scrap 36u vs 30u) — use 0.30 only if
you want wider strategy differentiation later.

Sim verdict at b0=3 / B_cap=6 (all three checks PASS):
- Distinct distributions (TVD across the risk ladder ≥ 0.10): CC/CS 0.76,
  CS/SS 0.32, SS/SO 0.20, SO/OO 0.49.
- Prestige gate: pure Careful reaches band 6 ~0% of the time; Overdrive/Adaptive
  ~64%. Top-tier output is a real bet, mirroring SWG "master crafters still
  crit."
- Economy: Overdrive-heavy mean scrap overhead **30u** (25% of the 120u recipe)
  — not free, not ruinous.

Notable: Careful→Standard reaches band 6 **58% with zero scrap** vs Overdrive's
64% with 30u scrap — so Overdrive is the *fast/high-variance* path, not the only
one. Good: keeps Standard a live middle option.

Implementation: new domain module `packages/domain/src/crafting/experimentation.ts`
(pure: pulse resolution, seeded RNG, band clamp, scrap selection); workshop
action + UI for the 2-pulse allocation (line + push picker per pulse); persist
realised stats. Reuse `createSeededRng`. Keep multi-line allocation simple for
MVP (one push targets one line; note finer per-stat allocation as future work).

Verification: rerun `python3 design-docs/experimentation_sim.py`, confirm all
three checks PASS at the chosen crit_od. Domain tests: clamp at cap, crit band
loss, Overdrive scrap selects largest socket, seeded determinism.

---

## Notes

- This plan rhymes two systems on purpose: thumper windows are bet-sizing on
  yield in flight; experimentation is bet-sizing on stats at the bench. One
  design language, learned once.
- Decision-log: after E and F land, log the amendment in `design-docs/DECISION_LOG.md`
  (new candidate decision referencing both sims). The anti-substitution ratio
  citation in DECISION_LOG ("6.4–8.5%") is already stale — current sims report
  4.2–8.1% (6.5% at the Keth-PEAK benchmark); fix that line in the same pass.
- Sequencing: A and B are P0 loop-killers, ship first. C and D1 are cheap. D2
  needs Ryan's nod. E and F are the larger systems — land them last, behind
  their sims.

## Manual verification path (full first loop)
prologue → pick CM family → free-taste Veyrith (order does NOT bind) → paid Keth
samples fill SA order (binds on first paid sample) → turn in → fab online →
WORKSHOP defaults to rig → assemble → FIELD deploy (fail-safe countdown visible)
→ run secures at shown time → claim next to thumper → patch hull → 5-min run →
full claim → async reveal (energy refills to cap) → next-need orders point at the
hull bill → craft hull with a real experimentation choice → first 1h deploy with
live event windows.
