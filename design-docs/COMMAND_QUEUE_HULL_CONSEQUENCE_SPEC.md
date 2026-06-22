# Command Queue Hull Consequence — Design & Playtest Spec

**Status:** Pre-live. Sim-backed only. No gameplay wiring until human q3 FIELD confirms readability.

**Rollout checkpoint:** Medium q3 FIELD is shipped behind reinforced-hull deploy (`docs/plan/2026-06-22-feat-thumper-command-queue-composer-brief.md`). **q4 remains blocked** until q3 passes a real-session playtest. This spec is the decision artifact after the sim gate commit `4a30c42`.

**Regenerate numbers:** `pnpm --filter @async-frontier-mmo/domain test -- commandQueuePolicySim` (gate at 240 seeds) or call `buildCommandQueuePolicyReport({ sampleSize: 5000, baseSeed: 20260623 })` (defaults to q3).

---

## Problem

Command-queue runs already track hull loss, heat surges, and loose-cargo waste. Repair-debt scoring in sim (`scoreCommandQueueRunState`) penalizes greedy drilling, but **live FIELD does not yet carry hull damage into the next deploy**.

We need one first consequence hook that players can read without a tutorial essay.

---

## Sim source of truth

| Input | Value |
|-------|-------|
| Queue length | **q3** (medium, 3 slots) |
| Sample | **5,000** seeds (`baseSeed: 20260623`) |
| Rules | TypeScript domain: `generateCommandQueueEvents`, `forecastCommandQueueEvents`, `queueCommand`, `resolveNextBeat`, `commandQueueRepairDebt`, `commandQueueBeatLossEquivalent` |
| Policies | `random`, `greedy`, `event_matcher`, `cautious`, `planner`, `oracle` |
| Gates | **Pass** at q3 across poor/basic/good scanners (q4 still fails — does not unblock large queue) |

**Terminology:** `oracle` is the **exact-forecast rollout ceiling** — it sees true future events and picks the best one-step rollout command. It is **not** exhaustive optimal search or perfect play.

**Planner** and **oracle** are rollout policies over the visible queue depth, same as the Python harness intent.

---

## q3 policy sim snapshot (basic scanner, medians)

| Policy | Score | Recovered | Hull | Surges | Repair debt | Beat-loss eq. | Hull debt |
|--------|------:|----------:|-----:|-------:|------------:|--------------:|----------:|
| planner | 12.8 | 24 | 45 | 0 | 11.3 | 2 | 6.5 |
| oracle (exact-forecast rollout ceiling) | 15.7 | 26 | 45 | 0 | 10.1 | 2 | 6.5 |
| event_matcher | 4.6 | 27 | 46 | 4 | 22.9 | 2 | 5.9 |
| random | 7.3 | 21 | 48 | 2 | 13.5 | 1 | 4.6 |
| greedy | 1.6 | 32 | 38 | 4 | 30.7 | **4** | **11.1** |
| cautious | 5.7 | 10 | 53 | 0 | 3.9 | 0 | 1.3 |

**Hull-damage guidance (sim):**

- Planner beat-loss equivalent: **2** beats (`floor(hull_damage / 4)`)
- Greedy beat-loss equivalent: **4** beats — gap **+2** vs planner
- Hull debt share of planner repair debt: **~58%**
- Automated sim suggestion: **`beat_shortening`**

Greedy still banks more recovered units but loses hard on risk-adjusted score once debt matters — same pattern as q2 Python gates.

---

## Three candidate live hooks

### 1. `beat_shortening`

**Player read:** “This hull is beat-up; my next thumper run is shorter.”

| Sim fit | Detail |
|---------|--------|
| Strong | Greedy vs planner beat-loss gap (+2) is the clearest signal in q3 policy sim |
| Strong | Aligns with `commandQueueBeatLossEquivalent` already in tuning harness |
| Risk | Invisible until next deploy; easy to miss if FIELD never surfaces “lost beats” |
| Risk | Must not stack confusingly with command-queue late-run slot shrink (already in UI) |

**Draft rule (not implemented):** Next deploy `totalBeats = RUN_BEATS - beatLossEquivalent`, floor TBD (e.g. 12).

---

### 2. `repair_cost`

**Player read:** “I owe workshop materials/credits before I can deploy again.”

| Sim fit | Detail |
|---------|--------|
| Strong | Hull debt ~58% of planner repair debt; greedy pays **+4.6** more hull debt than planner |
| Medium | Workshop already exists in the project-led loop — natural sink |
| Risk | Another inventory/currency gate may feel like bookkeeping if hull FIELD damage was never salient during the run |
| Risk | Delays the core loop (survey → thump → craft) if cost is too high |

**Draft rule (not implemented):** Claim applies hull damage ledger; redeploy blocked until repair action consumes a kit or schematic inputs.

---

### 3. `part_wear`

**Player read:** “My reinforced hull plate is worn; medium queue deploy is degraded.”

| Sim fit | Detail |
|---------|--------|
| Medium | Reinforced hull plate is the medium-q3 deploy gate — legible equipment fantasy |
| Medium | Matches DESIGN_BIBLE component-wear direction |
| Weak at q3 medians | Planner median hull **45** (only ~10 damage from 55) — wear may rarely trigger on careful play |
| Risk | Collides with existing frame-tier / queue-length deploy rules; harder to explain than beats or repair |

**Draft rule (not implemented):** Hull plate durability decays from raid/hull events; below threshold downgrades queue length or blocks deploy until replaced/repaired.

---

## Comparison summary

| Criterion | beat_shortening | repair_cost | part_wear |
|-----------|-----------------|-------------|-----------|
| Sim signal strength (q3) | **High** (beat-loss gap) | **High** (hull debt share) | Medium |
| In-run salience | Low (payoff next run) | Low (payoff at workshop) | Medium (rig slot) |
| Loop fit | Extends async time horizon | Workshop sink | Rig progression |
| Implementation coupling | Run beat count | Economy ledger + workshop | Equipment + deploy gate |
| Misread risk | “Why fewer beats?” | “Another tax” | “Why is my plate bad?” |

---

## Human q3 FIELD playtest checklist

**Goal:** Decide which consequence players *actually* infer from hull damage — future beat loss, workshop repair, or hull-plate wear.

**Setup**

- [ ] Medium deploy (q3, reinforced hull plate) via normal project-led path
- [ ] Basic or poor scanner equipped (forecast uncertainty matters)
- [ ] One intentional **greedy-leaning** run (heavy DRILL, late BANK) and one **careful** run (VENT/BRACE when heat or HULL/RAID telegraph)

**During run — note verbatim reactions**

- [ ] When hull drops after HULL or RAID, does the player say anything about **future runs**, **repair**, or **gear condition** without prompting?
- [ ] After a heat surge, do they connect it to hull loss or only to heat?
- [ ] At claim, do they notice hull remaining vs secured yield? Which meter do they cite?

**Post-run interview (one sentence each)**

1. “What did hull damage mean for your next deploy?”
2. “If hull damage had a penalty, should it be: shorter run, workshop cost, or worn hull plate?”
3. “Which penalty would feel fair for how much you ignored hull?”

**Pass criteria for moving off sim-only**

- [ ] On the **greedy-leaning** run: player spontaneously describes hull as **future capacity** (time/beats/lost deploy window) **or** explicitly picks `beat_shortening` in question 2
- [ ] On the **careful** run: player still treats hull as carry-forward (not run-local noise) even if penalty feels mild
- [ ] No consistent misread where players think hull only affects **this run’s yield** with no carry-forward
- [ ] Player can paraphrase the timeline row that caused hull loss (not “the UI lied”)

**Fail / defer**

- [ ] Player cannot articulate any carry-forward effect → defer live hook; improve FIELD hull/surge readout first
- [ ] Player strongly prefers workshop cost but never noticed hull during run → favor `repair_cost` but add in-run hull warning first

---

## Provisional recommendation (until human playtest)

**Lead with `beat_shortening` as the first live consequence**, implemented only after the checklist passes.

**Rationale (sim only):**

1. q3 policy sim beat-loss gap (greedy **4** vs planner **2**) is the strongest differentiator between good and bad play under repair-debt scoring.
2. It matches the existing `commandQueueBeatLossEquivalent` helper — smallest new concept surface.
3. `repair_cost` is the best **fallback** if playtesters understand hull debt but want a tangible workshop moment.
4. `part_wear` should stay **second wave** — better when medium-q3 deploy and rig slots are already central to session goals.

**This recommendation is provisional.** Do not wire `beat_shortening`, `repair_cost`, or `part_wear` into live gameplay until one human q3 FIELD session completes the checklist above.

---

## References

- `packages/domain/src/thumper/commandQueuePolicySim.ts` — `buildCommandQueuePolicyReport`, `assertCommandQueuePolicyGate`, `HullDamageModelGuidance`
- `packages/domain/src/thumper/commandQueueLengthTuning.ts` — `commandQueueRepairDebt`, `commandQueueBeatLossEquivalent`, rote-strategy gates
- `design-docs/thumper_command_queue_sim.py` — Python policy harness (reference; TS domain is authoritative for gates)
- `docs/plan/2026-06-22-feat-thumper-command-queue-composer-brief.md` — medium q3 rollout status; q4 blocked
- `docs/plan/2026-06-21-feat-thumper-command-queue-pivot-plan.md` — Phase 0 gate history
