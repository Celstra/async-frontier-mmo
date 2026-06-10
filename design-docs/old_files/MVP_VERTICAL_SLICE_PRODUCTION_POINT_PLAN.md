# MVP Vertical Slice + Production Point Plan

> Purpose: Define the first small, repeatable vertical-slice loop for the async frontier MMO concept before adding more loops. This plan applies the `production-point.md` discipline: stay in pre-production until the core toy is proven, the major uncertainties are answered, and the project can switch from exploration to content production.

---

## 1. Current question

Ryan asked:

- SWG had a risk: combat-focused players disliked that only crafted items were the best. Do we need to consider that here?
- Why have different player frames if only crafted gear matters?
- What does the MVP look like, based on the Production Point approach?
- What is the first vertical-slice gameplay loop we can tune until it is repeatable and fun before adding another loop?
- How do we move slowly, layer fun step by step, reach the production point, and only then switch gears to content?

---

## 2. Production Point interpretation for this project

The project is not ready for production just because the fantasy has potential.

Per the Production Point framing, the dangerous trap is committing at the **potential point**: the moment when the idea sounds exciting but the major uncertainties are still unresolved.

For this project, the production point is reached only after a small playable slice proves:

1. The core toy is fun with tiny content.
2. The loop can repeat without feeling like chores.
3. The UI makes resource quality and crafting outcomes understandable.
4. The pixel/menu presentation sells the fantasy.
5. The system can be tuned with data rather than guesses.
6. The scope is known enough that adding content is mostly production work, not constant redesign.

Until then, we are in **pre-production**.

---

## 2A. Locked decisions summary

Decisions 001–015 now lock the MVP to:

- 1 Red Mesa region.
- 3 frames: Recon, Engineer, Vanguard.
- 3 resource families and 5 MVP stats using a 1–1000 internal stat scale.
- 6 named resources in the first Red Mesa Bloom with exact prototype stats locked by Decision 010.
- 3 thumper components: Drill, Pump, Hull.
- 4 event actions and 4 complication types.
- 5 craftable outputs.
- A thinking-craft flow with named-resource slot choice, property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, and a result explanation. Resource stats set the base/ceiling; tuning only allocates and risks that potential.
- No mandatory refining step in the MVP.
- Six UI screens and one required first click-path.
- Decision 011 first-session path: frame choice → three-signal survey → recommended Veyrith Copper thump → Signal Drift + Pump Strain → claim enough Veyrith Copper → craft Survey Scanner Module Mk I → equip → see a clearer second survey.
- 0–100 crafted property scores, transparent recipe weights, 5% relative tuning per point, and bounded Careful Experiment variance.
- A server-authoritative MVP data/economy ledger with explicit records for resources, stacks, crafted item provenance, crafting attempts, thumper runs, event windows, run results, repair actions, and economy mutations.
- Decision 013 success metrics/playtest instrumentation: first-session funnel, resource/crafting comprehension, voluntary repeat behavior, event-action comprehension, durability/repair trust, economy-ledger correctness, and friction/confusion notes.
- Decision 014 prototype ladder: paper/spreadsheet economy prototype → text-only loop prototype → clickable single-player vertical slice → instrumented playtest build → presentation pass → production-point review.
- Decision 015 final scope freeze: Decisions 001–014 define the MVP content; Decision 015 freezes scope and sends new ideas to backlog unless they fix contradictions, unblock the prototype ladder, improve comprehension, protect economy trust, or are required for playtest evidence.

Future direction if the toy is fun: preserve the long-term SWG-inspired loop of finding the right named resource with the right stats before it disappears, then using it intelligently in schematics. Tuning must never erase the market value of rare named resources. Refining, Chemical Purity, separators, resource archives, markets, factories, and group thumpers are later layers, not MVP requirements.

---

### Decision 007 clarification — resource quality sets the ceiling

Crafting tuning is an expression/allocation layer, not a resource-upgrading layer.

```text
Resource stats set the potential and ceiling.
Tuning chooses where that potential goes.
Experimentation tests how cleanly the craft reaches that potential.
```

A high-Conductivity resource such as Veyrith Copper should remain economically valuable because it naturally enables stronger Conductivity-driven outcomes. A low-Conductivity resource can be tuned toward a Conductivity property, but it cannot become equivalent to Veyrith Copper. This preserves stockpiling, market value, provenance, and the future SWG-inspired loop of finding the right named resource before it disappears.

---

## 3. The core toy

The core toy should not be “an MMO.” It should be this:

```text
Find a promising resource signal
  -> choose how to extract it
  -> survive/manage the thumper event
  -> turn the resource into a better tool/module
  -> use that better tool/module to find or extract better resources
  -> item wear creates a reason to repeat
```

Short form:

> Survey → thump → craft → equip/use → decay → survey better.

If this toy is not fun with one zone, six named resources, three frames, and five recipes, adding planets, guilds, cities, PvP, story, or monetization will not save it.

---

## 4. Crafted-best vs combat-player problem

### 4.1 The SWG risk

The SWG risk is real: if the best functional items are always crafted, combat-focused players can feel like their playstyle is merely feeding crafters or buying from them. They may miss the classic adventure reward pattern:

- kill something dangerous
- find something exciting
- equip it
- feel stronger or cooler

A pure crafted-only economy can make combat feel unrewarding if enemies only drop generic crafting inputs.

### 4.2 Recommended solution

Do **not** make this a binary choice between “crafted gear matters” and “combat loot matters.”

Use this split:

```text
Best reliable functional performance = crafted
Best discovery/trophy/exotic unlocks = exploration/combat/events
Best long-term identity = frame + crafted loadout + provenance
```

This preserves the SWG economy while giving combat/exploration players rewards that feel exciting.

### 4.3 What combat/events should reward

Combat or event participation should produce rewards that do not destroy the crafting economy:

- rare salvage
- trophy components
- cosmetic skins
- frame decals/colors
- blueprint fragments
- special affixes/mod patterns
- enemy research data
- faction reputation
- titles/badges
- unstable prototype parts that must be finished by crafters
- temporary boosters/consumables

The key is that combat can find the **spark**, but crafting turns it into the **reliable tool**.

Example:

```text
A swarm queen event drops “Chitinous Harmonic Plate.”
It is not a finished best-in-slot hull.
A crafter uses it with high-Hardness alloy to craft a quiet anti-swarm hull plate.
The combat player feels rewarded; the crafter/economy still matters.
```

---

## 5. Why frames matter if gear is crafted

Frames should not be simple stat sticks. They should define **verbs**, **efficiencies**, and **constraints**.

A frame answers:

- What actions are you naturally good at during a thumper event?
- Which event problems can you solve cheaply?
- What gear/modules do you want?
- Which resources are valuable to you?
- What role do other players expect you to fill?

### 5.1 Frame design rule

Frames provide base identity and action modifiers. Crafted modules tune, specialize, and temporarily push that identity.

```text
Frame = durable role / verb package
Crafted modules = economic expression / tuning / optimization
Loot/event rewards = unlocks, trophies, cosmetics, rare ingredients
```

This prevents crafted gear from making frames irrelevant.

### 5.2 MVP frame set

For the first vertical slice, use **three frames**. Do not add more until these are meaningfully different.

| Frame | Fantasy | Core thumper event verbs | Resource/crafting demand |
|---|---|---|---|
| Surveyor / Recon Frame | Finds and reads the frontier | Scan, mark weak signal, predict threats, improve survey accuracy | Sensors, signal boosters, lightweight electronics |
| Engineer / Rig Frame | Keeps machinery alive | Repair hull, tune pump, stabilize drill, reduce waste | Toolkits, repair drones, pump parts, stabilizers |
| Defender / Vanguard Frame | Handles danger | Suppress swarm, guard perimeter, reduce thumper damage | Armor plates, field batteries, weapon components |

Important: in the MVP, these can be mechanically simple. They do not need deep combat.

### 5.3 MVP frame differences

Each frame gets one passive and one event action.

#### Recon

- Passive: +survey clarity / sees one extra resource clue.
- Event action: **Signal Tune** — improves resource integrity or lowers surprise-complication chance.

#### Engineer

- Passive: repairs are more efficient / reduced thumper wear.
- Event action: **Field Repair** — restores hull or clears pump instability.

#### Vanguard

- Passive: reduces threat damage to thumper.
- Event action: **Suppress Threat** — lowers current threat or prevents the next damage tick.

These verbs matter even if all modules are crafted.

---

## 6. First vertical slice: one repeatable loop

The first vertical slice should be a tiny layer cake: gameplay, UI, art style, theme, and feedback all present, but with very little content.

### 6.1 Slice premise

```text
Red Mesa is experiencing the first seeded **Red Mesa Bloom**.
Players survey the zone, compare named resource signals, deploy basic thumpers, manage small complications, craft better survey/thumper modules through a small optimization puzzle, and repeat until the resource bloom expires.
```

### 6.2 Included content

Keep this extremely small and aligned to Decisions 001–011:

- 1 planet/frontier world: placeholder name TBD.
- 1 zone: **Red Mesa**.
- 3 frames: **Recon**, **Engineer**, **Vanguard**.
- 3 resource families:
  - **Conductive Metal**.
  - **Structural Alloy**.
  - **Reactive Crystal**.
- 6 named resources in the first **Red Mesa Bloom**:
  - **Keth Iron**.
  - **Red Mesa Conductive Slag**.
  - **Asterion Frame Alloy**.
  - **Pale Ember Crystal**.
  - **Veyrith Copper**.
  - **Thornwake Crystal**.
- 5 resource stats:
  - **Overall Quality / OQ**.
  - **Conductivity**.
  - **Hardness**.
  - **Heat Resistance**.
  - **Malleability**.
- 1 survey tool/action.
- 1 basic personal thumper.
- 3 thumper component slots:
  - **Drill**.
  - **Pump**.
  - **Hull**.
- 4 thumper event actions:
  - **Signal Tune**.
  - **Field Repair**.
  - **Suppress Threat**.
  - **Clear Pump Problem**.
- 2 thumper event windows by default; high-risk/push runs can have up to 3.
- 5 craftable items:
  - **Basic Drill Head**.
  - **Efficient Pump**.
  - **Reinforced Hull Plate**.
  - **Survey Scanner Module Mk I**.
  - **Field Repair Kit**.
- MVP crafting interaction:
  - choose schematic;
  - fill named-resource slots;
  - preview weighted item properties;
  - spend exactly **3 tuning points**;
  - choose **Safe Craft** or **Careful Experiment**;
  - craft;
  - read the result explanation.
  - resource stats set the base and effective ceiling/range;
  - tuning points allocate emphasis between property lines, not input-resource quality;
  - crafted properties display as 0–100 scores;
  - tuning points give +5% relative expression per point.
- 1 durability/condition/integrity system.
- 1 lightweight event complication table:
  - **Signal Drift** → Signal Tune.
  - **Hull Damage** → Field Repair.
  - **Threat Surge** → Suppress Threat.
  - **Pump Strain** → Clear Pump Problem.
- 6 MVP screens:
  - **Pilot Home**.
  - **Red Mesa Survey**.
  - **Signal Detail / Deploy Thumper**.
  - **Thumper Run / Event Window**.
  - **Claim Results**.
  - **Crafting + Gear / Repair**.

### 6.3 Not included

Do not include yet:

- multiple planets
- cities
- guilds
- chat/social moderation
- player marketplace
- monetization
- PvP
- deep combat builds
- public combat distress board / live helper matchmaking
- full group thumpers
- long crafting tree
- dozens of stats
- mandatory refining step
- refining station UI
- factory/batch crafting
- mobile wrapper


### 6.4 Future resource/crafting direction if the toy is fun

The long-term SWG-inspired resource/crafting loop should remain:

> Find the right named resource with the right stats before it disappears, then use it intelligently in schematics.

Future iterations can add irregular multi-day resource lifespans, historical scarcity, provenance, resource archives, tradeable survey intel, separators, refiners, byproducts, contamination, Chemical Purity, factory/batch crafting, and player brands — but only if they strengthen the core toy rather than adding mandatory chores.

---

## 7. Minute-to-minute / session loop

A 5–10 minute test session should look like:

```text
1. Choose frame.
2. Survey Red Mesa.
3. See 2–3 possible signals.
4. Pick a signal based on concentration, quality hints, and threat.
5. Deploy personal thumper.
6. Resolve 2 event windows by default, or up to 3 in a high-risk/push run.
7. Resolve output: resource gained, thumper condition changed, maybe salvage gained.
8. Choose a schematic, fill named-resource slots, preview properties, spend 3 tuning points, then Safe Craft or Careful Experiment.
9. Equip the new item or apply a Field Repair Kit.
10. Repeat and notice that the next run is different/better/riskier.
```

### Example run

```text
Ryan chooses Recon.
Survey finds:
- 64% Keth Iron, low threat
- 82% Veyrith Copper, medium threat, high Conductivity hint

Ryan deploys a basic thumper on Veyrith Copper.
Event window 1: Pump Strain. Ryan holds because Pump Flow is still acceptable.
Event window 2: Signal Drift. Recon uses Signal Tune to preserve Signal Lock.
Thumper returns 118 Veyrith Copper with high Conductivity.
Ryan chooses the Survey Scanner Module Mk I schematic, fills the Conductive Metal slot with Veyrith Copper, previews Survey Clarity / Stat Hint Accuracy / Signal Range, spends 3 tuning points, and chooses Safe Craft. Veyrith Copper's Conductivity is the primary quality source; the tuning points decide which scanner property receives that available quality.
Next survey shows clearer stat hints and deeper signal range.
The scanner loses 3 Condition after meaningful use.
```

That is enough to test whether the toy works.

---

## 8. Locked MVP crafting interaction

MVP crafting is not a drag/drop/click conversion. Each of the five locked recipes uses the same thinking-craft flow:

```text
Choose schematic
→ fill resource-family slots with named resources
→ preview weighted output properties
→ spend exactly 3 tuning points
→ choose Safe Craft or Careful Experiment
→ produce the item
→ show why the result happened
```

**Safe Craft** is predictable, has no flaw chance, and has a lower ceiling.

**Careful Experiment** has modest upside, a small flaw chance, and no catastrophic loss in the MVP.

The MVP has no mandatory refining step. Extracted named resources can go directly into schematics. Refining is deferred until it can create meaningful choices instead of a waiting-bar tax.

### Resource primacy inside MVP crafting

Decision 009 locks the relationship between resources and tuning:

- Resource quality/stat fit is the primary power source and practical ceiling.
- Tuning allocation decides which property lines receive the crafter's effort.
- Safe Craft / Careful Experiment creates bounded item-result variance inside that potential.
- Tuning never mutates the named resource stack and never turns poor resources into rare-resource equivalents.

Example: Veyrith Copper's very high Conductivity should make it genuinely better for Conductivity-weighted Survey Scanner and Pump properties. Tuning points can express that advantage, but the same tuning points on low-Conductivity material should not produce an equivalent item.

---

## 9. Decision 008 — Locked MVP UI proof and first click-path

The first playable prototype uses exactly six primary screens:

1. Pilot Home.
2. Red Mesa Survey.
3. Signal Detail / Deploy Thumper.
4. Thumper Run / Event Window.
5. Claim Results.
6. Crafting + Gear / Repair.

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

The Crafting + Gear / Repair screen must include schematic selection, named-resource slot picking, property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, result explanation, and equip/repair actions.

---

## 10. Decision 009 — Resource Primacy and Tuning Guardrail

The MVP must teach that resource choice matters before tuning. Named resources have fixed stats and market identity. Tuning points do not change those stats; they allocate craft effort across item property lines.

Locked interpretation:

```text
Resource quality/stat fit = primary power source and ceiling
Tuning allocation         = property priority and expression
Craft/experiment result   = bounded variance within that potential
```

This protects the future loop where players discover, stockpile, trade, and spend historically scarce resources intelligently.

---

## 11. Decision 010 — MVP Stat Scale, Recipe Weights, and Output Ranges

Decision 010 locks the numeric model for the first prototype.

### Scale

```text
Resource stat scale:       1–1000
Crafted property display:  0–100
MVP tuning points:         exactly 3
Tuning effect:             +5% relative expression per point
```

Tuning does not mutate resources and does not add flat quality. It only expresses the potential created by the named resources and the schematic weights.

### Core formula

```text
base_property_score  = weighted_resource_stat_total / 10
tuned_property_score = base_property_score × (1 + 0.05 × tuning_points_on_property)
final_property_score = capped at 100
```

### First Red Mesa Bloom prototype stats

| Resource | Family | OQ | Conductivity | Hardness | Heat Resistance | Malleability |
|---|---|---:|---:|---:|---:|---:|
| **Keth Iron** | Structural Alloy | 520 | 220 | 650 | 480 | 560 |
| **Red Mesa Conductive Slag** | Conductive Metal | 340 | 610 | 310 | 720 | 390 |
| **Asterion Frame Alloy** | Structural Alloy | 690 | 260 | 850 | 610 | 760 |
| **Pale Ember Crystal** | Reactive Crystal | 680 | 520 | 360 | 880 | 470 |
| **Veyrith Copper** | Conductive Metal | 820 | 930 | 260 | 540 | 620 |
| **Thornwake Crystal** | Reactive Crystal | 590 | 910 | 420 | 210 | 160 |

### Craft modes

- **Safe Craft:** no flaw chance; final score equals tuned property score.
- **Careful Experiment:** 75% chance +3% to tuned property score, 20% no change, 5% minor flaw on the crafted item only.

No catastrophic craft failure, no item deletion, and no resource mutation in the MVP.

### Recipe weights

The Design Bible and Decision Log are canonical for the full per-recipe weight tables. The MVP plan uses those tables as prototype balance data.

---

## 12. Decision 011 — MVP Onboarding and First-Session Script

Decision 011 locks the exact first-session path. The goal is to carry a new player through the full toy once without hiding the real systems.

### First-session learning goals

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

### Locked first-session sequence

1. **Frame choice:** choose Recon, Engineer, or Vanguard. Describe frames as verbs:
   - Recon: better at reading signals.
   - Engineer: better at keeping machinery alive.
   - Vanguard: better at suppressing threat.
2. **Starter kit:** Basic Scanner Mk 0, Basic Personal Thumper, Worn Basic Drill, Worn Basic Pump, Worn Basic Hull, plus a small starter stockpile of Keth Iron and Pale Ember Crystal.
3. **First survey:** show exactly three Red Mesa signals: Keth Iron, Veyrith Copper, and Thornwake Crystal.
4. **First recommended target:** recommend Veyrith Copper, but do not force it.
5. **First thumper run:** 2 event windows, no high-risk push option, no surprise failure, no thumper deletion, and no Integrity damage.
6. **First event windows:** Signal Drift, then Pump Strain.
7. **First claim result:** guarantee enough Veyrith Copper to craft one Survey Scanner Module Mk I. Show small component wear and a readable result explanation.
8. **First guaranteed craft:** Survey Scanner Module Mk I.
9. **First tuning default:** 2 points Survey Clarity, 1 point Stat Hint Accuracy, 0 points Signal Range. The player may change it.
10. **First endpoint:** equip the scanner, return to Red Mesa Survey, and see clearer information.

### Why the first craft is Survey Scanner Module Mk I

The first craft should not be Basic Drill Head. Survey Scanner Module Mk I closes the loop faster:

```text
find high-Conductivity Veyrith Copper
→ use it in the Conductive Core slot
→ tune Survey Clarity / Stat Hint Accuracy
→ craft and equip the scanner
→ survey again with clearer information
```

This proves the core promise in one session: **a good named-resource find can become a crafted tool that improves the next decision.**

### Exclusions

The first-session onboarding excludes:

- long story intro;
- NPC dialogue tree;
- marketplace;
- group helper prompt;
- refining tutorial;
- repair-kit tutorial before Hull Damage is introduced;
- factory/batch crafting tutorial;
- full map tutorial;
- combat tutorial;
- permanent talent/build choices before the player understands the toy.

---

## 13. Decision 012 — MVP Data Model / Economy Ledger

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


## 14. Tuning variables for the vertical slice

The MVP should expose a small number of tuning knobs:

### Survey tuning

- number of signals shown
- concentration spread
- stat hint accuracy
- cost per survey
- chance to reveal threat type

### Thumper tuning

- extraction duration
- output amount
- recovery efficiency
- hull damage per threat tick
- complication chance
- early recall penalty

### Crafting tuning

- resource stat weighting
- resource-derived property ceilings
- tuning-point contribution size
- Safe Craft vs Careful Experiment variance range
- recipe input costs
- output stat clarity
- durability range
- repair cost

### Frame tuning

- action strength
- action cooldown/cost
- passive bonus size
- when each frame feels useful

### Economy tuning

- resource spawn duration
- total expected output per player per day
- item durability loss rate
- craft/repair sink size

---

## 15. Success criteria before adding a second loop

Do not add another major loop until this one passes playtests.

The slice is promising if playtesters say or demonstrate:

1. “I want to survey one more time.”
2. “That resource is good for this recipe.”
3. “I understand why this crafted module is better.”
4. “I care that my module is wearing down, but I’m not angry about it.”
5. “I would choose a different frame for a different goal.”
6. “I can see why helping a thumper event later would be useful.”
7. “The pixel/menu presentation makes the world feel cooler than a spreadsheet.”

### Quantitative guardrails

Track:

- time to first successful survey
- time to first thumper claim
- time to first craft
- number of repeated loops in one session
- whether players compare resource stats without being prompted
- whether players can explain their frame choice
- confusion points in UI
- moments where players stop because they are bored vs waiting

---

## 16. Decision 013 — MVP Success Metrics and Playtest Instrumentation

The MVP must measure whether the core toy is understandable, repeatable, and fun before adding a second major loop.

Locked tracking categories:

1. First-session funnel.
2. Resource/crafting comprehension.
3. Voluntary repeat behavior.
4. Event-action comprehension.
5. Durability/repair trust.
6. Economy-ledger correctness.
7. Friction and confusion points.

### First-session funnel events

Track the locked first-session path:

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

A new tester should be able to reach the second survey without outside explanation.

### Comprehension questions

Ask after the session:

```text
Why was Veyrith Copper useful for Survey Scanner Module Mk I?
What did tuning change?
Did tuning change the resource itself?
Why was Thornwake Crystal tempting but risky?
```

Success means the tester can connect:

```text
resource stats → schematic weights → property preview → tuning expression
```

### Voluntary repeat behavior

The strongest early signal is not tutorial completion. It is whether the player sees the clearer second survey and chooses to continue.

Track whether the player voluntarily:

- starts a second survey;
- deploys a second thumper;
- crafts or plans a second item;
- checks what other resources are good for;
- asks when the bloom changes;
- wants to save or stockpile a named resource.

### Event, repair, and trust checks

Track whether the player understands at least one event consequence from the Claim Results screen, especially:

```text
Pump Strain → Pump Flow loss → lower recovered quantity / more waste
```

Track early wear without over-testing repair before Field Repair Kits matter:

- did the player notice Drill/Pump/Hull wear?
- did wear feel fair?
- did the player understand Condition?
- did the player understand that the first run had no Integrity damage?
- did the player trust that items would not be surprise-deleted?

### Ledger audit checks

Decision 013 validates Decision 012. Each test run should confirm:

- no negative resource stacks;
- no duplicate thumper claims;
- no duplicate craft outputs;
- consumed resources match crafted item provenance;
- item properties match schematic formula + tuning + craft mode;
- wear events match thumper run result;
- repair actions consume the correct kit;
- ledger entries match current inventory/item state.

### Success gates before another major loop

Before adding public helper boards, group thumpers, marketplace, refining, or broader MMO systems, the prototype should pass these qualitative gates:

- **Comprehension gate:** most testers can explain why Veyrith Copper helped the scanner craft.
- **Repeat gate:** a meaningful share of testers voluntarily start a second survey or second thumper run.
- **Crafting gate:** testers use or at least understand resource-slot choice, property preview, and 3 tuning points.
- **Event gate:** testers understand at least one event consequence from the Claim Results screen.
- **Trust gate:** testers do not feel item wear is surprise punishment.
- **Technical gate:** the ledger audit can explain every resource, craft, item, wear, and repair change.

No hard numeric retention or completion-time thresholds are locked yet. The first goal is qualitative proof of the toy.

## 17. Decision 014 — MVP Prototype Ladder and Build Order

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


## 18. Decision 015 — MVP Definition of Done and Scope Freeze

**Status:** Locked.

Decision 015 is the final MVP seal. Decisions 001–014 define the MVP content; Decision 015 freezes scope and defines completion.

### MVP Definition of Done

The MVP is complete when:

1. **The playable loop works end-to-end.** A player can choose a frame, survey Red Mesa, compare named resources, deploy a thumper, resolve event windows, claim a named resource, think-craft an item, equip or repair, and run a clearer second survey.
2. **The locked content set exists.** Red Mesa, Recon/Engineer/Vanguard, the six Red Mesa Bloom resources, five resource stats, Drill/Pump/Hull, four event actions, four complications, five recipes, and six screens are all present.
3. **Crafting proves actual thinking.** Resource stats, schematic weights, property preview, 3 tuning points, Safe Craft / Careful Experiment, and result explanation are visible enough for players to understand cause and effect.
4. **Resource primacy holds.** Tuning expresses the potential of selected named resources, but it never upgrades or mutates those resources.
5. **The economy is auditable.** The Decision 012 records can explain all resources, crafts, items, wear, repairs, and ledger mutations.
6. **The prototype produces evidence.** Decision 013 playtest categories are instrumented and reviewed.
7. **The prototype ladder is followed.** The project moves through Decision 014 before adding broader MMO systems.

The strongest success signal is:

```text
The player crafts Survey Scanner Module Mk I,
sees the second survey improve,
and wants to continue planning the next survey/thumper/craft loop.
```

### Scope-freeze rule

New ideas do not enter MVP scope unless they:

- fix a contradiction in a locked decision;
- unblock the prototype ladder;
- improve comprehension of the locked toy;
- protect resource/crafting/economy trust;
- are required for Decision 013 playtest evidence.

Otherwise, they go to the Layered Feature Backlog.

### MVP remains explicitly not included

Marketplace, player-to-player trade, chat, guilds, settlements, public helper boards, group thumpers, contracts, multiple regions, advanced refining, Chemical Purity, separators, factories, batch crafting, weapons, armor suits, PvP, realtime combat, monetization, mobile wrapper, broad MMO infrastructure, and a large content pipeline remain out of scope.

### Final MVP state

The MVP is defined. Next work is implementation through the prototype ladder, not further design expansion.

---

## 19. Production point checklist

The game reaches the production point only when the following are true:

### Core fun

- The survey → thump → craft → equip/use → decay loop is repeatable and fun with tiny content.
- Players repeat the loop voluntarily, not just because the test asks them to.
- At least one frame choice feels meaningfully different.

### Comprehension

- Players understand resource quality without reading a manual.
- Players understand why a crafted output is better/worse.
- Players understand decay/condition and do not feel blindsided.

### Scope

- The next content additions are obvious production work: more resources, recipes, zones, events, art, and UI polish.
- Major system design is not changing every session.
- The project has a clear content pipeline.

### Technical

- Server-authoritative actions work.
- Inventory/economy ledger is reliable and follows Decision 012 records.
- Thumper events resolve predictably and can be audited.
- Data is tunable without code rewrites.

### Presentation

- Pixel/menu art direction is good enough to communicate the fantasy.
- UI is readable.
- Event feedback is satisfying enough for a text-first game.

If these are not true, stay in pre-production.

---

## 20. Layering plan after the first loop works

Only after the first loop is proven:

### Layer 2: Public combat distress board

Add this before full group thumpers if the single-player thumper loop is fun and the Vanguard/combat verb needs a social home. The board should surface combat/threat events from active thumper runs to online players who want short, active play.

Guardrails:

- helpers can suppress, distract, defend, scout threats, fortify perimeter, or recover combat salvage;
- helpers cannot overdrive the drill, push deeper, spend the owner's repair kits, recall the thumper, abandon cargo, or make other owner equipment-risk decisions;
- the owner keeps the site/loadout/doctrine/repair/recall/extraction decisions;
- if nobody helps, the event resolves by owner doctrine instead of pausing or punishing absence;
- helper rewards lean toward combat salvage, trophy components, faction rep, badges, and small payouts, not duplicated rare node output.

### Layer 3: Group thumpers

- public thumper beacons / posted event contracts
- helper actions with explicit permissions
- contribution tracking
- owner reserve
- capped node yield with recovery-efficiency scaling

### Layer 4: Contracts / NPC requests

- daily faction needs
- delivery requests
- repair orders
- resource bounties

### Layer 5: Marketplace / player economy

- buy/sell resources
- crafter listings
- item provenance
- price history

### Layer 6: More world texture

- additional zones
- enemy factions
- rare event chains
- light story
- cosmetics/trophies

### Layer 7: Monetization discussion

Only after retention and trust exist.

---

## 21. Recommendation

The MVP should not be “Farm RPG plus Firefall plus SWG.”

The MVP should be:

> A tiny playable extraction-crafting toy where frame choice, resource quality, thumper risk, crafting output, and item wear all connect in one repeatable loop.

If that is fun, the game has a spine. If it is not fun, no amount of MMO content will fix it.


---

## 22. Current next decision candidates

No further MVP design decision is required before implementation begins.

Optional later decisions, only when triggered by prototype evidence:

1. **MVP Presentation Slice Detail, if Stage 5 needs it.** Tighten art/audio/menu requirements only after the text/clickable loop has proven understandable.
2. **Post-MVP Layer Gate.** Decide the evidence required before adding public helper boards, group thumpers, marketplace, refining, contracts, more regions, or broader MMO systems.
3. **Scope-change review.** Reopen MVP scope only if a proposed change fixes a contradiction, unblocks the prototype ladder, improves comprehension, protects economy trust, or is required for playtest evidence.
