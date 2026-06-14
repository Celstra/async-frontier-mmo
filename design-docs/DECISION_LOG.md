# Decision Log — Async Frontier MMO

This log records decisions that have been explicitly locked during design consolidation. The Design Bible remains the canonical design source; this file is a quick trace of what changed and why.

---

## Decision 001 — Canonical MVP Scope

**Status:** Locked.

The first playable prototype is a tiny extraction-crafting toy, not a full MMO.

The MVP exists to answer one question:

> Is it fun to survey Red Mesa, discover named resource signals, deploy a personal thumper, make a few event choices, recover resources, craft better parts/modules, and repeat while gear wears down fairly?

### Locked MVP inclusions

- 1 frontier world / planet placeholder.
- 1 starting region: **Red Mesa**.
- 3 starting frames: **Recon**, **Engineer**, **Vanguard**.
- 3 resource families: **Conductive Metal**, **Structural Alloy**, **Reactive Crystal**.
- 6 named resource spawns.
- 5 resource stats: **OQ**, **Conductivity**, **Hardness**, **Heat Resistance**, **Malleability**.
- 1 survey action.
- 1 basic personal thumper.
- 3 thumper component slots: **Drill**, **Pump**, **Hull**.
- 4 thumper event actions.
- 5 crafting recipes.
- Thinking-craft interaction: named-resource slot choice, property preview, 3 tuning points, Safe Craft / Careful Experiment.
- Condition + Integrity durability.
- Crafted repair kits.
- Simple inventory and economy ledger.

### Deferred from MVP

- Multiple regions.
- Player cities.
- Guilds.
- Chat.
- Public marketplace.
- Monetization.
- PvP.
- Realtime combat.
- Full group thumpers.
- Public helper matchmaking.
- Long crafting trees.
- Advanced refining.
- Mandatory refining step.
- Mobile app wrapper.

---

## Decision 002 — Roadmap Becomes Layered Backlog

**Status:** Locked.

`PLAYER_FACING_ROADMAP.md` is no longer treated as a player-facing promise document. It becomes an internal layered feature backlog/test bed.

Every candidate feature must answer:

> How does this strengthen the core toy?

The core toy is:

```text
Survey → discover resource → deploy thumper → handle extraction event
→ claim resources → craft/equip modules → use/decay/repair gear
→ survey better next time
```

Long-term versions may reinsert refining between claim and craft, but only if refining creates a real decision.

Features are organized by the layer of the toy they enhance:

- comprehension;
- repeatability;
- player identity;
- async cooperation;
- world persistence;
- economy depth;
- presentation/fantasy.

Features that sound cool but do not clearly strengthen the toy go into the Parking Lot.

---

## Decision 003 — Exact MVP Crafting Recipes

**Status:** Locked.

The MVP includes exactly five craftable recipe outputs:

1. **Basic Drill Head** — thumper Drill slot; tests extraction rate, depth access, and noise/wear tradeoffs.
2. **Efficient Pump** — thumper Pump slot; tests recovery efficiency, waste reduction, clogs, heat, and maintenance wear.
3. **Reinforced Hull Plate** — thumper Hull slot; tests condition, threat resistance, repairability, and weight/safety tradeoffs.
4. **Survey Scanner Module Mk I** — frame utility/survey module; replaces the candidate `Recon Sensor Module` so the first survey upgrade strengthens the whole MVP loop rather than belonging only to Recon.
5. **Field Repair Kit** — crafted consumable repair item; restores Condition partially and reduces Integrity risk, but is not a permanent repair module and not a full-heal button.

These recipes exist to test the full core toy:

```text
Survey → thump → craft → equip/use → decay/repair → survey better
```

MVP crafting should prove that:

- named resources affect item outcomes;
- better crafted parts change thumper behavior;
- crafted upgrades make the next loop feel different;
- durability creates demand without feeling punitive;
- repair kits are crafted economy objects, not generic full-heal buttons.

### MVP repair-kit substitution note

Chemical Purity is intentionally **deferred** from the locked MVP stat set. For the MVP, Field Repair Kit formulas use temporary five-stat substitutions so repair can be tested without adding refining/contamination complexity too early:

```text
Condition Restored = Malleability + OQ + Hardness
Integrity Safety   = Malleability + Hardness + OQ
Field Reliability  = Heat Resistance + Conductivity + OQ
```

This substitution must be revisited if the core loop is fun. Chemical Purity, sealants, contamination control, compatibility range, and precision repair can return later as deeper repair/refining systems.

MVP crafting excludes weapons, armor suits, refiner parts, power cores, separators, calibration kits, fuel cells, frame-specific module trees, one recipe per frame, advanced experimentation, and batch/factory crafting.

---

## Decision 004 — Exact MVP Event Action List

**Status:** Locked.

The MVP includes exactly four thumper event actions:

1. **Signal Tune** — respond to signal drift, improve signal lock/readability, and reduce surprise-complication risk.
2. **Field Repair** — spend a crafted Field Repair Kit to restore thumper Condition and reduce Integrity risk during a run.
3. **Suppress Threat** — reduce active threat pressure, prevent or soften the next damage tick, and make Vanguard's defensive role visible.
4. **Clear Pump Problem** — respond to clog/pressure/waste problems so Pump quality and recovery efficiency matter.

**Recall Early** is not counted as an event action. It is a universal safety/resolution choice that lets the owner stop accepting risk, preserve components/cargo, and end the run early.

Frame relationship:

- **Recon** is best at **Signal Tune**.
- **Engineer** is best at **Field Repair** and gets a bonus when clearing pump problems.
- **Vanguard** is best at **Suppress Threat**.
- **Clear Pump Problem** is universal so pump complications can appear before deeper Engineer-specific module trees exist.

The **Basic Drill Head** does not need a dedicated MVP action. Drill quality appears through extraction rate, depth access, noise/threat profile, and wear during event resolution.

---

## Decision 005 — MVP Thumper Event Resolution Model

**Status:** Locked.

The MVP thumper run is a small async event, not realtime combat and not a deep tactics minigame.

Locked run shape:

1. Player surveys Red Mesa.
2. Player chooses one discovered signal.
3. Player deploys a personal thumper with **Drill**, **Pump**, and **Hull** parts.
4. UI previews projected recovery, threat, depth, and condition risk.
5. The run generates **2 event windows by default**.
6. High-risk / push runs may generate **up to 3 event windows**.
7. Each event window presents one complication.
8. Player may respond with the matching action, hold/ignore, or **Recall Early**.
9. The run resolves into recovered resources, waste/scrap, component wear, hull damage, possible Integrity risk, and optional small salvage/event rewards.

MVP visible run state:

- **Projected Recovery**.
- **Signal Lock**.
- **Pump Flow**.
- **Threat Pressure**.
- **Hull Condition**.

Locked MVP complication table:

| Complication | Matching response | Primary proof |
|---|---|---|
| **Signal Drift** | Signal Tune | Survey Scanner Module Mk I, signal clarity, resource lock |
| **Hull Damage** | Field Repair | Field Repair Kit, Reinforced Hull Plate, Condition/Integrity trust |
| **Threat Surge** | Suppress Threat | Vanguard value, hull survival, danger pressure |
| **Pump Strain** | Clear Pump Problem | Efficient Pump, recovery efficiency, waste prevention |

Named resource stats do **not** mutate during extraction. Bad event resolution may reduce usable quantity, create waste/scrap, increase wear, cause damage, or alter secondary rewards, but it does not create a separate worse-stat stack of that named resource.

**Recall Early** is always available. It ends the run before the next complication. The player keeps already secured progress, gives up remaining projected recovery, and does not erase damage/wear already taken. It is a safety valve, not a failure state.

Async behavior: if the player is absent, the run resolves under conservative default behavior. No repair kits are spent automatically, no high-risk push choices are made automatically, unresolved complications apply predictable bounded penalties, and the thumper is not surprise-deleted.

**Amendment (owner-approved 2026-06-11):** Windows are scheduled but events fire probabilistically.
Each scheduled window rolls deterministically from the run seed with `EVENT_WINDOW_TRIGGER_PROBABILITY = 0.55`.
Quiet windows (no event) appear in the plan as `quiet: true` entries, require no response, incur no penalty,
and do NOT create `thumper_event_windows` DB rows. Tutorial/first-session windows stay scripted (100% fire rate).
This preserves determinism (same seed → same pattern) while making events feel less predictable.

---

## Decision 006 — MVP Resource Set and Rotation Cadence

**Status:** Locked.

The MVP starts with one seeded **Red Mesa Bloom** containing exactly six named resources.

The six resources cover the three locked resource families:

- 2 **Conductive Metal** resources.
- 2 **Structural Alloy** resources.
- 2 **Reactive Crystal** resources.

The first Red Mesa Bloom is:

| Resource | Family | Role | Stat personality |
|---|---|---|---|
| **Keth Iron** | Structural Alloy | Common baseline | Balanced; decent Hardness; reliable starter material. |
| **Red Mesa Conductive Slag** | Conductive Metal | Common flawed | Useful Heat Resistance; low OQ; uneven Conductivity. |
| **Asterion Frame Alloy** | Structural Alloy | Uncommon structural prize | High Hardness; good Malleability; weaker Conductivity. |
| **Pale Ember Crystal** | Reactive Crystal | Uncommon support material | High Heat Resistance; decent OQ; modest Conductivity. |
| **Veyrith Copper** | Conductive Metal | High-quality exciting find | Very high Conductivity; high OQ; weak Hardness. |
| **Thornwake Crystal** | Reactive Crystal | Awkward specialist | One great stat and one terrible stat; tempting but risky. |

For MVP, stat personalities are locked by Decision 006. Decision 010 locks prototype numeric values as balance data that may tune during playtesting.

Rotation cadence:

- **Internal prototype:** manually reset or advance the bloom between tests.
- **Early external prototype:** fixed **7-day Red Mesa Bloom**.
- **Deferred:** final irregular SWG-style multi-day resource randomness.

Future direction if the toy is fun:

- Move toward irregular multi-day resource lifespans.
- Let different resources despawn on different days.
- Add a resource archive / discovered-resource codex.
- Let items preserve resource provenance, including extinct resources.
- Add survey reports, coordinates, sampling, and tradeable intel.
- Add separators, refiners, byproducts, contamination, Chemical Purity, and specialized material forms only if they create real decisions.
- Preserve the long-term SWG-inspired loop: find the right named resource with the right stats before it disappears, then use it intelligently in schematics.

---

## Decision 007 — MVP Crafting Interaction Model

**Status:** Locked.

MVP crafting is part of the core toy and must be a thinking step, not drag/drop/click conversion.

Each of the five locked recipes uses this flow:

```text
Choose schematic
→ fill resource-family slots with named resources
→ preview weighted output properties
→ spend exactly 3 tuning points
→ choose Safe Craft or Careful Experiment
→ produce the item
→ show why the result happened
```
### Resource quality vs tuning rule

Resource choice is the primary quality decision. The selected named resources and their relevant stats set the item's starting values, ceilings, and best-use identity.

Tuning points and experimentation do **not** improve, mutate, reroll, or launder the underlying resource stack. They allocate the potential created by the chosen resources across item property lines.

Locked rule:

```text
Resource stats set the potential and ceiling.
Tuning chooses where that potential goes.
Experimentation tests how cleanly the craft reaches that potential.
No tuning choice can make a low-Conductivity resource behave like Veyrith Copper for Conductivity-driven properties.
```

Design implications:

- A rare high-Conductivity named resource remains valuable because it raises the ceiling for Conductivity-driven schematics.
- A weaker resource can still be useful when its stat profile fits a different property line, but tuning cannot turn it into a substitute for a rare best-fit resource.
- Safe Craft uses the chosen resources predictably, with lower ceiling access.
- Careful Experiment can reach slightly more of the chosen resources' potential, but cannot exceed the resource-defined ceiling in MVP.
- Crafted items should preserve provenance: the named resources used should remain visible or auditable on the item/result.

This protects the long-term market loop: find the right named resource with the right stats before it disappears, stockpile it, then use it intelligently in schematics.

Locked modes:

**Safe Craft**

- Predictable result.
- No flaw chance.
- Lower ceiling.

**Careful Experiment**

- Modest upside.
- Small flaw chance.
- Bounded by named-resource quality and schematic weights.
- Cannot make poor materials rival rare materials in their relevant stats.
- No catastrophic loss in MVP.

MVP crafting uses no mandatory refining step. Extracted named resources can go directly into schematics.

Decision 009 clarifies the relationship between resources and tuning: named resources set the base value and practical ceiling of crafted item properties; tuning points allocate and express that potential, but never mutate resource stats or make poor resources equivalent to rare high-fit resources.

Refining is deferred until the toy proves fun, and only returns if it creates a real decision such as contamination removal at yield loss, byproduct splitting, specialized material forms, compatibility improvement, or resource-integrity risk. Refining must not become a generic waiting-bar tax between extraction and crafting.

Future direction if the toy is fun:

- Preserve fixed named-resource identity and combinable stacks.
- Preserve historical scarcity: once a named resource despawns, that exact resource should not return.
- Let stockpiling, provenance, and intelligent schematic use become long-term economic play.
- Expand experimentation carefully only after players understand the MVP three-point tuning model.

---

## Decision 008 — MVP UI Proof and First Click-Path

**Status:** Locked.

The MVP UI exists to prove the core toy, not to present the full future MMO.

The first playable prototype uses exactly six primary screens:

1. **Pilot Home**.
2. **Red Mesa Survey**.
3. **Signal Detail / Deploy Thumper**.
4. **Thumper Run / Event Window**.
5. **Claim Results**.
6. **Crafting + Gear / Repair**.

The required first click-path is:

```text
Choose frame
→ survey Red Mesa
→ compare 2–3 signals
→ choose one signal
→ deploy thumper
→ resolve 2 event windows
→ claim named resource
→ choose schematic
→ fill named-resource slots
→ preview item properties
→ spend 3 tuning points
→ Safe Craft or Careful Experiment
→ craft item
→ equip or repair
→ understand why the next run may be better
```

The **Crafting + Gear / Repair** screen must prove the thinking-craft model from Decision 007. It must include:

- schematic list;
- resource slot picker;
- named-resource comparison;
- weighted property preview;
- exactly 3 tuning points;
- Safe Craft / Careful Experiment choice;
- result explanation;
- equip / repair action.

The MVP UI excludes marketplace UI, chat UI, full world map, public helper board, group thumper UI, factory crafting UI, batch crafting UI, refining station UI, settlement UI, realtime combat UI, and player city UI.

---

## Decision 009 — Resource Primacy and Tuning Guardrail

**Status:** Locked.

Crafting must preserve the SWG-inspired economy principle that **the named resource matters first**.

The central long-term resource/crafting loop is:

```text
Find the right named resource with the right stats before it disappears
→ stockpile or trade it
→ use it intelligently in schematics
→ preserve the resulting item's provenance and market story
```

MVP tuning is an experimentation-like layer, not a resource-upgrade layer.

Locked crafting guardrails:

- Named resource stats are fixed when the resource spawns.
- Stacks of the same named resource remain identical and combinable.
- Tuning never changes a resource stack's OQ, Conductivity, Hardness, Heat Resistance, or Malleability.
- Tuning never turns a mediocre resource into a rare-resource equivalent.
- Schematics define which resource stats matter for each item property.
- Resource choice and schematic fit create the base value and practical ceiling for each property.
- Tuning points decide **where** the crafter pushes the item within that resource-derived potential.
- Safe Craft and Careful Experiment may improve, stabilize, or slightly flaw the crafted item outcome, but they do not alter the underlying named resource quality.
- Careful Experiment can create a better rolled item from good inputs; it cannot erase the advantage of finding, stockpiling, and spending rare high-fit resources.

In MVP terms:

```text
Resource quality/stat fit = primary power source and ceiling
Tuning allocation         = property priority and expression
Craft/experiment result   = bounded variance within that potential
```

Example:

```text
Veyrith Copper with very high Conductivity is genuinely valuable for Survey Scanner Module Mk I and Efficient Pump lines that weight Conductivity.
Putting tuning points into Survey Clarity helps express that value.
Putting the same tuning points on low-Conductivity material should not produce an equivalent scanner.
```

This protects future market behavior: rare resources remain worth discovering, stockpiling, trading, and using carefully. Player skill matters, but it should amplify and direct good resources rather than replace them.

---

## Decision 010 — MVP Stat Scale, Recipe Weights, and Output Ranges

**Status:** Locked.

Decision 010 gives the MVP enough math to prove that resource choice matters without turning the prototype into a spreadsheet wall.

Locked scale:

```text
Resource stats:           1–1000 internal value
Crafted property scores:  0–100 displayed property score
MVP resource stats:       OQ, Conductivity, Hardness, Heat Resistance, Malleability
```

Named resources keep fixed stats while active and after despawn. Stacks of the same named resource remain identical and combinable. Crafting converts selected named resources into item property scores through transparent schematic weights.

Decision 010 preserves Decision 009:

```text
Resource quality/stat fit = primary power source and ceiling
Tuning allocation         = property priority and expression
Craft/experiment result   = bounded variance within that potential
```

Tuning points are relative multipliers, not flat quality injections.

```text
base_property_score  = weighted_resource_stat_total / 10
tuned_property_score = base_property_score × (1 + 0.05 × tuning_points_on_property)
final_property_score = capped at 100
```

Each MVP craft has exactly **3 tuning points** total. One tuning point adds **+5% relative expression** to that property line. This means good resources benefit more from tuning than poor resources, and poor resources cannot be tuned into rare-resource equivalents.

#### Resource quality bands

| Internal stat | Band | Player meaning |
|---:|---|---|
| 1–249 | Poor | Bad fit except as filler. |
| 250–499 | Weak | Usable, but not exciting. |
| 500–649 | Solid | Acceptable working material. |
| 650–799 | Strong | Worth using deliberately. |
| 800–899 | Excellent | Worth stockpiling or saving. |
| 900–1000 | Exceptional | Market-worthy / historically notable. |

Survey screens reveal hints and bands first. Claimed resources and crafting previews may show exact values.

#### First Red Mesa Bloom prototype stats

These are locked as **prototype balance values**, not final live-economy tuning.

| Resource | Family | OQ | Conductivity | Hardness | Heat Resistance | Malleability |
|---|---|---:|---:|---:|---:|---:|
| **Keth Iron** | Structural Alloy | 520 | 220 | 650 | 480 | 560 |
| **Red Mesa Conductive Slag** | Conductive Metal | 340 | 610 | 310 | 720 | 390 |
| **Asterion Frame Alloy** | Structural Alloy | 690 | 260 | 850 | 610 | 760 |
| **Pale Ember Crystal** | Reactive Crystal | 680 | 520 | 360 | 880 | 470 |
| **Veyrith Copper** | Conductive Metal | 820 | 930 | 260 | 540 | 620 |
| **Thornwake Crystal** | Reactive Crystal | 590 | 910 | 420 | 210 | 160 |

#### Craft modes

**Safe Craft**

- No flaw chance.
- Predictable result.
- Final score equals the tuned property score.

**Careful Experiment**

- 75% chance: +3% to tuned property score.
- 20% chance: no change.
- 5% chance: minor flaw on the crafted item.
- No catastrophic loss in MVP.
- No resource mutation.
- No resource-stack loss beyond the normal consumed ingredients.

Minor flaws affect the crafted item only. Examples: +5% wear rate, -5% secondary property, slightly higher repair cost, or a small reliability tag.

#### Crafted property output bands

| Final property score | Output band |
|---:|---|
| 0–39 | Poor |
| 40–54 | Basic |
| 55–69 | Solid |
| 70–84 | Strong |
| 85–94 | Excellent |
| 95–100 | Exceptional |

Do not use **Legendary** as an MVP output band. Save that language for future historical-market behavior after resources can become extinct and item provenance matters to players.

#### Locked MVP recipe slots and weights

**Basic Drill Head**

Slots:

- Cutting Bit: Structural Alloy.
- Conductive Coil: Conductive Metal.
- Resonance Crystal: Reactive Crystal.

| Property | MVP weight formula |
|---|---|
| **Extraction Rate** | 50% Cutting Bit Hardness + 30% Conductive Coil Conductivity + 20% average OQ |
| **Depth Access** | 50% Cutting Bit Hardness + 30% Resonance Crystal Heat Resistance + 20% average OQ |
| **Wear Control** | 45% Resonance Crystal Heat Resistance + 35% Cutting Bit Malleability + 20% average OQ |

**Efficient Pump**

Slots:

- Intake Manifold: Conductive Metal.
- Flexible Housing: Structural Alloy.
- Flow Crystal: Reactive Crystal.

| Property | MVP weight formula |
|---|---|
| **Recovery Efficiency** | 45% Intake Conductivity + 35% Housing Malleability + 20% average OQ |
| **Clog Resistance** | 45% Housing Malleability + 30% Housing Hardness + 25% average OQ |
| **Field Stability** | 45% Flow Crystal Heat Resistance + 35% Intake Conductivity + 20% average OQ |

**Reinforced Hull Plate**

Slots:

- Outer Plate: Structural Alloy.
- Bracing Layer: Structural Alloy.
- Bonding Matrix: Reactive Crystal.

| Property | MVP weight formula |
|---|---|
| **Max Condition** | 45% Outer Plate Hardness + 30% Bracing Malleability + 25% average OQ |
| **Damage Reduction** | 50% Outer Plate Hardness + 30% Bonding Matrix Heat Resistance + 20% average OQ |
| **Repairability** | 45% Bracing Malleability + 35% average OQ + 20% Outer Plate Hardness |

**Survey Scanner Module Mk I**

Slots:

- Conductive Core: Conductive Metal.
- Crystal Lens: Reactive Crystal.
- Frame Mount: Structural Alloy.

| Property | MVP weight formula |
|---|---|
| **Survey Clarity** | 60% Conductive Core Conductivity + 25% Crystal Lens OQ + 15% average OQ |
| **Stat Hint Accuracy** | 50% Conductive Core Conductivity + 30% Crystal Lens Heat Resistance + 20% average OQ |
| **Signal Range** | 55% Conductive Core Conductivity + 25% Crystal Lens Heat Resistance + 20% average OQ |

**Field Repair Kit**

Slots:

- Patch Alloy: Structural Alloy.
- Control Filament: Conductive Metal.
- Reactive Binder: Reactive Crystal.

For MVP, **Reactive Binder** is the temporary stand-in for a future sealant/chemical resource.

| Property | MVP weight formula |
|---|---|
| **Condition Restored** | 45% Patch Alloy Malleability + 35% average OQ + 20% Patch Alloy Hardness |
| **Integrity Safety** | 40% Patch Alloy Malleability + 30% Patch Alloy Hardness + 30% average OQ |
| **Field Reliability** | 45% Reactive Binder Heat Resistance + 35% Control Filament Conductivity + 20% average OQ |

Decision 010's numbers are allowed to change during tuning, but the locked design shape is: **resource stats first, schematic weights second, tuning as relative expression third, bounded experimentation last**.


---

## Decision 011 — MVP Onboarding and First-Session Script

**Status:** Locked.

The MVP first session must guide a new player through the full toy once without turning the game into a fake tutorial or hiding the real systems.

The first session teaches:

1. Choose a frame.
2. Survey Red Mesa.
3. Compare named resources.
4. Deploy a thumper.
5. Resolve two event windows.
6. Claim a named resource.
7. Craft one useful item through the thinking-craft flow.
8. Equip or repair.
9. Return to survey and see why the next run may be better.

#### Locked first-session sequence

1. **Frame choice:** the player chooses Recon, Engineer, or Vanguard. The UI describes them as verbs, not stat blocks:
   - Recon: better at reading signals.
   - Engineer: better at keeping machinery alive.
   - Vanguard: better at suppressing threat.
2. **Starter kit:** the player starts with Basic Scanner Mk 0, Basic Personal Thumper, Worn Basic Drill, Worn Basic Pump, Worn Basic Hull, and a small starter stockpile of Keth Iron and Pale Ember Crystal.
3. **First survey:** the first Red Mesa survey shows exactly three signals: Keth Iron, Veyrith Copper, and Thornwake Crystal.
4. **First recommended target:** the tutorial recommends Veyrith Copper but does not force it.
5. **First thumper run:** the first run has 2 event windows, no high-risk push option, no surprise failure, no thumper deletion, and no Integrity damage.
6. **First event windows:** the scripted first complications are Signal Drift, then Pump Strain.
7. **First claim result:** the run guarantees enough Veyrith Copper to craft one Survey Scanner Module Mk I, plus small component wear and a clear result explanation.
8. **First guaranteed craft:** the first guaranteed craft is Survey Scanner Module Mk I, not Basic Drill Head.
9. **First tuning default:** the suggested tuning for the first Survey Scanner Module Mk I is 2 points in Survey Clarity, 1 point in Stat Hint Accuracy, and 0 points in Signal Range. The player may change it.
10. **First session endpoint:** after equipping the scanner, the player returns to Red Mesa Survey and sees clearer information.

#### Required first-session proof

The first session must prove this in one pass:

```text
I found a promising named resource.
I understood what it was good for.
I extracted it through a small thumper event.
I used it intelligently in a schematic.
The crafted item improved my next survey decision.
```

#### First survey teaching set

The first three visible signals exist to teach resource identity:

- **Keth Iron:** safe baseline structural material.
- **Veyrith Copper:** obvious exciting high-Conductivity find.
- **Thornwake Crystal:** tempting specialist material with dangerous tradeoffs.

#### First thumper teaching set

The first event windows are:

1. **Signal Drift → Signal Tune.**  
   Teaches that event actions can preserve resource lock and that survey/signal clarity matters.
2. **Pump Strain → Clear Pump Problem.**  
   Teaches that recovery efficiency and waste matter without mutating named-resource stats.

Hull Damage is intentionally deferred until the player has seen or crafted repair tools. Repair pressure should not arrive before the player understands Condition, Integrity, and Field Repair Kits.

#### First craft teaching set

The first guaranteed craft is **Survey Scanner Module Mk I** because it closes the toy immediately:

```text
craft scanner
→ equip scanner
→ survey again
→ see clearer resource information
```

The player should see an immediate improvement such as a clearer Conductivity band, revealed OQ hint, or narrowed threat estimate. The UI should make it obvious that crafting changed the next decision.

#### Excluded from first-session onboarding

- No long story intro.
- No NPC dialogue tree.
- No marketplace prompt.
- No group helper prompt.
- No refining tutorial.
- No repair-kit tutorial until Hull Damage is introduced.
- No factory/batch crafting tutorial.
- No full map tutorial.
- No combat tutorial.
- No permanent build/talent choice before the player understands the toy.


---

## Decision 012 — MVP Data Model / Economy Ledger

**Status:** Locked.

The MVP must be **server-authoritative and auditable**. The first prototype does not need the full future MMO database, but it does need enough structure to explain every resource, craft, item, thumper result, durability change, and repair after the fact.

The MVP economy ledger must be able to answer:

1. What named resources exist in the current Red Mesa Bloom?
2. Which resource stacks does the pilot own?
3. Which exact named resources were consumed by a craft?
4. What item was produced?
5. What stats, tuning, craft mode, and outcome created that item?
6. What thumper run produced which resources, waste, wear, damage, and salvage?
7. What repair action changed Condition or Integrity?
8. Can every economy-relevant change be explained after the fact?

#### Locked MVP records

The MVP uses these minimum authoritative records:

1. **Pilot** — player identity and chosen frame.
2. **Resource Instance** — one named resource in a bloom, with immutable stats.
3. **Resource Stack** — a pilot-owned quantity of a resource instance.
4. **Item** — a crafted/equipped object with Condition, Integrity, property scores, and provenance.
5. **Schematic Definition** — versioned game data for the five locked recipes, their slots, property lines, weights, and tuning lines.
6. **Crafting Attempt** — the audit record for selected resources, consumed quantities, tuning, craft mode, base/tuned/final scores, flaw result, and output item.
7. **Thumper Run** — the audit record for target resource, equipped Drill/Pump/Hull, run mode, visible state, and timing.
8. **Thumper Event Window** — the audit record for each complication, response, and before/after state.
9. **Thumper Run Result** — the final payout/wear/damage/salvage explanation.
10. **Repair Action** — the audit record for explicit repair-kit use and Condition/Integrity changes.
11. **Economy Ledger** — the append-style record of every economy-relevant resource, item, condition, or integrity mutation.

#### Key data rules

- Resource Instance stats are immutable after creation.
- Stacks of the same named resource combine by `pilot_id + resource_instance_id`.
- Economy-changing quantities and current ownership must remain relational and transaction-safe.
- JSON is acceptable for flexible MVP payloads such as crafted property previews, provenance, event before/after snapshots, salvage details, and result explanations.
- Schematic definitions should live in versioned game data for MVP so recipe weights can tune without rewriting core logic.
- Repair kits are spent only through explicit repair actions. There is no automatic repair-kit spending.
- Thumper runs record the parts used so wear, damage, output, and event results can be audited.
- Claiming, crafting, repair, and other economy actions should be idempotent so duplicate clicks/requests cannot duplicate resources or items.

#### Economy ledger requirement

Every economy-relevant mutation creates a ledger entry.

Example event types:

```text
survey_completed
thumper_deployed
thumper_claimed
resource_granted
resource_consumed
item_crafted
item_equipped
item_condition_changed
repair_kit_consumed
item_repaired
```

The ledger exists to answer:

```text
Where did this resource come from?
Where did it go?
What craft consumed it?
What item did it become?
Why did this item lose Condition?
What repair kit restored it?
```

#### MVP data-model exclusions

Decision 012 does **not** add marketplace, player-to-player trade, guilds, chat/moderation, settlements, factories, batch crafting, refiner/separator systems, group-thumper contribution accounting, monetization, or public contract-board tables to the MVP.

Those are future layers. The MVP data model exists to prove the toy and protect resource/crafting trust before multiplayer economy features are added.

---

---

## Decision 013 — MVP Success Metrics and Playtest Instrumentation

**Status:** Locked.

The MVP must measure whether the core toy is understandable, repeatable, and fun before adding a second major loop.

The prototype should track evidence in seven categories:

1. First-session funnel.
2. Resource/crafting comprehension.
3. Voluntary repeat behavior.
4. Event-action comprehension.
5. Durability/repair trust.
6. Economy-ledger correctness.
7. Friction and confusion points.

### First-session funnel

Track whether a player reaches each locked first-session step:

```text
frame_chosen
first_survey_started
first_survey_completed
signal_compared
veyrith_copper_recommended
target_signal_selected
thumper_deployed
event_window_1_resolved
event_window_2_resolved
thumper_claimed
resource_claimed
schematic_opened
resource_slots_filled
tuning_points_spent
craft_mode_chosen
item_crafted
item_equipped
second_survey_completed
```

Prototype target:

> A new tester should reach the second survey without outside explanation.

### Resource/crafting comprehension

The key question is:

> Did the player understand that Veyrith Copper was good because of its stats and schematic fit, not because the tutorial magically said so?

Track:

- whether the player inspects resource stats;
- whether the player compares at least two resources;
- whether the player changes resource-slot selection;
- whether the player reads or hovers property weights;
- whether the player changes tuning allocation;
- whether the player deliberately chooses Safe Craft or Careful Experiment;
- whether the player can explain why the crafted item was good or bad.

Post-test questions:

```text
Why was Veyrith Copper useful for Survey Scanner Module Mk I?
What did tuning change?
Did tuning change the resource itself?
Why was Thornwake Crystal tempting but risky?
```

Success signal:

```text
Player can explain:
resource stats → schematic weights → property preview → tuning expression.
```

Failure signal:

```text
Player says: “I just clicked the highlighted thing.”
```

### Voluntary repeat behavior

The strongest early proof is not that a tester finished onboarding. The strongest proof is that they finish the first scanner craft, see a better second survey, and choose to keep going.

Track:

- whether the player starts a second survey voluntarily;
- whether the player deploys a second thumper;
- whether the player crafts or plans a second item;
- whether the player checks what other resources are good for;
- whether the player asks when the bloom changes;
- whether the player wants to save or stockpile a named resource.

### Event-action comprehension

Track whether event actions are readable:

- Signal Drift appeared; did the player choose Signal Tune?
- Pump Strain appeared; did the player choose Clear Pump Problem?
- Did the player understand what happened if they ignored a complication?
- Did Claim Results explain the consequence clearly?

Success signal:

```text
Player can connect:
Pump Strain → Pump Flow loss → lower recovered quantity / more waste.
```

Failure signal:

```text
Player says: “I don’t know why I got that amount.”
```

### Durability/repair trust

Early tests should track item wear without over-testing repair before Hull Damage and Field Repair Kits have been introduced.

Track:

- whether the player notices Drill/Pump/Hull wear;
- whether wear feels fair;
- whether the player understands Condition;
- whether the player understands that no Integrity damage occurs in the first run;
- whether the player trusts that items will not be surprise-deleted.

When Hull Damage and Field Repair Kits enter later sessions, also track:

- whether the player previews repair outcome;
- whether the player understands Condition Restored;
- whether the player understands Integrity Safety;
- whether repair feels like a decision instead of a tax.

### Economy-ledger correctness

Decision 013 validates Decision 012. For every test run, the internal audit should confirm:

- no negative resource stacks;
- no duplicate thumper claims;
- no duplicate craft outputs;
- consumed resources match crafted item provenance;
- item properties match schematic formula + tuning + craft mode;
- wear events match thumper run result;
- repair actions consume the correct kit;
- ledger entries match current inventory/item state.

### Friction and confusion points

Track and annotate:

- where the player pauses;
- where the player backtracks;
- where the player opens a screen and closes it without acting;
- where the player asks what a word means;
- where the player waits instead of making a choice;
- where the player confuses resource family with resource stat;
- where the player confuses tuning with upgrading the resource.

### Prototype success gates

Before adding another major loop, the MVP should pass these qualitative gates:

- **Comprehension gate:** most testers can explain why Veyrith Copper helped the scanner craft.
- **Repeat gate:** a meaningful share of testers voluntarily start a second survey or second thumper run.
- **Crafting gate:** testers use or at least understand resource-slot choice, property preview, and 3 tuning points.
- **Event gate:** testers understand at least one event consequence from the Claim Results screen.
- **Trust gate:** testers do not feel item wear is surprise punishment.
- **Technical gate:** the ledger audit can explain every resource, craft, item, wear, and repair change.

Decision 013 intentionally avoids hard numeric thresholds like retention percentages or strict completion times until the first qualitative playtests produce signal. The first goal is to learn whether the toy is working, not to optimize a funnel prematurely.

---

## Decision 014 — MVP Prototype Ladder and Build Order

**Status:** Locked.

The MVP should be built through a ladder of increasingly concrete prototypes. Do not start by building the full async MMO app.

Locked build order:

1. **Paper / spreadsheet economy prototype.**
2. **Text-only loop prototype.**
3. **Clickable single-player vertical slice.**
4. **Instrumented playtest build.**
5. **Presentation pass.**
6. **Production-point review.**

### Stage 1 — Paper / spreadsheet economy prototype

Purpose:

```text
Prove the resource/crafting math before building UI.
```

This stage tests:

- first Red Mesa Bloom stats;
- recipe weights;
- exactly 3 tuning points;
- Safe Craft;
- Careful Experiment;
- Field Repair Kit substitution;
- crafted property output bands.

It should answer:

```text
Does Veyrith Copper clearly outperform weak Conductivity material for Survey Scanner Module Mk I?
Does Thornwake Crystal look tempting but risky?
Does tuning express resource quality without replacing it?
Do the five recipes produce meaningfully different property profiles?
Do Safe Craft and Careful Experiment feel different without creating chaos?
```

Deliverable:

```text
One spreadsheet or simple script that can run all five recipes using the six locked resources and show final property scores.
```

No UI, account system, database, marketplace, chat, multiplayer, or full app shell is required at this stage.

### Stage 2 — Text-only loop prototype

Purpose:

```text
Prove the loop sequence before polishing screens.
```

This can be a CLI, simple web form, markdown mock, or rough local page. It should let a tester complete:

```text
Choose frame
→ survey three signals
→ select Veyrith Copper or another signal
→ deploy thumper
→ resolve Signal Drift + Pump Strain
→ claim resources
→ craft Survey Scanner Module Mk I
→ equip it
→ run a clearer second survey
```

Success condition:

```text
The player understands the loop even when presentation is rough.
```

### Stage 3 — Clickable single-player vertical slice

Purpose:

```text
Turn the text prototype into the six locked MVP screens.
```

Screens:

1. Pilot Home.
2. Red Mesa Survey.
3. Signal Detail / Deploy Thumper.
4. Thumper Run / Event Window.
5. Claim Results.
6. Crafting + Gear / Repair.

Build only:

- single pilot;
- single region;
- single bloom;
- five recipes;
- basic inventory;
- basic item Condition / Integrity;
- basic economy ledger;
- first-session path.

Do not build marketplace, chat, guilds, group thumpers, contracts, admin panels, refining, factories, mobile wrapper, or broad MMO infrastructure.

### Stage 4 — Instrumented playtest build

Purpose:

```text
Prove Decision 013.
```

Add the event tracking needed to answer:

- where players drop off;
- whether players compare resources;
- whether players understand tuning;
- whether players start a second survey voluntarily;
- whether the ledger matches final inventory and item state.

This stage should produce:

```text
session transcript
event list
ledger audit
manual tester notes
post-test answers
```

### Stage 5 — Presentation pass

Purpose:

```text
Check whether the pixel/menu fantasy sells the world.
```

This is not full art production. Add only enough presentation to test whether the prototype feels like frontier extraction, strange named resources, thumper pressure, crafted machinery, worn gear, and one-more-run curiosity.

Minimum presentation:

- rough Red Mesa visual identity;
- small frame portraits or icons;
- resource icons;
- thumper part icons;
- event feedback text;
- claim-result feedback;
- simple sound or animation placeholders if cheap.

### Stage 6 — Production-point review

Purpose:

```text
Decide whether the toy has earned expansion.
```

Review against Decision 013's gates:

- comprehension gate;
- repeat gate;
- crafting gate;
- event gate;
- trust gate;
- technical gate.

Only after that should the project consider public helper boards, group thumpers, marketplace, refining, contracts, more regions, more resources, more recipes, or broader MMO systems.

Core guardrail:

```text
No broad MMO infrastructure until the tiny toy proves itself.
```

---

---


## Decision 015 — MVP Definition of Done and Scope Freeze

**Status:** Locked.

Decision 015 is the final MVP seal.

Decisions 001–014 now define the MVP. The MVP is not everything the game may become; it is the smallest playable extraction-crafting toy that can prove whether the design deserves expansion.

### Definition of Done

The MVP is complete when all of the following are true:

1. **Playable loop complete.** A player can choose a frame, survey Red Mesa, compare named resources, deploy a personal thumper, resolve event windows, claim a named resource, craft through named-resource slots + property preview + 3 tuning points, equip or repair, and run a clearer second survey.
2. **Locked content exists.** The prototype includes 1 region, 3 frames, 3 resource families, 6 named resources, 5 stats, 3 thumper component slots, 4 event actions, 4 complication types, 5 recipes, and 6 primary screens.
3. **Crafting proves actual thinking.** The player sees resource stats, schematic weights, output property preview, 3 tuning points, craft mode, and result explanation.
4. **Resource primacy holds.** Resource stat fit sets the base value and practical ceiling; tuning expresses and prioritizes that value but never upgrades or mutates the resource.
5. **Economy is auditable.** Every resource, craft, item, wear event, and repair action can be explained afterward through the Decision 012 records and economy ledger.
6. **Playtest evidence exists.** Decision 013 evidence is collected for first-session funnel, comprehension, voluntary repeat behavior, event-action comprehension, durability/repair trust, ledger correctness, and friction/confusion notes.
7. **Prototype ladder has been followed.** The project follows Decision 014 before broader MMO implementation.

### Scope-freeze rule

New ideas do not enter MVP scope unless they:

1. fix a contradiction in a locked decision;
2. unblock the prototype ladder;
3. improve comprehension of the locked toy;
4. protect resource/crafting/economy trust;
5. are required for Decision 013 playtest evidence.

Otherwise, they go to the Layered Feature Backlog.

### Explicit MVP exclusions

The MVP still excludes marketplace, player-to-player trade, chat, guilds, settlements, public helper boards, group thumpers, contracts, multiple regions, advanced refining, Chemical Purity, separators, factories, batch crafting, weapons, armor suits, PvP, realtime combat, monetization, mobile wrapper, broad MMO infrastructure, and a large content pipeline.

### Final MVP state

The MVP is defined. Further work should move into the Decision 014 prototype ladder unless a proposed change satisfies the scope-freeze rule.

---

## Decision 016 — Stage 1 Paper-Test Amendments to Decision 010 Weights

**Status:** Locked (2026-06-09, at Ryan's direction following Stage 1 review: "items need different stats"). Qualified under scope-change rule #1 (fixed a contradiction between locked decisions).

The Decision 014 Stage 1 paper/spreadsheet prototype was executed (see `BUILD_PLAN.md`, Part C). All five recipes were run against all valid combinations of the six locked Red Mesa Bloom resources.

### Contradiction found

Decision 006 locks Thornwake Crystal's identity as "one great stat and one terrible stat; tempting but risky." Under Decision 010's locked weights, **Thornwake never wins**: in 60 of 60 property comparisons, swapping Thornwake for Pale Ember Crystal produces an equal or better result. The cause is structural: Thornwake's great stat is Conductivity (910), but no Reactive Crystal slot in any recipe reads Conductivity — every RC slot reads Heat Resistance or OQ, Thornwake's weak stats. Thornwake is strictly dominated, contradicting Decision 006's locked stat personality.

A second weakness: Field Repair Kit's "Condition Restored" and "Integrity Safety" are computed from the same three stats in near-identical proportions (correlation +1.00 across all combos), so the Control Filament and Reactive Binder slots have no effect on Integrity Safety and tuning between those two lines is a non-choice.

### Proposed amendments

**Amendment A — Survey Scanner Module Mk I, Survey Clarity:**

```text
WAS: 60% Conductive Core Conductivity + 25% Crystal Lens OQ              + 15% average OQ
NOW: 60% Conductive Core Conductivity + 25% Crystal Lens Conductivity   + 15% average OQ
```

Paper-verified effect: Thornwake becomes the best Survey Clarity lens (89.0 Exceptional vs 79.8 Strong with Pale Ember) while remaining clearly worse on Stat Hint Accuracy (66.8 vs 87.5) and Signal Range (70.4 vs 87.8). Thornwake is now genuinely tempting but risky — exactly the Decision 006 intent — and the choice appears in the first survey's teaching set (Keth Iron / Veyrith Copper / Thornwake Crystal).

**Amendment B — Field Repair Kit, Integrity Safety:**

```text
WAS: 40% Patch Alloy Malleability + 30% Patch Alloy Hardness        + 30% average OQ
NOW: 40% Patch Alloy Hardness     + 30% Reactive Binder Heat Resist. + 30% average OQ
```

Paper-verified effect: Condition Restored ↔ Integrity Safety correlation drops from +1.00 to +0.51, and the Reactive Binder slot now matters for Integrity Safety, making binder choice and tuning allocation real decisions.

Decision 003's MVP substitution formulas update accordingly if locked. All other Decision 010 weights are unchanged; all other Stage 1 checks passed without amendment.

---
## Decision 017 (REVISED) — MVP Time Model: Hybrid Active-Phase + Chosen Extraction Tail

**Status:** Locked (2026-06-10, per Ryan: "Yeah I think this sounds good. For an MVP."). Reward-curve note: active players SHOULD out-earn casuals — the target band is **~2–3:1 net, never ~10:1** — and the edge must come from prospecting skill and attention, not raw repetition. Retuned simulation lands at 2.3:1 (casual 1.5 crafts/day, active 3.5).

### The problem, quantified

`run_duration_sim.py` modeled three time models across three player archetypes (Casual 12 min/day, Regular 35, Active 100) over 14 days, with wear sinks, prospecting, and deposit depletion:

| Model | Active:Casual net ratio | Casual crafts/day | Active time usable | Verdict |
|---|---|---|---|---|
| A — short runs only (4 min, unlimited) | **8.8 : 1** | 0.61 | 99% | Inflationary: active players out-earn casuals ~9× — exactly the "timers too short" risk |
| B — Farm RPG long timer only (4 h) | 2.5 : 1 | 1.04 | **10%** | Economy healthy but an active player's hour has nothing in it — the tedium risk |
| C — hybrid (below, retuned) | **2.3 : 1** | 1.52 | ~70% | In the target reward band; decision-dense active play; self-balancing sink (9%→20% with run frequency) |

### Proposed model (C)

```text
A thumper run = short ACTIVE PHASE + player-chosen PASSIVE EXTRACTION TAIL.

Active phase (~3–5 min, foreground, no mandatory waiting):
  prospect the signal (0–3 sample cycles) → deploy → resolve event windows.

Extraction tail (player picks at deploy): 15 min / 1 h / 4 h / 8 h.
  Yield is sublinear in tail length (≈ duration^0.5), so:
  short tails = best units/hour but more wear per unit (active replay style);
  long tails = best units/login (Farm RPG crop style).

One pilot = one thumper = one concurrent run. Claim on return; absence
resolves on return via Decision 005 conservative defaults. No jobs.
```

There is deliberately **no single run length**: the active phase is fixed-short for everyone; the tail is the player's time-budget statement. Active players replay short tails and pay a rising wear share (sink grows from 12% of gross at casual pace to 31% at spam pace — the anti-inflation valve is the repair economy itself, which also feeds crafting demand). Casual players get Farm RPG check-in satisfaction without being out-earned 9:1.

### Costing rule for 1-player-1-thumper

SWG balanced around fleets of harvesters; we balance around one thumper. Recipe input quantities are expressed in **claims, not units: ~2 typical casual claims ≈ 1 craft** (prototype: recipe ≈ 120 units, repair kit ≈ 60, 1 h tail ≈ 45 units at concentration 1.0). At these numbers a casual player affords ~1.2 crafts/day and an active player ~2.1 — progression every session for everyone, surplus for nobody. All values are knobs in `run_duration_sim.py`.

### Amendment to Decision 017 (tutorial)

**Date:** 2026-06-11

Tutorial (first-session) runs use a fixed **2-minute** extraction tail so the first loop closes in one sitting. This tail is tutorial-only — it is never offered on regular runs. Tutorial runs are exempt from the sublinear passive-yield penalty: compressed training time still yields at least the 1-hour baseline haul so the first Survey Scanner Mk I craft clears its 30-unit Conductive Metal slot core. Regular runs keep 15 min / 1 h / 4 h / 8 h tail options unchanged.

---

## Decision 018 — Seeded Random Bloom Variance in MVP

**Status:** Locked (2026-06-09, at Ryan's direction: "rotating resources are where the fun is... we need to change it"). Qualifies under scope-change rules #3 (improves comprehension of the locked toy) and #4 (protects resource/crafting/economy trust).

### Verified SWG grounding

Research confirmed the scarcity mechanics Ryan described: SWG resource stats were selected at random per spawn within class-specific lower/upper caps; resource lifetimes were random within fixed ranges (6–11 days inorganic, 6–22 organic); each resource carried a forever-unique name; and once despawned, a resource never returned. High-quality spawns were therefore rare events by construction, many rotations were mediocre, and that variance powered stockpiling, speculation, and the crafting market. Schematic pickiness ("a schematic is king") meant a resource's value depended on stat *fit*, not raw numbers.

### What enters the MVP

The MVP gains a **seeded random bloom generator** — a pure domain function, not a scheduler:

1. **Family stat caps.** Each resource family defines min/max caps per stat (prototype values in `BUILD_PLAN.md` Part C; the locked Decision 006 bloom must be a valid roll within them). Stats roll uniformly within caps; the distribution is a tuning knob.
2. **Bloom = 6 rolled resources** (2 per family), each with a generated unique name and immutable stats, stamped with a bloom id.
3. **Manual rotation only.** Rotating the bloom is an explicit action (admin/dev button or playtest reset), replacing Decision 006's "manually reset between tests." No jobs, timers, or 7-day scheduler in MVP — the timed rotation remains a deferred layer that becomes trivial once this generator exists.
4. **Extinction and provenance.** When a bloom rotates, its resources stop spawning forever. Already-claimed stacks persist with full provenance, so stockpiling across rotations works from day one.
5. **First-session bloom stays seeded.** The locked Decision 006/010 bloom is bloom #1, preserving the Decision 011 onboarding script exactly. Random blooms begin at the first rotation.
6. **No orphan signature stats.** Every family's signature stat (CM Conductivity, SA Hardness, RC Heat Resistance) must be readable by at least one live schematic (true after Decision 016). Display stats with zero weight in every schematic are visually de-emphasized in survey/crafting UI so big-but-unreadable numbers cannot mislead (the Thornwake lesson, generalized).

### Monte Carlo evidence (10,000 random blooms, Decision 016 weights)

- Best achievable craft per bloom: median 82.7 (Strong), p10 73.0, p90 89.9 — a natural quality gradient.
- Exciting blooms (an Excellent craft possible): 35.3%. Mediocre blooms (nothing above Solid): 5.4%. Floor blooms (nothing above Basic): 0.03% — no bad-session risk requiring artificial floors.
- "Veyrith-tier" Conductive Metal (Cond ≥900 and OQ ≥800): ~1 in 17 blooms — at a future 7-day cadence, roughly three appearances per year, matching the SWG scarcity feel.
- Resource choice survives mediocrity: best-vs-worst combo gap averages 15.4 points (a full output band) even on mediocre blooms.
- The locked first bloom ranks in the top ~17% of scanner blooms: a generous but honest tutorial.

### Why this strengthens the toy

The bloom question — "is this bloom worth thumping hard, or do I save kits and stockpile for the next one?" — is the core SWG decision, and it now exists in the MVP at near-zero infrastructure cost. It also lets Stage 4 playtests answer whether mediocre-bloom sessions stay fun, which a single fixed bloom can never test.

---

## Decision 019 — Prospecting and Concentration (the SWG survey hunt)

**Status:** Locked (2026-06-10, per Ryan, with his refined flow below). Qualifies under scope-change rule #3 (the MVP question is "is surveying fun," and without this, survey is a menu read, not a hunt).

### Verified SWG grounding

The SWG survey loop was iterative: the survey tool showed a grid of concentration percentages with a waypoint toward the highest; players moved, rescanned, and sampled, and concentration directly multiplied extraction rate (~66–67% concentration = base rate). Sample yields scaled with skill and concentration, and samples were how crafters first obtained and inspected a resource. Critically, concentration topology was itself random: each spawn had a random number of concentration peaks, each with a random maximum — and ceilings varied widely by class (some spawns peaked in the 90s, others never exceeded the 60s–70s). Finding the spot was the gameplay.

### Locked MVP flow (Ryan, 2026-06-10)

```text
1. I need a metal for a recipe → scan by FAMILY → list of this rotation's
   resources in that family (two in MVP).
2. Pick one → concentration scan → candidate deposit spots appear.
3. Move to a spot and SAMPLE. The first sample on a resource:
   (a) yields a small amount of the resource itself, and
   (b) reveals its five stats for the first time.
   Stats are HIDDEN until first sample — surveying tells you what exists;
   sampling tells you what it's made of.
4. If I like it, keep hunting toward the ceiling — or take a mid-grade
   spot and just get started. My call, with tradeoffs.
5. Deploy on the chosen spot: concentration multiplies extraction rate
   (~0.5×–1.5×). Spots hold finite units.
```

### Guardrails and tradeoffs

- **No infinite surveying.** Scans and samples spend regenerating survey energy (the Farm RPG "explore" pattern), so hunting the ceiling is an active-time investment, not a free reroll loop.
- **Searching degrades gear.** Sampling and scanning wear the Survey Scanner's Condition — time spent hunting is paid for in the repair economy, which feeds crafting demand.
- **The rotation's range is hinted, the ceiling is earned.** Each resource rolls a concentration range at spawn (per Decision 018's generator, e.g. "30–67% this cycle"); the UI shows the rolled range so players can judge whether hunting is worth it, but the actual peak spot must be found by sampling, never read off a screen.
- **Scanner value deepens.** Survey Clarity tightens concentration estimates and reduces sampling energy waste, so the crafted-gear payoff improves both what you see and where you dig.
- Sampling's micro-yield is real but small — enough to feel like SWG hand-sampling, never a substitute for thumping.

Learning-path impact: one domain lesson (spots, sampling, energy, stat-reveal) plus extensions to the Survey and Signal Detail screens; stats-hidden-until-sampled also changes the tutorial's first-survey script (the three teaching signals start as family + concentration hints, and sampling Veyrith Copper is the first "wow" moment).

---

## Decision 020 — Staggered Random Resource Lifetimes (no predictable rotation)

**Status:** Locked (2026-06-10, per Ryan: a fixed global rotation is "too predictable"). Refines Decision 018; MVP impact is two generator fields (`lifespan_days`, `concentration_range`).

Verified SWG grounding: resource lifetimes were random within fixed ranges (6–11 days inorganic, 6–22 organic), shifts rolled continuously through the day rather than on a global schedule, and despawned resources never returned. A fixed 7-day all-at-once rotation is therefore both un-SWG and, as Ryan notes, too predictable — players would time the market around it.

Locked: each resource rolls an independent hidden lifespan (e.g., uniform 3–9 days) at spawn; resources expire and are replaced individually, so the bloom is a **rolling window** — always partly fresh, never wholly predictable, and "this Veyrith-tier copper could vanish tomorrow" becomes real stockpiling pressure. Each resource also rolls its **concentration range** at spawn (SWG-verified: random peaks with random maxima, ceilings varying widely by class) — consumed by Decision 019's range hint. In MVP, manual rotation stays (Decision 018), but the generator stamps both fields now so the future scheduler is a data read, not a migration.

---

---

## Decision 021 — Class-Call Slots, Family Read Diversity, and the Nine-Resource Bloom

**Status:** Locked (2026-06-10, per Ryan's pre-authorization: "Feel free to unlock earlier decisions... if 5 resources is not enough to truly test toy then we need to up the resources slightly... Then lock and update docs."). Amends Decisions 006, 010, and 011.

### Verified SWG grounding

Schematics specified resources at mixed generality — a real example, the Manufacturing Mechanism, required 100 Low-Grade Ore + 100 Chemical + 100 Non-Ferrous Metal + 150 Steel, and a resource satisfied any slot that listed it specifically or any of its containing categories (Lubricating Oil ⊂ Inert Petrochemical ⊂ Chemical ⊂ Inorganic). Quality-insensitivity was also explicit ("Low Quality Schematic — any resource quality works"); bulk professions like Architect ran on high-concentration low-quality resources, and recyclers existed to mass-combine scraps. Survey hardware: separate devices per category plus a Complete Resource Survey Tool that did all of them, with the resource chosen from a tree inside the tool.

Ryan's description of the fun is therefore exact: you didn't hunt "Verlan metal" — you read the schematic's class call, scanned that category, found 3–4 live candidates, and decided **which resource to spend on which recipe** based on stat fit. That allocation decision is the crafting game.

### The gap this fixes

Our slots already call families (the right generality), but the audit showed the allocation decision could not exist: every Conductive Metal slot in all five recipes read **Conductivity** — one best copper for everything, forever. And the locked SA pair was strictly dominated (Asterion ≥ Keth on every read stat).

### A. Family read diversification (amends Decision 010)

```text
Pump — Field Stability:
  WAS: 45% Flow Crystal HR + 35% Intake CONDUCTIVITY + 20% avg OQ
  NOW: 45% Flow Crystal HR + 35% Intake MALLEABILITY + 20% avg OQ

Field Repair Kit — Field Reliability:
  WAS: 45% Binder HR + 35% Filament CONDUCTIVITY + 20% avg OQ
  NOW: 45% Binder HR + 35% Filament HEAT RESISTANCE + 20% avg OQ
```

CM now reads Conductivity, Malleability, and Heat Resistance across the recipe set (orphan stats drop from 7 to 5 family-stat combinations; every family has ≥2 direct reads). A high-Cond/low-Mall copper is now a scanner copper, not a pump copper.

### B. Nine-resource seed bloom (amends Decision 006)

Three resources per family, alive simultaneously, rotating individually per Decision 020. Three new locked seed resources:

| Resource | Family | OQ | Cond | Hard | HR | Mall | Role |
|---|---|---|---|---|---|---|---|
| Sorrel Vein Copper | CM | 560 | 640 | 210 | 430 | 760 | the pump copper (Malleability) |
| Bendrel Ridge Alloy | SA | 610 | 150 | 430 | 330 | 880 | the flexible alloy (Malleability slots) |
| Glimmerfall Shard | RC | 800 | 680 | 300 | 640 | 210 | the OQ-filler crystal (lifts every avg-OQ term; cheap) |

Slot-winner check on the seed bloom: Veyrith wins scanner/drill/recovery contexts, Sorrel wins stability intakes, Slag wins repair filaments (HR 720), Asterion wins hardness slots, Bendrel wins malleability slots, Pale Ember wins HR slots, Thornwake wins the clarity lens. **Keth Iron and Glimmerfall Shard intentionally win no stat contest** — they are the bulk archetypes (below).

### C. Quantity/quality axis (per-resource concentration ranges + per-recipe input quantities)

Each seed resource's rolled concentration range expresses scarcity — bulk resources are easy to mass, prizes are not:

```text
Keth Iron 55–95% · Slag 50–90% · Glimmerfall 45–80% · Sorrel 40–75% ·
Bendrel 35–70% · Pale Ember 30–65% · Asterion 25–55% · Thornwake 25–55% ·
Veyrith 20–50%
```

Recipe input quantities differ (prototype, in Decision 017 claim-units): Hull Plate is bulk-heavy (60 Outer + 40 Bracing + 20 Bonding); Drill and Pump are 40/40/40; Scanner is quality-light (30/30/30); Repair Kit 25/20/15. "Do I spend scarce Asterion on a hull, or accept a Keth hull at Solid?" is now a real decision even where Asterion is stat-better — the SWG Architect lesson.

### D. One scanner, choose family

MVP uses a single survey scanner with a family selector (the Complete Tool model). Family-specialized scanner variants are a backlog layer.

### Amendment to Decision 011 (tutorial)

With Decision 019's stats-hidden-until-sampled and family scanning, the first session becomes: the scanner recipe calls for a Conductive Metal core → scan the CM family → three signals (Slag / Sorrel / Veyrith) with concentration hints → sample two → Veyrith's stat reveal is the "wow" moment → deploy on Veyrith. The within-family comparison is now taught directly; Thornwake's tempting-trap lesson moves to the Crystal Lens slot choice at the crafting screen.

### Simulation evidence

Monte Carlo (8,000 random blooms, 3 per family, 016+021 weights): median best craft 86.1; exciting blooms 58.2%; mediocre 0.8%; floor 0.00%; and **a CM allocation decision (different coppers winning scanner vs pump vs repair contexts) exists in 87.8% of blooms**. Note: richer pools soften whole-bloom scarcity (exciting rose from 35%→58%); per-rotation drama now comes from individual resource churn (020) and concentration scarcity (C) rather than whole-bloom quality — if Stage 4 wants rarer peaks, skew the roll distribution low (a data knob).

---

## Production-point question added by these decisions

**Is the loop complete without a combat minigame for the frames?** For the MVP test: yes by design — the active-mastery layer is prospecting (019) + event-window risk choices + push runs, and Vanguard expresses as choice strength, not reflexes. Firefall's lesson is that combat-class systems are the most expensive and churn-prone thing a small team can build. But the event-window system is deliberately a socket: a bounded tactical mini-encounter could later replace the Threat Surge menu choice without touching the economy. Lesson 8.2 must therefore ask testers directly: *did Threat Surge feel hollow as a menu choice — did you want a kinetic layer?* If yes, that is a backlog layer behind the production point, never a pre-playtest addition.

---

## Decision 022 — Post-Feedback Reset: the Settlement Slice

**Status:** Locked (2026-06-12, per Ryan; trickle rate 0.5 samples/hr confirmed same day after the energy sim). Full flow/UX detail lives in `FIRST_THUMP_SLICE_SPEC.md`.

### Evidence that forced this

Two external testers (2026-06-11/12, verbal + written feedback) plus `playtest_events` telemetry:

- **Comprehension failed before fun could be tested.** Both testers needed out-of-band context from Ryan to navigate at all; neither could name the toy. Jargon (red mesa, conductive slag, threat pressure) landed with no frame; the signal choice and the frame choice both read as unmotivated.
- **The funnel dies at the wait, not before deploy.** Six external pilots: time-to-first-deploy 1.7–5.6 min for most, but 4 of 5 external deploys were never claimed. The single claim came 7h17m after deploy, under social pressure. One pilot set up a second run after claiming (sampled spots, chose extraction tail) and abandoned without deploying — even a completed loop did not produce a voluntary second deploy. No external player has experienced the reward beat unprompted.
- **The UI reads as menus, not a game.** Dropdown-driven screens; the only interaction testers called clear was the pilot pick — the one element that does nothing.

### What this decision does

**Reopens** Decision 008 (UI proof and first click-path), Decision 011 (onboarding and first-session script), and the Decision 015 scope freeze (superseded by the scope statement below). **Keeps** the economy core — Decisions 010, 016, 017, 018, 019, 020, 021 — as structures, with their quantities and ratios demoted to tunable data pending the sampling/thumping balance sim. Blooms, hidden lifespans, concentration ranges, class-call slots, and the nine-resource seed bloom are all unchanged.

### Locked elements (pending Ryan's confirmation)

1. **Settlement premise.** The player is part of a small settlement bringing thumper production back online. In the slice the settlement is a narrative frame plus a turn-in ledger — posted needs by resource family, visible contribution bars, visible unlocks when bars fill — not a simulated economy. The settlement is the standing answer to "why am I thumping."
2. **One thumper; fleet size is settlement progression.** The slice has exactly one thumper slot. Additional slots are future settlement-infrastructure unlocks (Workshop tiers), a post-production-point layer. Noted constraint for that layer: event-window check-in burden multiplies with fleet size and needs a cap design.
3. **Sampling is the synchronous toy** (extends 019). An ASCII field map gradient hunt: scan shows concentration at your position, move, re-scan, converge on a peak that may or may not be high this rotation; first scan lands low in the rolled range. Sampling a spot is a short (~10s) commitment whose yield scales with local concentration. **Map topology is generated per resource instance at spawn** — peak count and maxima rolled per Decision 019's grounding, so every resource is its own terrain to learn. Sampling and thumping are the same verb at two time scales — hand-scale and industrial-scale — and the tutorial says so explicitly.
4. **Anti-substitution guards** so sampling can never replace thumping: (a) sampling spends pilot energy, thumping does not — energy regenerates as a **continuous trickle: cap 10 samples, 0.5 samples/hr** (sim-confirmed over daily reset; the most diligent player tops out at ~16 samples/day, holding the guard); (b) each spot holds a finite per-pilot hand-sample pool (4–5), separate from its thumpable units; (c) ratio verified by simulation: sampling yield/hour = **4.2–8.1%** of thumping yield/hour at the locked quantities (6.5% at the Keth-PEAK benchmark; sample yield 5u × concentration, 20u turn-in stacks). *Updated 2026-06-13 — was 6.4–8.5% under pre-slice sim.*
5. **Frame choice is cut from the slice.** Not deferred within session one — removed. Frames return, if ever, as a backlog layer behind the production point.
6. **Tutorial = the settlement bootstrap.** Prologue (three lines) → foreman posts family needs → player chooses which family to hunt first (CM/SA/RC order is their call) → gradient hunt + sampling with the Decision 019 stat-reveal wow beat intact → turn-ins bring production online → the player assembles the first thumper themselves through the full crafting flow, slotting components (including the settlement's worn drill head and a scavenged hull) into the chassis. The first craft is the thumper. **Turn-ins require a single stack**: e.g. 30 units of *one* Structural Alloy resource, any quality — mixing resources within a family is rejected, and the board says so explicitly. This teaches the SWG rule the whole economy runs on (a crafting slot consumes one homogeneous stack) and forces the within-family commitment decision at minute two.
7. **The first run fails on purpose; the second run pays.** The scavenged hull is at ~5% integrity. First deploy lands on the player's best-sampled waypoint and is watched live; partway in, the hull gives out and the **fail-safe auto-recall fires on screen** — explained immediately as the rig protecting itself, with partial yield kept and carried home. This is the live demonstration of element 9 and of why hull quality matters. The foreman patches the hull to ~30% ("you can craft better ones — more durability, longer runs") and the second watched run (~5 min, two scripted event windows: Signal Drift, Pump Strain) completes on the same waypoint with a full in-session claim. Run durations then ramp across day one (~5 → 15 → 20+ min, tuned by simulation) before hour-scale runs appear; the async wait is introduced only after the reward beat has been felt twice. Framing constraint: the recall must read as the system working ("RIG SECURED — fail-safe nominal"), never as player error, and the partial yield must clear a felt-reward floor.
8. **Known-spot redeploy.** A pilot's sampled spots are persistent waypoints (already per-pilot in `pilot_deposit_spot_samples`; capacity already in `deposit_spot_yields`). A known spot can be redeployed on without resurveying until it is exhausted **or its resource instance expires** (Decision 020 lifespan) — expiry kills the waypoint, preserving stockpiling pressure.
9. **No thumper destruction.** Hull at 0% triggers a fail-safe auto-recall: the run ends early, partial yield is kept, the rig returns with a repair debt. Hull quality governs run duration and risk appetite; components wear, the chassis never dies. Destruction may return only as opt-in stakes (overdriven push runs) in a future layer.
10. **UI/UX direction.** No dropdown menus anywhere in the slice. Diegetic terminal/console aesthetic — every screen is the settlement's field console. One primary field screen carries scan/move/sample/deploy/guard; crafting shows physical component slots; every screen states its next action explicitly. ASCII art where it carries meaning (the field map, the rig), never as decoration.

### Scope statement (supersedes Decision 015's freeze)

The slice is: settlement ledger, sampling minigame, tutorial bootstrap, one watched run, ramped async runs, known-spot redeploy, and the UI rewrite that carries them. Nothing else enters until external testers complete the new funnel voluntarily. The Stage 6 fun/not-fun evidence (Decision 013) is unchanged in kind; the funnel events are redefined in the slice spec.

### Simulation results (2026-06-12 — scripts in `design-docs/`, full detail in slice spec §8)

- **Ratio sim:** sample yield 5u × concentration, pool 4–5/spot, turn-in stack 20u → sampler holds at **4.2–8.1%** of thumper units/hour (6.5% Keth-PEAK); Repair Kit pinch-affordable (1.3 days), Hull Plate thumper-bound (2.7 days). Tutorial stack anchored to bulk concentrations (Keth/Slag), Veyrith stays the prize. *Ratio band updated 2026-06-13.*
- **Run-ramp sim:** `max_run_minutes = TIER_BASE × (integrity/100)^1.2` — 5% scavenged ≈ 2 min and 30% patched ≈ 7 min fall out of the formula, crafted tiers reach 3–11 h. Duration picker: 15 min / 1 h / 4 h (20-min tier cut as a non-choice). **One-time first-async exception (locked with slice spec §7):** after `async_duration_chosen`, the first non-tutorial 15 min deploy on scavenged/patched hull may exceed the formula ceiling in the picker and waives hull-out fail-safe for that run only (`first_async_deploy_used` state); all later deploys obey the formula. Short-run spam = 1.9× active premium with natural 3-min redeploy friction — accepted, no cooldown; per-run wear floor is the reserve knob.
- **Energy sim:** trickle+cap beats daily reset decisively (reset strands spaced visitors at 33–50% coverage). Trickle rate **locked at 0.5/hr, cap 10** (Ryan, 2026-06-12, on recommendation): preserves the anti-substitution guard (Hull Plate stays ~2 days of pure sampling); later check-ins are for tending thumpers, claims, and turn-ins rather than sampling. Existing `surveyEnergyOutlook` regen (~10 samples/hr) must come down ~20× to match.

---

### Playtest fix copy amendments (2026-06-12 field test)

- **Prologue (render-only):** `PROLOGUE_LINES` stay verbatim in `apps/web/src/lib/copy/prologue.ts`; the takeover modal joins lines with a single space in a normal `<p>` instead of `\n` in `<pre>`, so the panel does not hard-break mid-sentence.
- **Tutorial fail-safe claim banner (D5):** player-facing wording drops dev jargon `(scripted floor — never empty-handed)` in favor of `— the fail-safe never comes home empty-handed.` (`packages/domain/src/tutorial/tutorialClaimCopy.ts`; slice spec §6 beat unchanged in meaning).

### Open harness debt (2026-06-12)

`pnpm --filter @async-frontier-mmo/db db:smoke` still fails on the unchanged first-session path: it resolves a run with zero event-window responses and hits **"First-session run expects exactly two event window responses."** Track as smoke-harness debt — rewrite the smoke script against the slice Phase 7 tutorial state machine, not a blocker for WORKSHOP (Phase 5).

### First-loop tightening (2026-06-13 — `docs/first-loop-tightening-plan-2026-06-13.md`)

**Locked with Ryan (D2):** post-tutorial `next_need` orders are **12u Reactive Crystal + 18u Conductive Metal** (`NEXT_NEED_ORDER_RC_STACK` / `NEXT_NEED_ORDER_CM_STACK` in `packages/domain/src/tuning.ts`) — SA from Keth thumps flows untaxed to the 100-SA hull bill.

**Decision 023 candidate — event bet-sizing + craft experimentation (sim-locked, implemented 2026-06-13):**

- **Event windows** (`event_choice_liveness_sim.py` Candidate A): hold penalties **4–8u minor / 12–22u serious**, meter-coupled at resolution; matching-action wear **9 Condition**; tutorial runs keep fixed mid-rolls.
- **Craft experimentation** (`experimentation_sim.py`, crit_od=0.25): **2 pulses** per craft; Careful +1 / Standard +2 / Overdrive +3 bands; Overdrive crit scraps largest socket (60u on Reinforced Hull Plate).

Other slice fixes in the same pass: free samples do not bind foreman orders (paid samples do); fail-safe countdown + deploy `secures at ~m:ss` preview; workshop defaults to chassis/hull plate by tutorial step; FIELD hull-bill ticker on `next_need`.

### Round-4 playtest fixes (2026-06-13 — `docs/round4-playtest-fixes-2026-06-13.md`)

**Hull path sim gate:** `design-docs/first_hull_path_sim.py` confirms D2 quantities (`RC=12` / `CM=18`) do not strand the hull; pt-15 dead-end was hand-sampling vs thumping, not order size.

**Locked UI/flow fixes:**

- `formatMmSs` + `hullDeployWarningLine` floor fractional seconds (no float clocks).
- Nav highlight uses `resolveNextActionScreen` — order-ready and claim-pending overlays on top of tutorial step.
- Workshop **Thumper / Fabricator** station picker; no auto-select of locked Survey Scanner at `first_deploy`.
- FIELD rig view: `▓` meter dashboard (signal, pump, hull condition/integrity, drill/pump condition, threat); ASCII footer trimmed to `HULL nn%`.
- Tutorial-only `[RECOMMENDED]` tags on hand-fillable order resources (not Veyrith); sampling-vs-thumping mode line on FIELD.
- Mission ticker uses `pickPinnedMissionOrder` (RC before CM on `next_need`) — decoupled from binding progress / async-tail transitions.
- Overdrive scrap debited from largest socket stack in craft persistence + ledger.

---

## Current next decision candidates

Decisions 001–022 are locked (022 locked 2026-06-12 per Ryan, balance constants sim-verified same day). **Decision 023 candidate** logged above (event + experimentation sims, 2026-06-13). Remaining:

1. **Re-test with 3–5 external testers** on the slice spec §9 funnel (build + review pass complete 2026-06-12; energy-budget amendment: first sample of a resource is energy-free, SA tutorial stack 20→15 — see tutorialEnergyBudget.test.ts; tutorial-graduation refill: survey energy tops to full cap once on the async_reveal→done transition — restores the energy sim's start-at-cap steady-state assumption without touching the locked cap/regen).
2. **Decision 023 candidate — the Reclaimer (SWG recycler).** Stranded stacks of expired resources convert, lossy (~2:1), into family-generic "Reclaimed" units with fixed floor stats, usable in any family slot. Unlocks at the first bloom rotation — stranding cannot occur before a rotation, so it stays out of the tutorial and never competes with the single-stack lesson. Decide after external round 2.
3. **Post-MVP Layer Gate**, including the combat-socket question above, thumper slot tiers, and the timed rotation scheduler.
4. **Scope-change review** per the Decision 022 scope statement.
---
