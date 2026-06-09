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

If this toy is not fun with one zone, three resources, one frame, and a few recipes, adding planets, guilds, cities, PvP, story, or monetization will not save it.

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
Red Mesa is experiencing a short-lived Veyrith Copper bloom.
Players survey the zone, find deposits, deploy basic thumpers, manage small complications, craft better survey/thumper modules, and repeat until the resource bloom expires.
```

### 6.2 Included content

Keep this extremely small:

- 1 planet/frontier world: placeholder name TBD
- 1 zone: **Red Mesa**
- 3 frames: Recon, Engineer, Vanguard
- 3 resource families:
  - Conductive Metal
  - Structural Alloy
  - Reactive Crystal
- 6 named resource instances:
  - 2 common
  - 2 uncommon
  - 1 high-quality exciting resource
  - 1 awkward resource with one great stat and one bad stat
- 5 resource stats:
  - Overall Quality
  - Conductivity
  - Hardness
  - Heat Resistance
  - Malleability
- 1 survey tool
- 1 basic personal thumper
- 3 thumper components:
  - Drill
  - Pump
  - Hull
- 5 craftable items:
  - Basic Drill Head
  - Efficient Pump
  - Reinforced Hull Plate
  - Recon Sensor Module
  - Field Repair Kit / Repair Module
- 1 durability/condition system
- 1 lightweight event complication table

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
- mobile wrapper

---

## 7. Minute-to-minute / session loop

A 5–10 minute test session should look like:

```text
1. Choose frame.
2. Survey Red Mesa.
3. See 2–3 possible signals.
4. Pick a signal based on concentration, quality hints, and threat.
5. Deploy personal thumper.
6. Spend 2–4 event actions while it runs.
7. Resolve output: resource gained, thumper condition changed, maybe salvage gained.
8. Craft or repair one useful module.
9. Equip module.
10. Repeat and notice that the next run is different/better/riskier.
```

### Example run

```text
Ryan chooses Recon.
Survey finds:
- 64% Keth Iron, low threat
- 82% Veyrith Copper, medium threat, high Conductivity hint

Ryan deploys a basic thumper on Veyrith Copper.
Event complication: pump strain.
Recon uses Signal Tune to reduce resource contamination.
Thumper returns 118 Veyrith Copper with high Conductivity.
Ryan crafts a Recon Sensor Module.
Next survey shows clearer stat hints and deeper signal range.
Sensor loses 3 durability after use.
```

That is enough to test whether the toy works.

---

## 8. Tuning variables for the vertical slice

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

## 9. Success criteria before adding a second loop

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

## 10. Production point checklist

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
- Inventory/economy ledger is reliable.
- Thumper events resolve predictably and can be audited.
- Data is tunable without code rewrites.

### Presentation

- Pixel/menu art direction is good enough to communicate the fantasy.
- UI is readable.
- Event feedback is satisfying enough for a text-first game.

If these are not true, stay in pre-production.

---

## 11. Layering plan after the first loop works

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

## 12. Recommendation

The MVP should not be “Farm RPG plus Firefall plus SWG.”

The MVP should be:

> A tiny playable extraction-crafting toy where frame choice, resource quality, thumper risk, crafting output, and item wear all connect in one repeatable loop.

If that is fun, the game has a spine. If it is not fun, no amount of MMO content will fix it.
