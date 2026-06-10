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

`PLAYER_FACING_ROADMAP.md` is no longer treated as a player-facing promise document. It becomes an internal layered feature backlog/test bed. In this reviewed package, the legacy alias is preserved as `legacy/PLAYER_FACING_ROADMAP_LEGACY_ALIAS.md`.

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


## Decision 015 — MVP Definition of Done and Scope Freeze

**Status:** Locked.

Decisions 001–014 define the MVP content. Decision 015 freezes that scope and defines what counts as MVP completion.

The MVP is not everything the game may become. The MVP is complete when a tiny prototype proves that the core toy is understandable, repeatable, auditable, and worth expanding.

### MVP completion checklist

The MVP is complete only when all of the following are true:

1. **Playable loop complete.** A player can choose a frame, survey Red Mesa, compare named resources, deploy a personal thumper, resolve event windows, claim a named resource, craft through named-resource slots + property preview + 3 tuning points, equip or repair, and run a clearer second survey.
2. **Locked content exists.** The prototype includes the locked Red Mesa region, 3 frames, 3 resource families, 6 named resources, 5 stats, 3 thumper component slots, 4 event actions, 4 complication types, 5 recipes, and 6 primary screens.
3. **Crafting proves actual thinking.** The player can see resource stats → schematic weights → output property preview → 3 tuning points → Safe Craft / Careful Experiment → result explanation.
4. **Resource primacy holds.** Resource quality/stat fit remains the primary power source and practical ceiling; tuning expresses and prioritizes that potential but does not upgrade, mutate, or launder the underlying named resource.
5. **Economy is auditable.** Every resource grant/consume, crafted item, thumper result, condition/integrity change, and repair action can be explained after the fact through the Decision 012 records and economy ledger.
6. **Playtest evidence exists.** The prototype produces Decision 013 evidence for first-session funnel, resource/crafting comprehension, voluntary repeat behavior, event-action comprehension, durability/repair trust, economy-ledger correctness, and friction/confusion points.
7. **Prototype ladder has been followed.** The project progresses through the Decision 014 ladder before broader MMO implementation: paper/spreadsheet economy prototype → text-only loop → clickable single-player vertical slice → instrumented playtest → presentation pass → production-point review.

The strongest MVP success signal is:

```text
The player crafts Survey Scanner Module Mk I,
sees the second survey improve,
and wants to continue planning the next survey/thumper/craft loop.
```

### Scope-freeze rule

New ideas do not enter MVP scope unless they meet at least one of these criteria:

1. They fix a contradiction in a locked decision.
2. They unblock the Decision 014 prototype ladder.
3. They improve comprehension of the locked toy.
4. They protect resource/crafting/economy trust.
5. They are required for Decision 013 playtest evidence.

Otherwise, new ideas go to `LAYERED_FEATURE_BACKLOG.md`.

### MVP exclusions remain locked

The following remain outside MVP scope:

- marketplace;
- player-to-player trade;
- chat;
- guilds;
- settlements;
- public helper boards;
- group thumpers;
- contracts;
- multiple regions;
- advanced refining;
- Chemical Purity;
- separators;
- factories;
- batch crafting;
- weapons;
- armor suits;
- PvP;
- realtime combat;
- monetization;
- mobile app wrapper;
- broad MMO infrastructure;
- large content pipeline.

### Final MVP state

The MVP is now defined. The next work is implementation through the prototype ladder, not further design expansion.

---

## Current next decision candidates

No further MVP design decision is required before implementation begins.

Optional later decisions, only when triggered by prototype evidence:

1. **MVP Presentation Slice Detail, if Stage 5 needs it.** Tighten art/audio/menu requirements only after the text/clickable loop has proven understandable.
2. **Post-MVP Layer Gate.** Decide the evidence required before adding public helper boards, group thumpers, marketplace, refining, contracts, more regions, or broader MMO systems.
3. **Scope-change review.** Reopen MVP scope only if a new issue fixes a contradiction, unblocks the prototype ladder, improves comprehension, protects economy trust, or is required for playtest evidence.
