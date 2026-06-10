# Async Frontier MMO — Learning Path v2.1 (Lesson 3.4 → Production Point)

> Supersedes the v1 learning path from Lesson 3.4 onward. Lessons 0.1–3.3 remain valid as completed.
> Goal of v2: by the end of this path the implementation is the **full playtestable MVP slice** — every Decision 015 Definition-of-Done item, not just the first-session happy path.

---

## 0. What changed since v1 and why

1. **Design docs were unified.** Replace the contents of `design-docs/` with the four source-of-truth files: `DECISION_LOG.md`, `DESIGN_BIBLE.md`, `BUILD_PLAN.md`, `LAYERED_FEATURE_BACKLOG.md` (plus `stage1_sim.py`, `bloom_variance_sim.py`, `stage1_economy.xlsx` under `design-docs/prototypes/`). Retire `MVP_SCOPE_REFERENCE.md`, `FINAL_REVIEW_NOTES.md`, and `research/` — their content lives in the unified docs. Update any Cursor prompt that names the old files.
2. **Decision 016 is locked.** Survey Clarity reads Crystal Lens **Conductivity** (not OQ); Repair Kit Integrity Safety reads Patch Alloy **Hardness** + Reactive Binder **Heat Resistance** + average OQ. All schematic lessons below use these weights.
3. **Decision 018 is locked.** The MVP includes a seeded random bloom generator (manual rotation, no jobs). Lesson 6.4 implements it.
4. **Decision 017 (time model) is still pending lock.** The lessons below implement a short foreground run (configurable `duration_seconds`, short by default; event windows resolved interactively) which is compatible with the proposed model. Confirm 017 before Phase 7 polish.
5. **v1 gaps closed by v2:** prospecting/sampling, extraction tails, nine-resource seed, plus: frame choice and frame verbs; Hull Damage + Threat Surge complications; Suppress Threat + in-run Field Repair actions; Recall Early; push runs; all five schematics; thumper parts as equippable, wearing items; starter kit and starter stockpile; bloom variance; Decision 013-aligned telemetry.

### Definition of "full slice" (check against this at 8.2)

```text
choose frame → scan a family → sample spots (first sample reveals stats + trickle yield)
→ hunt the concentration ceiling or settle → choose an extraction tail (15 m/1 h/4 h/8 h)
→ deploy thumper with Drill/Pump/Hull parts
→ resolve 2 (or push 3) event windows drawn from all 4 complication types
→ respond with any of the 4 actions, hold, or Recall Early
→ claim resources with ledger audit
→ craft any of the 5 recipes through slots + preview + 3 tuning points + Safe/Careful
→ equip scanner OR thumper parts OR spend repair kits
→ parts wear; repair is a decision
→ allocate scarce resources across competing recipes (which copper goes where?)
→ rotate the bloom and feel scarcity
→ telemetry answers Decision 013
```

---

## Phase 3 (continued) — Complete the thumper run

### Lesson 3.4 (REVISED) — Store event choices and resolve run result, with frame as an input

Goal:

Record event-window choices and resolve the run — and thread the pilot's frame through the resolution math now, so Phases 5–7 don't force a rewrite.

Why:

Frames must change at least one meaningful decision (Decision 015 gate). Frame bonuses live in event resolution (Decision 004: Recon→Signal Tune, Engineer→Field Repair + pump-clear bonus, Vanguard→Suppress Threat). Adding the parameter now is one argument; adding it after Phase 7 is a refactor.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: store thumper event choices and resolve the run result with frame input.

Important: write the lesson into docs/lessons/10-event-choice-resolution-with-frame.md.

Goal:
- Add the minimal DB/domain path for event-window choices in a thumper run.
- Add a FrameId type ('recon' | 'engineer' | 'vanguard') to shared types and give the demo pilot a frame column (default 'recon' for now; selection UI arrives in Lesson 7.1).
- Pure domain resolution function signature must accept: run config, event windows, player responses, pilot frame.
- Frame effects in MVP terms (data-driven multipliers, not branching code):
  - recon: stronger Signal Tune outcome
  - engineer: stronger Field Repair outcome and a bonus on Clear Pump Problem
  - vanguard: stronger Suppress Threat outcome
- Record player responses per window (respond / hold).
- Resolve projected recovery into a claimable result.
- Resource stats remain immutable; bad outcomes reduce quantity/create waste/add wear, never mutate stats.
- Do not add inventory/resource stacks yet.
- Do not add jobs.

TDD:
1. Same window + same response resolves better for the matching frame than a non-matching frame.
2. Holding/ignoring a complication applies a bounded, predictable penalty.
3. Resolution is deterministic given run seed + choices + frame.

Teaching mode:
1. Explain auditability and why choices are stored server-side.
2. Explain why frame is a resolution input, not a UI decoration.
3. Continue without waiting for an answer, then implement domain-first TDD.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit:

```bash
git add packages/domain packages/db apps/web packages/shared pnpm-lock.yaml docs/lessons/10-event-choice-resolution-with-frame.md
git commit -m "feat: record event choices and resolve runs with frame input"
git push
```

GPT 5.5 Review gate: Required. Ask specifically about auditability, frame-as-data, and scope creep.

---

### Lesson 3.5 (NEW) — Full complication table and seeded run generation

Goal:

Runs after the scripted first session draw complications from all four locked types: Signal Drift, Pump Strain, Hull Damage, Threat Surge — with Suppress Threat and in-run Field Repair as their matching responses, and an optional high-risk push run with a third window.

Why:

Decision 015 requires 4 complication types and 4 event actions. Two scripted windows prove the tutorial, not the toy; repeat play needs variety, and Vanguard is meaningless until Threat Surge exists.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: full complication table and seeded run generation.

Important: write the lesson into docs/lessons/11-full-complication-table.md.

Goal:
- Add Hull Damage and Threat Surge complications to the domain complication table (Decision 005).
- Add Suppress Threat and Field Repair as event responses. Field Repair requires owning a Field Repair Kit; until kits exist (Lesson 6.2), the response is listed but disabled with a clear reason, and hold/ignore stays available.
- Non-tutorial runs generate windows from a stored run seed: 2 windows by default; player may choose a push run at deploy time for up to 3 windows with higher projected recovery and higher risk.
- The tutorial first run remains scripted: Signal Drift then Pump Strain, no push option, no Integrity damage (Decision 011).
- Window generation is a pure deterministic function of the seed so results are auditable and testable.
- Do not add realtime combat, jobs, or WebSockets.

TDD:
1. Same seed always generates the same windows.
2. Push runs can generate a third window; default runs cannot.
3. Each complication maps to exactly one matching response plus hold and Recall Early (next lesson).
4. Tutorial run still produces the scripted Drift→Strain sequence.

Teaching mode:
- Explain seeded determinism vs hidden server randomness.
- Explain why Field Repair is gated on kit ownership instead of being free.
- Continue without waiting, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain packages/db docs/lessons/11-full-complication-table.md
git commit -m "feat: add full complication table and seeded run generation"
git push
```

GPT 5.5 Review gate: Required. Determinism + Decision 005 compliance.

---

### Lesson 3.6 (NEW) — Recall Early

Goal:

Add the universal safety choice: end the run before the next window, keep secured progress, give up remaining projected recovery, keep damage already taken.

Why:

Decision 004/005 lock Recall Early as the player's risk-control valve; the durability trust gate depends on players believing they can always stop accepting risk.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Recall Early.

Important: write the lesson into docs/lessons/12-recall-early.md.

Goal:
- Recall Early is available at every event window in every run, including the tutorial.
- On recall: run resolves immediately; secured recovery is kept; remaining projected recovery is forfeited; wear/damage already applied stays; no new complications fire.
- Recall is recorded as a run resolution type for auditability ('completed' | 'recalled').
- It is a safety valve, not a failure state: the claim explanation must present it neutrally.
- Do not add penalties beyond forfeited remaining recovery in MVP.

TDD:
1. Recall after window 1 keeps window-1-secured recovery and skips window 2.
2. Recall never erases wear already taken.
3. Recalled runs are claimable like completed runs.

Teaching mode:
- Explain loss-aversion design and why a visible exit increases willingness to take risks.
- Continue without waiting, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain packages/db apps/web docs/lessons/12-recall-early.md
git commit -m "feat: add recall early as universal run resolution"
git push
```

GPT 5.5 Review: Recommended.

---

## Phase 4 — Claim resources with an economy ledger

### Lesson 4.1 (REVISED) — Persist resource instances, stacks, and ledger

Goal:

Prepare claim to grant resources auditably — with resource instances as **persisted rows**, not static domain constants, because Decision 018 means resources are generated and go extinct.

Why:

v1 said "keep resource definitions in domain/static data." That is no longer correct: rotated blooms create new named resources at runtime, and stacks must reference an immutable persisted instance with bloom provenance.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: persist resource instances, resource stacks, and the economy ledger.

Important: write the lesson into docs/lessons/13-resource-instances-stacks-ledger.md.

Goal:
- Add resource_instances table: unique name, family, five stats (immutable after insert), bloom_id, spawned/extinct markers.
- Seed bloom #1 with the NINE locked resources (Decision 006 as amended by 021: three per family, including Sorrel Vein Copper, Bendrel Ridge Alloy, Glimmerfall Shard) via migration/seed script, each with its locked concentration range and a rolled lifespan_days (Decision 020).
- Add resource_stacks keyed by pilot_id + resource_instance_id (stacks of the same instance combine; Decision 012).
- Add economy_ledger as append-only with event types from Decision 012 (resource_granted, resource_consumed, item_crafted, ...).
- Do not add marketplace, trade, refining, factories, or batch crafting.
- Do not add the bloom generator yet (Lesson 6.4) — only the schema that makes it possible.

TDD / integrity checks:
1. Resource instance stats cannot be updated after insert (enforce in query layer; test it).
2. Two grants of the same instance to one pilot combine into one stack.
3. Every grant writes a ledger row.

Teaching mode:
1. Explain instance vs stack vs ledger.
2. Explain why immutability + provenance are the economy's trust foundation.
3. Continue without waiting, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit:

```bash
git add packages/db pnpm-lock.yaml docs/lessons/13-resource-instances-stacks-ledger.md
git commit -m "feat: persist resource instances, stacks, and economy ledger"
git push
```

GPT 5.5 Review gate: Required. Economy/audit checkpoint.

---

### Lesson 4.2 — Claim transactionally (as v1, with instance references)

Goal:

Claim marks the run claimed, grants the run's resource stack, and writes ledger rows — in one transaction, idempotently.

Cursor prompt: use the v1 Lesson 4.2 prompt with two changes — the granted reward references `resource_instance_id` from the run's target signal, and the double-claim test must also prove no duplicate ledger rows. Write the lesson into `docs/lessons/14-transactional-claim-reward.md`.

Verification, commit, and review gate: as v1 (this remains the most important early economy safety gate).

---

## Phase 5 — Thinking-craft, all five recipes

### Lesson 5.1 (REVISED) — Schematic engine + Survey Scanner Module Mk I

Goal:

Build the generic schematic machinery once, expressed first as the scanner — with all three family slots, Decision 016-A weights, 3 tuning points, and both craft modes.

Why:

The scanner is not a one-slot recipe. Per Decision 010 it takes Conductive Core (CM) + Crystal Lens (RC) + Frame Mount (SA). Building the engine generically now makes Lesson 5.4 (the other four recipes) pure data.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: schematic engine and Survey Scanner Module Mk I.

Important: write the lesson into docs/lessons/15-schematic-engine-scanner.md.

Goal:
- Add a versioned schematic definition format in domain data (Decision 012: schematics are data, not code): slots with family requirements, property lines with weight terms, tuning lines.
- Implement the Decision 010 math exactly:
  base = weighted_resource_stat_total / 10
  tuned = base × (1 + 0.05 × points_on_line), 3 points total, cap 100
  Safe Craft = tuned; Careful Experiment = 75% +3% / 20% none / 5% minor flaw.
- Add Survey Scanner Module Mk I with Decision 016-A weights:
  Survey Clarity   = 60% Core Conductivity + 25% Lens Conductivity + 15% avg OQ
  Stat Hint Acc    = 50% Core Conductivity + 30% Lens Heat Resistance + 20% avg OQ
  Signal Range     = 55% Core Conductivity + 25% Lens Heat Resistance + 20% avg OQ
- Output bands per Decision 010 (Poor/Basic/Solid/Strong/Excellent/Exceptional). Never 'Legendary'.
- Property preview is a pure function usable by UI before committing the craft.
- Do not add refining, batch crafting, or factories.

TDD:
1. Veyrith Copper core beats Slag core on all three scanner lines by more than 3 tuning points can close.
2. Thornwake lens beats Pale Ember lens on Survey Clarity and loses on the other two lines (the tempting-but-risky test).
3. Tuning never mutates resource stats; 4th tuning point is rejected.
4. Careful Experiment never exceeds the resource-defined ceiling.

Teaching mode:
- Explain resource primacy (Decision 009) and why schematics are versioned data.
- Continue without waiting, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain docs/lessons/15-schematic-engine-scanner.md
git commit -m "feat: add schematic engine with survey scanner recipe"
git push
```

GPT 5.5 Review gate: Required. Crafting math vs Decisions 009/010/016.

---

### Lesson 5.2 (REVISED) — Starter stockpile + craft the scanner end-to-end

Goal:

Grant the Decision 011 starter stockpile and let the player craft the scanner by filling all three slots, spending tuning points, choosing a mode, and reading a result explanation.

Why:

The first craft consumes claimed Veyrith Copper **plus** starter Keth Iron (Frame Mount) and Pale Ember Crystal (Crystal Lens). Without the starter stockpile the locked first session is impossible.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: starter stockpile and full scanner craft.

Important: write the lesson into docs/lessons/16-starter-stockpile-craft-scanner.md.

Goal:
- New/demo pilots receive the Decision 011 starter stockpile: a small quantity of Keth Iron and Pale Ember Crystal (ledger-recorded grants).
- Crafting action: choose schematic → fill each slot with an owned stack of the required family → preview properties → allocate exactly 3 tuning points → choose Safe Craft or Careful Experiment → craft.
- Transactionally: consume slot quantities, create the item with property scores + provenance (which named resources filled which slots), insert crafting_attempt audit row and ledger rows.
- Result explanation states which resource stats drove which property lines and what tuning/mode contributed (Decision 008 requirement).
- Default suggested tuning for the first scanner: 2 Survey Clarity / 1 Stat Hint Accuracy, changeable (Decision 011).
- Do not add inventory UI beyond what the flow needs.

TDD:
1. Craft fails cleanly if any slot family requirement is unmet or quantity is short.
2. Double-submitting a craft cannot consume resources twice or create two items.
3. Item provenance lists the exact resource instances consumed.

Teaching mode: explain spend-vs-create, why crafting attempts are audited, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/16-starter-stockpile-craft-scanner.md
git commit -m "feat: starter stockpile and full three-slot scanner craft"
git push
```

GPT 5.5 Review gate: Required. Economy/crafting audit checkpoint.

---

### Lesson 5.3 — Equip scanner, survey clearer (as v1)

Use the v1 Lesson 5.3 prompt unchanged, written into `docs/lessons/17-equip-scanner-survey-better.md`. One addition to its TDD list: survey clarity improvement scales with the equipped scanner's Survey Clarity property score, so a better-crafted scanner visibly reveals more (band → exact-value hints), proving "better crafted parts change behavior."

---

### Lesson 5.4 (NEW) — The remaining three schematics as data

Goal:

Add Basic Drill Head, Efficient Pump, and Reinforced Hull Plate as schematic definitions — no new engine code.

Why:

Decision 015 requires five recipes, and the voluntary-repeat gate needs something to chase after the scanner. If these require engine changes, Lesson 5.1's design was wrong — this lesson is the proof.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add drill, pump, and hull plate schematics as data.

Important: write the lesson into docs/lessons/18-remaining-thumper-part-schematics.md.

Goal:
- Add the three thumper-part schematics with exact Decision 010 slot families and weight tables AS AMENDED by Decision 021-A (Pump Field Stability reads Intake Malleability — copy final weights from DECISION_LOG Decisions 010/016/021).
- Zero engine changes expected; if any are required, stop and explain why before making them.
- Crafted items of these types are not yet equippable (Lesson 6.3 wires part slots).
- Do not add weapons, armor, refiner parts, or any sixth recipe.

TDD:
1. All five schematics craft through the same engine path.
2. Asterion-heavy inputs beat Keth-heavy inputs on Drill Extraction Rate.
3. Each recipe's three property lines produce different rankings across input combos (differentiation check from Stage 1).
4. Allocation check: the best CM for the Scanner core (Veyrith) is NOT the best CM for Pump Field Stability (Sorrel) or the Repair Kit filament (Slag).

Teaching mode: explain data-driven content vs code-driven content, then implement.
```

Verification / commit (message: `feat: add drill, pump, and hull plate schematics`) / GPT 5.5 Review: Recommended.

---

## Phase 6 — Wear, repair, parts, and blooms

### Lesson 6.1 — Condition + Integrity domain model (as v1)

Use the v1 Lesson 6.1 prompt unchanged, written into `docs/lessons/19-condition-integrity-domain.md`.

---

### Lesson 6.2 (REVISED) — Field Repair Kit with Decision 016-B

Goal:

Add the fifth recipe and the repair loop.

Cursor prompt: use the v1 Lesson 6.2 prompt with these changes — write into `docs/lessons/20-field-repair-kit.md`; the Integrity Safety property uses the Decision 016-B weights (40% Patch Alloy Hardness + 30% Reactive Binder Heat Resistance + 30% average OQ) and Field Reliability uses Decision 021-A (45% Binder HR + 35% Filament HEAT RESISTANCE + 20% avg OQ — Slag's home); repair actions write `repair_action` audit rows and ledger entries; repair amount scales with the kit's Condition Restored score and never exceeds the Integrity-limited maximum. Add one TDD case: two kits crafted from different binders produce different Integrity Safety (the 016-B differentiation proof). Also enable the in-run Field Repair event response gated in Lesson 3.5, consuming a kit.

GPT 5.5 Review gate: Required. Durability trust checkpoint.

---

### Lesson 6.3 (NEW) — Thumper parts as equippable, wearing items

Goal:

Make Drill/Pump/Hull real: starter worn parts, equipping crafted parts, part properties feeding run math, wear landing on parts, repair targeting parts.

Why:

This closes the actual economy loop. Until parts are items, the drill/pump/hull recipes are trophies, wear has no object, and "better parts change thumper behavior" (Decision 003's core proof) cannot be playtested.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: thumper parts as equippable wearing items.

Important: write the lesson into docs/lessons/21-thumper-parts-equip-wear.md.

Goal:
- Pilots start with Worn Basic Drill, Worn Basic Pump, Worn Basic Hull (Decision 011 starter kit): low fixed property scores, reduced starting Condition, item rows like any crafted item.
- The thumper has three part slots; deploy snapshots the equipped parts onto the run (Decision 012: runs record parts used).
- Part property scores feed run math as data: Drill→extraction rate/depth/noise-threat profile; Pump→recovery efficiency/clog behavior; Hull→condition pool/damage reduction.
- Run results apply Condition wear to the parts used; severe outcomes (unanswered Threat Surge, failed push) may apply small Integrity loss per Lesson 6.1 rules. No surprise deletion.
- Repair kits can target thumper parts (and the scanner).
- Equip/unequip is server-authoritative and ledger-visible (item_equipped events).

TDD:
1. A crafted Efficient Pump with higher Recovery Efficiency yields measurably more claimed quantity than the Worn Basic Pump on the same seed.
2. Wear from a run lands only on the parts that ran.
3. A part at zero Condition degrades run performance but is not deleted.

Teaching mode: explain snapshot-at-deploy auditability, then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/21-thumper-parts-equip-wear.md
git commit -m "feat: equippable thumper parts with wear"
git push
```

GPT 5.5 Review gate: Required. This is the loop-closure gate: survey better OR extract better OR survive better must all be reachable through crafting.

---

### Lesson 6.4 (NEW) — Seeded random bloom generator (Decision 018)

Goal:

Implement bloom variance: roll new blooms within family caps, rotate manually, retire old resources forever.

Why:

Decision 018 (locked): rotating resources are where the long-term fun is, and the Monte Carlo (BUILD_PLAN Part C addendum) proved random blooms are safe — median bloom Strong, floor risk 0.03%, Veyrith-tier finds ~1 in 17.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: seeded random bloom generator and manual rotation.

Important: write the lesson into docs/lessons/22-bloom-generator-rotation.md.

Goal:
- Add family stat caps as domain data (prototype values from BUILD_PLAN Part C addendum).
- Pure generator: (seed) -> bloom of 9 resources (3 per family, Decision 021), each with a generated unique name, stats rolled uniformly within caps, a rolled concentration_range, and a rolled hidden lifespan_days (3–9, Decision 020) — all immutable once persisted.
- Bloom #1 remains the locked Decision 006 seed bloom; the tutorial always runs on bloom #1.
- Add a dev/admin 'Rotate Bloom' action: marks current bloom's resources extinct (they never spawn again), persists the next generated bloom, ledger-records the rotation.
- Claimed stacks and crafted-item provenance survive rotation untouched — stockpiling works.
- Survey shows only the active bloom's resources.
- UI rule (Decision 018 §6): stats with zero weight in every live schematic render de-emphasized in survey and crafting screens.
- No jobs, timers, or 7-day scheduler — rotation is manual in MVP.

TDD:
1. Same seed generates the same bloom; different seeds differ.
2. Every rolled stat is within its family cap; the Decision 006 bloom validates against the caps.
3. After rotation, extinct resources never appear in surveys but persist in owned stacks.
4. Generated resource names are unique across all blooms.
5. Every generated resource carries a concentration_range and lifespan_days within bounds.

Teaching mode: explain why scarcity comes from extinction + caps + randomness, and why distribution shape is a tuning knob. Then implement.
```

Verification / commit (message: `feat: seeded random bloom generator with manual rotation`) / GPT 5.5 Review gate: Required. Decision 018 compliance + no scheduler creep.

---


### Lesson 6.5 (NEW) — Prospecting, sampling, and survey energy (Decision 019)

Goal:

Turn survey into the hunt: family scan → deposit spots → sample → stat reveal → spot choice.

Why:

Decision 019 (locked): without this, survey is a menu read. The first sample revealing a resource's stats is the tutorial's "wow" moment, concentration multiplies extraction, and the hunt is bounded by survey energy and scanner wear.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: prospecting, sampling, and survey energy.

Important: write the lesson into docs/lessons/22b-prospecting-sampling.md.

Goal:
- Scanning is by FAMILY: a scan lists the active bloom's resources in that family with concentration-range hints (e.g. "30–67% this cycle") — stats hidden until sampled.
- Each resource exposes 3–5 deposit spots with rough concentration bands.
- Sample action (server-authoritative): reveals a spot's true concentration, grants a small trickle of the resource (ledger-recorded), and on a resource's FIRST sample reveals its five stats permanently for this pilot.
- Survey energy: scans and samples spend a regenerating pool (Farm RPG explore pattern); no infinite surveying.
- Sampling/scanning wears the equipped Survey Scanner's Condition.
- Deploying targets a sampled spot; the spot's concentration multiplies extraction rate (~0.5x–1.5x); spots hold finite units.
- Scanner Survey Clarity tightens concentration estimates and reduces wasted energy.
- Do not add travel/movement simulation, maps, or pathfinding — spots are abstract choices in MVP.

TDD:
1. Stats are hidden before first sample and visible after, per pilot.
2. Sampling drains energy and grants the trickle exactly once per action.
3. Better Survey Clarity narrows the displayed concentration band for unsampled spots.
4. Deploy on a 1.4x spot out-yields the same run on a 0.6x spot.

Teaching mode: explain why the ceiling is earned, not read; then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit (message: `feat: prospecting, sampling, and survey energy`). GPT 5.5 Review gate: Required — Decision 019 compliance, no movement-sim creep.

---

## Phase 7 — The six MVP screens

Decision 008 locks the screens; Decision 011 (as amended by 021) locks the first-session path: scan the CM family → sample two of Slag/Sorrel/Veyrith → Veyrith's stat reveal → deploy on Veyrith.

### Lesson 7.1 (REVISED) — Pilot Home with frame choice

Use the v1 Lesson 7.1 prompt with this addition — a new pilot chooses Recon / Engineer / Vanguard before anything else, described as verbs not stat blocks (Decision 011): "better at reading signals / keeping machinery alive / suppressing threat." The choice persists to the pilot row and feeds Lesson 3.4's resolution math. Pilot Home shows: frame, active bloom name, run status, resource summary, equipped scanner + parts, suggested next action. Write into `docs/lessons/23-pilot-home-frame-choice.md`.

### Lesson 7.2 — Red Mesa Survey screen

As v1, written into `docs/lessons/24-survey-screen.md`, with: family selector (one scanner, Decision 021-D); resources listed with concentration-range hints and stats hidden until sampled (Decision 019); deposit spots + sample flow from Lesson 6.5; zero-weight stats de-emphasized; tutorial scans Conductive Metal and recommends but never forces Veyrith.

### Lesson 7.3 — Signal Detail / Deploy Thumper screen

As v1, written into `docs/lessons/25-signal-deploy-screen.md`, with: the chosen deposit spot + its sampled concentration; equipped Drill/Pump/Hull summary with Condition; projected recovery / threat / depth / condition-risk preview (Decision 005); EXTRACTION TAIL choice (15 m / 1 h / 4 h / 8 h with projected yields, Decision 017); push-run toggle (hidden during tutorial).

### Lesson 7.4 — Thumper Run / Event Window screen

As v1, written into `docs/lessons/26-run-event-screen.md`, with: the five visible run-state meters (Projected Recovery, Signal Lock, Pump Flow, Threat Pressure, Hull Condition); each window offers the matching action (frame-flavored), hold, and Recall Early; Field Repair shows kit count and is disabled with a reason when no kit is owned.

### Lesson 7.5 — Claim Results screen

As v1, written into `docs/lessons/27-claim-results-screen.md`, with the explanation chain made explicit: window → response/hold → consequence → recovered amount, waste, wear per part, salvage. A tester must be able to answer "why did I get this amount?" from this screen alone (Decision 013 event gate).

### Lesson 7.6 — Crafting + Gear / Repair screen

As v1, written into `docs/lessons/28-crafting-gear-screen.md`, against the full Decision 008 checklist: schematic list (all five), slot picker with side-by-side named-resource comparison (the allocation moment: surface where else each resource is best), weighted property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, result explanation, equip and repair actions. This screen is the comprehension gate's home — when in doubt, show the weights.

Verification for each 7.x lesson:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

GPT 5.5 Review gate after 7.6: Required. Walk the entire Decision 011 first-session path in the browser and confirm every step works without console errors.

---

## Phase 8 — Instrumented playtest and production point

### Lesson 8.1 (REVISED) — Decision 013-aligned telemetry

Goal:

Replace the v1 seven-event list with the Decision 013 funnel and comprehension capture.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: Decision 013 playtest telemetry.

Important: write the lesson into docs/lessons/29-decision-013-telemetry.md.

Goal:
- Record the Decision 013 first-session funnel events with their exact names:
  frame_chosen, first_survey_started, first_survey_completed, signal_compared,
  veyrith_copper_recommended, target_signal_selected, thumper_deployed,
  event_window_1_resolved, event_window_2_resolved, thumper_claimed,
  resource_claimed, schematic_opened, resource_slots_filled, tuning_points_spent,
  craft_mode_chosen, item_crafted, item_equipped, second_survey_completed
- Also record comprehension signals: resource stats inspected, two resources compared,
  slot selection changed, tuning allocation changed, repair previewed,
  spots_sampled_before_deploy, extraction_tail_chosen, first_stat_reveal_viewed.
- Add a simple way to log post-test answers to the four Decision 013 comprehension
  questions (a markdown template in docs/playtests/ is enough).
- Keep data local. No external analytics, no dashboards, no user tracking beyond the pilot.

Teaching mode: explain what gate each event answers, then implement minimally.
```

Verification / commit (message: `feat: decision 013 playtest telemetry`).

### Lesson 8.2 — Production Point review prep

As v1, written into `docs/production-point/README.md`, with updated references: compare implementation against `design-docs/DECISION_LOG.md` Decisions 001–021 and the "full slice" checklist at the top of this file, and include the ledger audit checks from Decision 013 (no negative stacks, no duplicate claims/crafts, provenance matches consumption, properties match formula + tuning + mode, wear matches run results, ledger matches state).

Final review-gate prompt addition: ask explicitly whether mediocre-bloom sessions (rotate until you get one) still feel worth playing — that is the question Decision 018 added to the playtest.

---

## Closing rules (unchanged from v1)

Sections 5–8 of v1 still apply verbatim: when to add packages/jobs (now also: the bloom rotation scheduler is the canonical "later" job), the GPT 5.5 review checklist (scope is now Decisions 001–021), the scope-creep stop-paste, and the teach-before-edit reset. The only reference change: the scope checklist line "Does this stay inside Decisions 001–015?" becomes "Does this stay inside Decisions 001–021?"
