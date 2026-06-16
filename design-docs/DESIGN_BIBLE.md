# Design Bible — Async Frontier MMO

> **Working premise:** Build a small, learnable, Farm RPG-style async MMO that starts with one or two satisfying loops and grows over time. The fantasy direction is Firefall-inspired sci-fi frontier extraction with pixel art, while the economy inspiration is Star Wars Galaxies Pre-CU's resource surveying, named resource qualities, harvesting, crafting, decay, and player-driven stockpiling.

This file is the project-owned design bible for the game concept. It is intentionally separate from `production-point.md`, which is a copyrighted game-development reference book used by the local docs MCP.

---

## Canonical Decision Log

The Design Bible is the canonical design source. Research files preserve rationale and alternatives, but locked decisions below override older candidate wording elsewhere in the repository.

- **Decision 001 — Canonical MVP Scope:** locked to 1 Red Mesa region, 5 MVP resource stats, 3 thumper component slots, 5 crafting recipes, thinking-craft, Condition + Integrity durability, and crafted repair kits.
- **Decision 002 — Roadmap Becomes Layered Backlog:** the old player-facing roadmap is now an internal layered backlog/test bed. Candidate features must strengthen the core toy before they graduate.
- **Decision 003 — Exact MVP Crafting Recipes:** locked to Basic Drill Head, Efficient Pump, Reinforced Hull Plate, Survey Scanner Module Mk I, and Field Repair Kit. Chemical Purity is deferred; Field Repair Kit uses temporary five-stat substitutions until repair depth is revisited after core-loop validation.
- **Decision 004 — Exact MVP Event Action List:** locked to four thumper event response actions: Signal Tune, Field Repair, Suppress Threat, and Clear Pump Problem. Recall Early is a universal safety/resolution choice, not a scarce event action.
- **Decision 005 — MVP Thumper Event Resolution Model:** locked to 2 event windows by default, up to 3 for high-risk/push runs, four complication types, fixed named-resource stats, bounded async resolution, and no surprise thumper deletion.
- **Decision 006 — MVP Resource Set and Rotation Cadence:** locked to the first six-resource Red Mesa Bloom and prototype-controlled rotation, with 7-day blooms for early external tests and irregular SWG-style rotations deferred.
- **Decision 007 — MVP Crafting Interaction Model:** locked to named-resource slot choice, weighted property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, no mandatory refining in the MVP, and the rule that resource quality sets the ceiling while tuning only allocates that potential.
- **Decision 008 — MVP UI Proof and First Click-Path:** locked to six primary screens and a first click-path that includes survey, thumper events, claim results, thinking-craft, equip/repair, and repeat.
- **Decision 009 — Resource Primacy and Tuning Guardrail:** locked to resource-first crafting. Named resource stats create the base value and practical ceiling; tuning expresses and prioritizes that value but never upgrades or mutates the underlying resource.
- **Decision 010 — MVP Stat Scale, Recipe Weights, and Output Ranges:** locked to a 1–1000 internal resource stat scale, 0–100 crafted property scores, prototype numeric stats for the first Red Mesa Bloom, transparent recipe weights, 3 tuning points as 5% relative boosts, Safe Craft, and bounded Careful Experiment.
- **Decision 011 — MVP Onboarding and First-Session Script:** locked to a guided first session that teaches the full toy once: choose frame, survey Red Mesa, target Veyrith Copper, resolve Signal Drift and Pump Strain, claim resources, craft Survey Scanner Module Mk I through thinking-craft, equip it, and see a clearer second survey.
- **Decision 012 — MVP Data Model / Economy Ledger:** locked to a server-authoritative, auditable MVP data model with Pilot, Resource Instance, Resource Stack, Item, Schematic Definition, Crafting Attempt, Thumper Run, Thumper Event Window, Thumper Run Result, Repair Action, and Economy Ledger records.
- **Decision 013 — MVP Success Metrics and Playtest Instrumentation:** locked to seven evidence categories: first-session funnel, resource/crafting comprehension, voluntary repeat behavior, event-action comprehension, durability/repair trust, economy-ledger correctness, and friction/confusion notes.
- **Decision 014 — MVP Prototype Ladder and Build Order:** locked to a build sequence of paper/spreadsheet economy prototype → text-only loop → clickable single-player vertical slice → instrumented playtest build → presentation pass → production-point review. No broad MMO infrastructure until the tiny toy proves itself.
- **Decision 015 — MVP Definition of Done and Scope Freeze:** locked the MVP as the complete Decisions 001–014 set, froze feature additions, defined MVP completion, and established change-control rules. New ideas go to the Layered Feature Backlog unless they fix a contradiction, unblock the prototype ladder, improve comprehension of the locked toy, protect economy trust, or are required for playtest evidence.

Reference: `DECISION_LOG.md`.

---
- **Decision 016 — Stage 1 Paper-Test Amendments (PROPOSED):** two recipe-weight amendments from the executed Stage 1 paper prototype: Survey Clarity reads Crystal Lens Conductivity, and Integrity Safety reads Patch Alloy Hardness + Reactive Binder Heat Resistance. Fixes Thornwake Crystal being strictly dominated, contradicting Decision 006.
- **Decision 017 — Hybrid Time Model (LOCKED):** every run = short active phase (prospect → deploy → event windows, ~3–5 min) + player-chosen passive extraction tail (15 m/1 h/4 h/8 h, sublinear yield). Active:casual reward target ~2–3:1, never ~10:1; wear is the anti-inflation valve; recipes priced in claims (~2 casual claims ≈ 1 craft).
- **Decision 018 — Seeded Random Bloom Variance (LOCKED):** blooms are generated within family stat caps; manual rotation in MVP; extinction + provenance; bloom #1 stays the locked seed.
- **Decision 019 — Prospecting & Concentration (LOCKED):** scan by family → sample spots → first sample reveals a resource's stats and yields a trickle → hunt the ceiling or settle; survey energy and scanner wear bound the hunt; the rotation's rolled concentration range is hinted, the peak is earned.
- **Decision 020 — Staggered Random Lifetimes (LOCKED):** each resource rolls a hidden lifespan (~3–9 days) and a concentration range at spawn; the bloom is a rolling window, never a timeable global flip.
- **Decision 021 — Class-Call Slots & Nine-Resource Bloom (LOCKED):** family reads diversified (CM reads Cond/Mall/HR across recipes), three resources per family (Sorrel Vein Copper, Bendrel Ridge Alloy, Glimmerfall Shard join the seed bloom), quantity/quality axis via concentration ranges + per-recipe input quantities, one scanner with a family selector.

Full decision text lives ONLY in `DECISION_LOG.md` (the single canonical home). This file no longer duplicates it.

---

## 1. North Star

Create a **menu/text-first multiplayer world** where players:

1. Survey planets/zones for changing resource deposits.
2. Deploy thumpers/harvesters to extract named resources.
3. Refine resources into usable materials.
4. Craft frame modules, weapons, armor, tools, and settlement upgrades.
5. Use gear until it degrades, breaks, or needs repair/replacement.
6. Trade, stockpile, specialize, and cooperate in a persistent economy.

The game should feel like:

- **Farm RPG's growth path:** start tiny, then add systems and content gradually.
- **Firefall's fantasy:** battleframes, thumpers, frontier resource extraction, hostile world events.
- **SWG Pre-CU's economy:** resources rotate, quality matters, great materials become legendary, crafters matter, decay keeps demand alive.

The game should **not** become a Frankenstein system pile. The resource/thumper economy is only a fit if it becomes a central toy: surveying → finding → extracting → crafting → using/decaying/repairing → needing new resources. Refining remains a future layer only if it creates meaningful choices rather than a mandatory tax.


---

## 2. Production Point Guardrails

This project is currently in **pre-production/exploration**, not production.

The goal is to test the core toy before committing to a giant MMO plan.

### Follow Farm RPG's growth path

Farm RPG reportedly began with:

- Crops
- Fishing
- A few crafting recipes

Then it expanded gradually.

This project should start with the equivalent:

- **Surveying**
- **Thumper extraction**
- **A few crafting recipes**
- **One or two useful gear/module outputs**

Do not start with:

- Full planet simulation
- Full player cities
- Full chat moderation
- Huge crafting trees
- Complex combat
- Real-time multiplayer
- Monetization
- Mobile app wrappers

### The current design question

> Is surveying for temporary high-quality resource deposits, deploying thumpers, and crafting decaying modules fun enough to be the core loop?

Until that is answered with a prototype, all other systems are optional.

---

## 3. Reference: Farm RPG Lessons

Farm RPG proves a multiplayer game can feel alive without synchronized avatars.

Key lessons:

- Menu-first gameplay can support huge scale.
- The server should be authoritative.
- Actions are small, repeatable, and persistent.
- Community can be built through chat, trade, gifting, events, global stats, and shared goals.
- Content cadence matters more than graphical complexity.
- Ethical no-ad monetization can work when players trust the developer.

Relevant Farm RPG-inspired systems:

- Timed/simple actions
- Inventory accumulation
- Crafting depth
- Long-tail mastery
- Daily requests/contracts
- Seasonal/world events
- Public aggregate counters
- Friendly community norms
- Optional supporter economy, later only

---

## 4. Reference: Firefall Lessons

Firefall's useful ideas for this project:

- Battleframes as build identity/classes
- Thumpers as resource extraction events
- Hostile frontier zones
- Dynamic world events
- Group contribution to shared objectives
- Crafting/equipment progression
- Resource extraction as adventure, not passive background only

The adaptation should be async/menu-first:

```text
Scout zone
  -> identify resource signal
  -> deploy thumper
  -> spend actions defending/repairing/boosting extraction
  -> receive named resources
  -> craft modules directly in MVP; refine/craft in later layers only if refining adds real decisions
  -> use modules until they wear down
```

### Firefall failure lessons to preserve

Firefall's thumper fantasy is worth keeping, but Firefall's broader failure pattern should be avoided:

- Do not churn core progression/economy systems after players invest.
- Do not bury the good event system under repetitive filler missions or empty travel.
- Do not add PvP/eSports promises before the PvE extraction/crafting loop is sticky.
- Do not require synchronous group play before async coordination tools exist.
- Do not multiply scarce node resources per helper; scale group events through efficiency, access, completion success, and secondary rewards.
- Do not let MMO scope exceed the tiny Farm RPG-style growth path.

Reference: Appendix R2.
Reference: Appendix R1.

### Thumper components as the SWG/Firefall bridge

Thumpers should be craftable assemblies whose parts are made from SWG-style named resources. Each part changes the extraction event.

MVP components are locked to three slots:

| Component | Main effects | Core tradeoff |
|---|---|---|
| Drill | Extraction rate, depth access | Faster/deeper often means louder/more threat |
| Pump | Recovery efficiency, waste reduction | Poor pumps waste scarce resources |
| Hull | Condition, repairability, damage survival | Heavy hull slows deployment/recall |

Deferred component slots include **Power Core**, **Sensor/Beacon**, **Separator**, **Stabilizer**, **Cooling**, **Cargo Bay**, **Recall System**, **Repair Drones**, **Fuel Cells**, and **Calibration Kits**.

Design rule: every better component should create a stronger event profile, not merely “more output.” Better parts should also alter risk, maintenance, cost, helper needs, or failure mode.

---

## 5. Reference: SWG Pre-CU Resource System Research

Research notes from old SWG wiki/API sources:

### Resource categories

SWG resources were broadly categorized as:

- Energy
- Organic
  - Creature resources
  - Flora
- Inorganic
  - Chemical
  - Gas
  - Mineral
  - Water
- Space resources later

A resource could be a specific subclass. Example: lubricating oil was a subclass of inert petrochemical, which was a subclass of chemical, which was an inorganic resource.

### Named resource instances

At any time, planets had specific named resource instances available. Each named resource had fixed characteristics. If multiple players gathered the same named resource, their stacks were identical and could be combined.

Important SWG principle:

> A named resource that despawned would never spawn again.

This created historical scarcity. High-quality named resources became worth stockpiling.

### Resource lifespan / shifting

SWG resources shifted irregularly. Source notes indicated:

- Random lifespan around **6–21 days**
- Common inorganic resources often shorter, around **6–10 days**
- Organic/JTL resources could be **6–21 days**

Ryan remembered weekly/monthly shifts; the public old-source note suggests irregular multi-day shifts, often in the weekly-ish range.

### Resource stats / qualities

Resource characteristics could include:

- **CR** — Cold Resistance
- **CD** — Conductivity
- **DR** — Decay Resistance
- **ER** — Entangle Resistance
- **FL** — Flavor
- **HR** — Heat Resistance
- **MA** — Malleability
- **OQ** — Overall Quality
- **PE** — Potential Energy
- **SR** — Shock Resistance
- **UT** — Unit Toughness

Values were generally between 1 and 1000, with resource-type caps/minimums.

Schematics only cared about the stats relevant to that item/property. For a given schematic, higher relevant stats meant better crafting/experimentation outcomes.

### Surveying

Survey tools searched for resource concentrations in the player's area.

A survey returned a grid/percentage-style reading and pointed toward the highest concentration nearby. Players would move, rescan, and narrow in on better locations.

Relevant details:

- Survey range improved with skill.
- Resource concentration was shown as a percentage.
- Once at a good concentration, players could hand-sample or place a harvester.

### Sampling

Players could manually sample small quantities after surveying.

Sampling depended on:

- Resource concentration at the current location
- Player sampling skill
- Success chance
- Sample size

Sampling was useful for checking a resource before committing harvesting infrastructure.

### Harvesters

Harvesters extracted resources while unattended.

A harvester required:

- Good placement over a concentration
- Power
- Maintenance
- Periodic emptying of output hopper

Harvesters had:

- Base Extraction Rate / BER
- Hopper capacity
- Maintenance cost
- Power consumption

Actual extraction depended on resource concentration. One old-source formula:

```text
Actual Extraction Rate ≈ BER × concentration × 1.5
```

Another form:

```text
Concentration / 0.6665 × BER ≈ Actual Extraction Rate
```

Meaning roughly: about 66–67% concentration produced the nominal BER; higher concentrations extracted faster.

### Crafting and schematics

SWG crafting used schematics. Schematics defined:

- Resource type requirements
- Amounts
- Specific/general resource slots
- Relevant resource stats for item properties
- Complexity
- Required tools/stations
- Experimental properties

A schematic might accept a broad resource class, but factories/manufacturing required the **exact named resources** used when creating the manufacturing schematic.

### Experimentation

Crafters could spend experimentation points to improve item properties.

Experimentation involved risk and result tiers such as critical success, amazing success, good success, failure, and critical failure.

Outcomes were affected by:

- Crafter skill
- Tool/station quality
- City bonuses/buffs
- Risk/points used
- Relevant resource qualities

### Allocation / tuning adaptation

The useful lesson from SWG is not "hide ten stats in a spreadsheet." It is that crafting becomes memorable when players make visible tradeoffs. For this project, adapt SWG experimentation into a small allocation screen:

```text
Choose schematic
  -> add named resources / subcomponents
  -> preview weighted properties
  -> allocate a few tuning points
  -> choose safe craft or risky experiment
  -> produce item / kit / batch recipe
```

A schematic should expose which resource stats matter for each property. Example:

```text
Field Repair Kit — MVP version
Condition Restored = Malleability + OQ + Hardness
Integrity Safety   = Malleability + Hardness + OQ
Field Reliability  = Heat Resistance + Conductivity + OQ

Future repair/refining may reintroduce Chemical Purity for sealants, contamination control, compatibility range, biological salvage, separators, and precision repair.
```

The player/crafter then allocates points between properties instead of getting one generic quality number. A kit tuned for large condition restoration should not be identical to a kit tuned for delicate integrity-safe sensor repair.

### Manufacturing / factories

Factories could produce crates/batches of identical items from a manufacturing schematic.

Important details:

- The factory needed the exact named resources and exact subcomponents used in the schematic.
- Serial numbers mattered for identical factory runs.
- High-end crafters waited for great experimentation outcomes before creating manufacturing schematics.
- Production could take hours/days depending on complexity.

### Decay / replacement economy

The exact old decay pages were harder to source cleanly, but the remembered Pre-CU economic loop depends on gear not being permanent forever. This is essential for the design fit:

- If gear/modules never degrade, the market saturates.
- If good resources never return, high-quality batches become historically valuable.
- If crafted items eventually wear out, crafters and harvesters remain relevant.

For this project, gear decay should be considered a core sink, but tuned gently to avoid punishing casual players.

---

## 6. Fit Analysis: Does SWG's Resource Loop Belong Here?

### Verdict

**Yes, but only as a simplified core loop.**

It is a strong fit if the game's central toy is:

```text
Survey → find → thump → craft → use/repair/decay → repeat

Future layers may insert refining between thump and craft only if it creates meaningful choices rather than a mandatory tax.
```

It is a bad fit if it is added as an advanced side system after a different core loop is already established.

### Why it fits

The SWG resource loop naturally supports the goals:

- Gives the world a reason to change weekly-ish.
- Creates player knowledge and scouting value.
- Lets crafters specialize and build reputations.
- Makes high-quality resource discoveries exciting.
- Supports player trade without forcing PvP.
- Makes thumpers mechanically meaningful.
- Provides a durable economy sink through decay.
- Feels MMO-like without real-time simulation.

### Why it could fail

It can become too complex too early:

- Too many resource stats confuse players.
- Too many materials make crafting unreadable.
- Too much decay feels punishing.
- Too much surveying becomes spreadsheet work.
- Too much randomness undermines player agency.
- Too much economy depth delays the first playable prototype.

### Design constraint

Start with SWG's **shape**, not SWG's full complexity.

---

## 7. Simplified Core Resource Model

Start with only 3–4 resource stats.

Recommended initial stats:

- **OQ / Overall Quality** — general excellence
- **DR / Durability or Decay Resistance** — affects item lifespan
- **EN / Energy Potential** — affects power output, ability strength, or efficiency
- **CD / Conductivity** — affects electronics/weapons/tools

Avoid launching with all SWG stats.

### Resource example

```yaml
resource_instance:
  name: Veyrith Copper
  family: Mineral
  subtype: Copper
  planet: Kharon
  zone: Red Mesa
  lifespan_days: 9
  concentration_map_seed: 82731
  stats:
    OQ: 812
    DR: 344
    EN: 205
    CD: 936
```

### Resource lifecycle

1. Server generates a named resource spawn.
2. Spawn appears on one or more planets/zones.
3. Players survey to find high concentration pockets.
4. Players deploy thumpers to extract while the spawn is active.
5. Spawn despawns after its lifespan.
6. Same named resource never returns.
7. Stockpiled resources remain in player inventories.

---

## 8. Thumpers as the Harvester Analogue

Thumpers are the game's version of SWG harvesters plus Firefall fantasy.

### Basic thumper loop

```text
1. Player surveys a zone.
2. Player finds a signal: resource type + rough quality + concentration.
3. Player deploys a thumper with an owner-selected doctrine/loadout.
4. Thumper extracts over time.
5. Owner spends actions to stabilize, repair, boost, or retrieve; owner-authorized combat helpers can defend/suppress threats.
6. Thumper output goes to hopper.
7. Player empties hopper and claims named resources. Future layers may add optional refining if it creates meaningful decisions.
```

### Thumper stats

- Extraction rate
- Hopper capacity
- Power/fuel cost
- Stability
- Noise/threat generation
- Wear/maintenance
- Deployment duration

### Concentration formula, simplified

```text
actual_output_per_tick = base_rate × concentration_multiplier × thumper_efficiency
```

Where concentration multiplier can be simple:

```text
0–25% concentration: poor output
26–50%: okay output
51–75%: good output
76–100%: excellent output
```

Do not expose complex formulas early unless the playerbase wants spreadsheet depth.

### Thumper event hooks

Thumpers can generate async events:

- Predator attack
- Melding storm surge
- Drill jam
- Power fluctuation
- Rich vein discovered
- Rival claim beacon
- NPC faction request
- Community defense objective

These events create multiplayer world texture without needing real-time combat.

### Public combat distress board / helper layer

Final call: public assistance should be **combat/threat-focused first**, not open-ended control over another player's equipment. The board exists to let online players jump into bite-sized frontier danger while the thumper owner keeps authority over extraction choices, repair choices, recall, and equipment-risk decisions.

Use this layer for:

- hostile swarms, raiders, burrowers, faction scouts, storm-creature pressure, and other combat/threat events;
- defender/suppressor helper actions;
- secondary combat salvage, trophy components, faction rep, badges, and small helper payouts;
- reducing incoming damage or threat escalation within owner-defined limits.

Do **not** use the first version of the board for:

- helpers choosing to overdrive, push deeper, recall, abandon cargo, spend the owner's repair kits, or make any decision that can materially run down the owner's equipment;
- duplicating the node's rare resource output for every helper;
- turning every thumper into a needy realtime obligation.

Owner control model:

```text
Owner choices = site, thumper loadout, doctrine, risk mode, repair/recall/extraction decisions.
Helper choices = fight/suppress/distract/fortify/scan threat, within the posted event contract.
System defaults = if nobody helps, resolve by owner doctrine; do not punish real-life absence.
```

This keeps the original intention intact: the core toy remains `Survey -> thump -> craft -> equip/use -> decay -> survey better`. The board is a later multiplayer/combat expression of the thumper event, not a new core loop and not a way for strangers to gamble with the owner's gear.

---

## 9. Crafting Model

Crafting should turn resource quality into meaningful item differences.

### Initial crafted item types

Start tiny:

- Survey tools
- Thumper parts
- Frame modules
- Field batteries
- Armor plates
- Weapon components

### MVP recipe-weight example

Decision 010 replaces generic/candidate examples with transparent MVP property weights. Example:

```yaml
recipe: Survey Scanner Module Mk I
slots:
  conductive_core: Conductive Metal
  crystal_lens: Reactive Crystal
  frame_mount: Structural Alloy
properties:
  survey_clarity: 60% Conductive Core Conductivity + 25% Crystal Lens OQ + 15% average OQ
  stat_hint_accuracy: 50% Conductive Core Conductivity + 30% Crystal Lens Heat Resistance + 20% average OQ
  signal_range: 55% Conductive Core Conductivity + 25% Crystal Lens Heat Resistance + 20% average OQ
```

### Design goal

The player should understand:

- This copper is amazing for electronics.
- This alloy is great for durable armor.
- This energy crystal is mediocre now but useful for bulk fuel.
- This rare high-OQ material is worth saving.

---

## 10. Decay / Item Sink Model

Decay should keep the economy alive without making players resent the game.

### Recommended approach

Use **module durability**, not constant total item destruction at first.

- Gear has condition/durability.
- Use reduces durability slowly.
- Repair restores condition but may reduce max condition slightly, or require repair materials.
- Eventually modules become inefficient or break.
- Some cosmetic/achievement items should not decay.

### Gentle decay rules

Good early rules:

- Tools decay only on meaningful actions.
- Low-level gear is cheap to replace.
- High-quality resources improve max durability.
- Repairs are predictable.
- No surprise deletion.
- Players can see expected remaining uses.

### Condition + Integrity model

Use two layers:

```text
Condition = current health of the item/module
Integrity = current maximum condition / long-term structural health
```

Routine use should mostly reduce Condition. Repairs restore Condition up to the current Integrity cap, but repair is not a magic full-heal button.

Integrity/max-durability loss should be reserved for severe events and risky choices: catastrophic thumper damage, emergency recall, field repair under pressure, overheat/overload, using a broken item, failed salvage, or repeated repair after full break.

Frame modules are identity gear and should usually be repairable. At 0 Condition, they should become disabled/inefficient rather than surprise-deleted. Thumper components can be harsher because they are the risk-taking extraction layer, but even then destruction should usually produce salvage/rebuild choices instead of opaque deletion.

### Crafted repair kits

Repair kits are crafted economy items, not universal consumables. They should use the same named-resource quality logic as frame modules and thumper parts. A repair attempt should produce a variable result based on kit quality, target item family, damage profile, context, and operator/frame bonuses.

Repair can restore Condition, reduce additional Integrity risk, or in expensive overhaul cases recover some lost Integrity. It should not automatically return an item to `100%` unless the kit, context, and target justify that outcome.

Example repair-kit properties:

| Property | What it affects | Resource hooks |
|---|---|---|
| Condition Restored | how much current condition is recovered | MVP: Malleability, OQ, Hardness; future: Chemical Purity may return |
| Integrity Safety | chance the repair avoids max-condition damage | Malleability, Hardness, OQ |
| Field Reliability | performance during live events / heat / pressure | Heat Resistance, Conductivity, OQ |
| Compatibility Range | deferred from MVP | Future: Chemical Purity, Malleability, OQ |

Good repair UI should show an expected range, not a fake certainty:

```text
Expected repair: +18-25 Condition
Integrity risk: Low
Kit match: Good
Context: Field / under heat pressure
```

Workshop repair should be safer and more precise. Field repair should be faster and useful during active events, but it should consume better kits and carry more risk under pressure.

### Active thumper events

Thumper play should support both async and live engagement:

```text
Async player: deploy -> leave -> return -> claim / repair / plan
Active player: deploy -> stay -> respond to event prompts -> improve outcome
```

Active play should improve agency, safety, resource integrity, salvage chances, and secondary rewards. It should not simply duplicate scarce node output per active player. The node cap stays controlled; active play improves how cleanly and safely the player extracts from it.

Early live prompts can be small text/menu mini-games, but every prompt must be a tradeoff. If tuning, boosting, suppressing, or repairing is always correct, the prompt is just a chore.

Design rule:

```text
Every active choice should improve one meter while costing/risking another.
Ignore / hold should sometimes be valid because it preserves action, condition, signal profile, heat budget, kit charge, or recall options.
```

Examples:

- Signal Drift: tune for resource integrity, boost for rare-pocket chance with noise/threat, or ignore to conserve sensors/action and stay quiet.
- Heat Spike: vent to lower heat but slow extraction, hold steady to save action, or overdrive for speed at high wear/integrity risk.
- Hull Damage: light patch, standard patch, hard patch, or recall; larger repairs consume better kits and raise flaw/integrity risk.
- Pump Clog: clear gently to protect rare resources, force pressure to keep output moving with pump/contamination risk, or pause extraction to prevent damage escalation.
- Threat Tunnel: suppress, fortify, distract, or call for help; combat actions protect the rig but consume the helper/operator's combat gear condition and can trade off against salvage quality or resource recovery.

These prompts make staying in the experience fun without requiring realtime MMO combat infrastructure. Combat-focused players can enter first as defender/suppressor helper roles on thumper events; full combat contracts should come after the extraction-crafting loop proves fun. Public help should start as a combat distress board where helpers reduce danger and earn secondary combat rewards, while the thumper owner keeps control over extraction, repair, recall, and component-risk decisions.

### Why decay matters

Without decay:

- Crafters eventually saturate the market.
- Resource discovery loses value.
- Players stop needing each other.

With fair decay:

- Resource shifts matter.
- Crafters have repeat customers.
- High-quality stockpiles matter.
- Economic stories emerge.

---

## 11. MVP Vertical Slice

The first prototype should answer the design question, not build the whole game.

Reference: `BUILD_PLAN.md`.

### MVP principle

The MVP is not “Farm RPG plus Firefall plus SWG.” It is a tiny extraction-crafting toy:

```text
Survey → thump → craft → equip/use → decay → survey better
```

Do not add a second major loop until this loop is repeatable and fun.

### Crafted-best vs combat/player-frame guardrail

A pure crafted-only economy risks making combat/exploration players feel unrewarded. Use this split:

```text
Best reliable functional performance = crafted
Best discovery/trophy/exotic unlocks = exploration/combat/events
Best long-term identity = frame + crafted loadout + provenance
```

Combat/events can reward rare salvage, blueprint fragments, cosmetics, trophies, faction reputation, and prototype components that crafters finish into reliable gear.

Combat/exploration rewards should usually be **optional augments**, not replacements for the resource-quality economy. Base functional items should remain craftable from surveyed resources in the MVP; future layers may add surveyed/refined inputs only if refining creates meaningful choices. Adventure inputs add specialty modifiers, exotic variants, recovery bonuses, cosmetics, or blueprint unlocks. If an exotic schematic requires a combat-found item, accept substitute quality grades (mangled/chipped/intact/preserved/pristine) so resource quality still sets the base power while the combat item sets the specialty layer.

Frames matter because they define verbs, efficiencies, and constraints; crafted modules tune and specialize those verbs.

Frame module upgrades should be the source of combat/salvage tuning. A player who wants better preserved trophy parts should equip a crafted Trophy Recovery Kit or Salvage Harness; those modules should depend on named resource quality, optional adventure augments, and durability/repair. Do not create abstract permanent salvage bonuses detached from the crafting economy.

### MVP content

Locked by Decisions 001–011:

- 1 planet/frontier world placeholder.
- 1 zone: **Red Mesa**.
- 3 frames: **Recon**, **Engineer**, **Vanguard**.
- 3 resource families: **Conductive Metal**, **Structural Alloy**, **Reactive Crystal**.
- 6 named resources in the first Red Mesa Bloom:
  - **Keth Iron**
  - **Red Mesa Conductive Slag**
  - **Asterion Frame Alloy**
  - **Pale Ember Crystal**
  - **Veyrith Copper**
  - **Thornwake Crystal**
- 5 resource stats: **OQ**, **Conductivity**, **Hardness**, **Heat Resistance**, **Malleability**.
- 1 survey action.
- 1 deploy-thumper action.
- 1 thumper claim/resolution action.
- 1 basic personal thumper.
- 3 thumper components: **Drill**, **Pump**, **Hull**.
- 4 thumper event actions: **Signal Tune**, **Field Repair**, **Suppress Threat**, **Clear Pump Problem**.
- 4 complication types: **Signal Drift**, **Hull Damage**, **Threat Surge**, **Pump Strain**.
- 5 crafting recipes: **Basic Drill Head**, **Efficient Pump**, **Reinforced Hull Plate**, **Survey Scanner Module Mk I**, **Field Repair Kit**.
- Resource-first crafting: named-resource stat fit sets the base value and practical ceiling; tuning expresses that potential but does not upgrade/mutate the resource.
- Decision 010 numeric model: 1–1000 internal resource stats, 0–100 crafted property scores, transparent recipe weights, and exactly 3 tuning points at +5% relative per point.
- Condition + Integrity durability on modules/thumper parts.
- Simple inventory/economy ledger.
- Six-screen UI proof: **Pilot Home**, **Red Mesa Survey**, **Signal Detail / Deploy Thumper**, **Thumper Run / Event Window**, **Claim Results**, **Crafting + Gear / Repair**.
- Decision 011 first-session path: frame choice → survey three signals → recommended Veyrith Copper thump → Signal Drift + Pump Strain → claim enough Veyrith Copper → craft Survey Scanner Module Mk I → equip → see a clearer second survey.

MVP resource rotation:

- Internal prototype: manual reset/advance between tests.
- Early external prototype: fixed **7-day Red Mesa Bloom**.
- Final irregular SWG-style multi-day rotation is deferred.

MVP crafting interaction:

```text
Choose schematic
→ fill resource-family slots with named resources
→ preview weighted output properties
→ spend exactly 3 tuning points
→ choose Safe Craft or Careful Experiment
→ produce the item
→ show why the result happened
```

No mandatory refining step exists in the MVP. Extracted named resources can go directly into schematics.

### MVP frame verbs

| Frame | Passive | Event action |
|---|---|---|
| Recon | Better survey clarity / extra clue | Signal Tune: improves resource integrity or lowers surprise chance |
| Engineer | Better repair / lower thumper wear | Field Repair: restores hull or clears pump instability |
| Vanguard | Reduced thumper damage from threat | Suppress Threat: lowers current threat or blocks next damage tick |

### MVP loop

```text
Choose Recon, Engineer, or Vanguard
Survey Red Mesa
  -> compare 2–3 resource signals
  -> pick a signal based on concentration, quality hints, depth, and threat
Deploy a personal thumper with Drill / Pump / Hull
  -> resolve 2 event windows by default, or up to 3 in a high-risk/push run
  -> use Signal Tune, Field Repair, Suppress Threat, or Clear Pump Problem when relevant
Claim named resource, waste/scrap, component wear, hull damage, and maybe small salvage
Choose a schematic
  -> fill named-resource slots
  -> preview properties
  -> spend exactly 3 tuning points
  -> choose Safe Craft or Careful Experiment
Craft Basic Drill Head / Efficient Pump / Reinforced Hull Plate / Survey Scanner Module Mk I / Field Repair Kit
Equip or repair
Repeat with better information, better extraction, better recovery, or better survivability
```

### MVP success criteria

The prototype is promising if:

- Surveying creates “one more scan” curiosity.
- Finding a high concentration feels exciting.
- Named resource quality creates decisions.
- Crafting output differences are understandable without a spreadsheet.
- Each frame changes at least one meaningful decision.
- Decay feels like a fair reason to continue, not punishment.
- Players can repeat the loop several times before asking for another system.
- The pixel/menu presentation makes the world feel cooler than a spreadsheet.

### Production point gate

Stay in pre-production until this slice proves:

- the loop is fun with tiny content;
- the UI makes resource quality and crafted outcomes clear;
- frame choice matters;
- the economy ledger is reliable;
- tuning can happen through data instead of code rewrites;
- the next work is mostly content production, not core-system redesign.

---

## 12. Multiplayer/Economy Implications

### Player roles that can emerge

- Surveyor: finds great deposits and sells coordinates/intel.
- Harvester: runs many thumpers and sells raw materials.
- Refiner: improves raw resource usability.
- Crafter: makes modules/gear from high-quality resources.
- Contractor: completes missions using crafted gear.
- Trader: arbitrages resource scarcity.

### Economy principles

- Named resources create history.
- Rotating spawns create urgency.
- Quality stats create expertise.
- Decay creates demand.
- Crafting creates identity.
- Thumpers create world interaction.

### Anti-Frankenstein rule

Every major feature should connect back to at least one of:

- Surveying
- Extraction
- Refining
- Crafting
- Gear use/decay
- Trade/community

If a feature does not connect, defer it.

---

## 13. Technical Design Notes

Reference: `BUILD_PLAN.md`.

### Recommended stack

Use a web-first, server-authoritative, modular monolith:

```text
SvelteKit web/PWA client
  -> TypeScript server actions/API
  -> PostgreSQL database
  -> Postgres-backed jobs/worker
  -> static pixel assets behind CDN/cache
```

Recommended starting stack:

- TypeScript
- SvelteKit
- PostgreSQL
- Drizzle ORM
- Zod or Valibot validation
- Vitest for domain tests
- Playwright for critical UI flows
- Docker Compose locally and for first VPS deployment

Start as one deployable app with clean internal packages rather than microservices.

### Cost guardrails

The cheapest infrastructure comes from design choices:

- Avoid realtime by default; use HTTP actions and light polling.
- Avoid per-second simulation; resolve thumper progress from timestamps/event seeds.
- Write only on meaningful actions, not UI refreshes or timer ticks.
- Cache static content, item definitions, recipes, and pixel art aggressively.
- Use Postgres jobs before adding Redis/queue infrastructure.
- Delay chat, marketplace, and global realtime features until the core loop is proven.
- Ledger every economy mutation and keep current-state tables for cheap UI reads.

### Server-authoritative actions

The server decides all outcomes.

Example action flow:

```text
POST /survey
  -> validate player energy/tool
  -> calculate visible resources at location
  -> return concentration readings

POST /thumpers/deploy
  -> validate resource signal and placement
  -> create thumper job
  -> reserve fuel/maintenance

POST /thumpers/claim
  -> calculate elapsed extraction
  -> apply events/modifiers
  -> insert inventory transaction
  -> update hopper/thumper state
```

### Decision 012 MVP data records

Decision 012 locks these authoritative MVP records:

- Pilot.
- Resource Instance.
- Resource Stack.
- Item.
- Schematic Definition.
- Crafting Attempt.
- Thumper Run.
- Thumper Event Window.
- Thumper Run Result.
- Repair Action.
- Economy Ledger.

### Ledger requirement

All economy changes should be recorded.

Examples:

- SURVEY_SAMPLE_GAIN
- THUMPER_OUTPUT_CLAIMED
- CRAFT_INPUT_CONSUMED
- CRAFT_OUTPUT_CREATED
- REPAIR_MATERIAL_CONSUMED
- DURABILITY_LOSS
- TRADE_SENT
- ADMIN_GRANT

This is a learning project, so treat the ledger as a core coding-practice goal. Decision 012 supersedes older generic table names in this section; implementation can use slightly different physical table names as long as the locked records and audit guarantees are preserved.

---

## 14. Open Questions / Next Decisions

Resolved by Decisions 001–015:

- MVP region count, stats, thumper component slots, recipes, event actions, event-resolution shape, first resource bloom, crafting interaction, resource/tuning relationship, UI click-path, stat scale, recipe weights, output ranges, first-session onboarding script, data/economy ledger, success metrics, and prototype ladder/build order are locked.
- The MVP has no mandatory refining step.
- The roadmap is an internal layered backlog, not a public promise list.
- Decision 010's numbers are prototype balance values; they may tune, but the current formula shape protects resource primacy.
- Decision 014 locks the build order: paper/spreadsheet → text-only loop → clickable vertical slice → instrumented playtest → presentation pass → production-point review.
- Decision 015 freezes MVP scope and defines the MVP Definition of Done.

MVP design status:

```text
The MVP is defined. No further MVP design expansion is required before implementation begins.
```

Optional later reviews happen only when prototype evidence triggers them: presentation detail for Stage 5, post-MVP layer gates, or a formal scope-change review.

## 15. Immediate Next Steps

Decision 015 says to stop expanding MVP scope and follow the Decision 014 prototype ladder:

1. Build the paper/spreadsheet economy prototype for Decision 010's Red Mesa Bloom stats, recipe weights, 3 tuning points, Safe Craft, and Careful Experiment.
2. Build the text-only loop prototype so a tester can complete the first-session path without presentation polish.
3. Build the clickable single-player vertical slice around the six locked MVP screens.
4. Add Decision 013 instrumentation and ledger audits.
5. Add a light presentation pass only after the loop is understandable.
6. Run a production-point review before adding public helper boards, group thumpers, marketplace, refining, contracts, more regions, or broader MMO infrastructure.

---

## Appendix: Condensed Research Summaries

The five standalone research files are retired; their conclusions are preserved here. (Full originals remain in the project archive if deeper rationale is ever needed.)

### R1 — Durability + Frame Modules

Question: how should module customization, durability, and gear loss work without players hating the sink? Conclusion: use repairable **Condition** for normal wear; reserve **Integrity** (max-durability) loss for severe events and risky choices; never surprise-delete frame modules. Frame modules are the customization layer for survey/thumper/combat/salvage specialization, and combat/salvage tuning must come from crafted modules tied to named-resource quality — never abstract permanent character bonuses. Players hate opaque, punitive, total-loss durability; they accept wear that is visible, fair, and answered by a crafting economy.

### R2 — Firefall Failure + Thumper Components

Question: why did Firefall fail, and were thumpers the problem? Conclusion: Firefall failed through constant core-system churn, repetitive filler missions and travel friction, weak group-play support, PvP/eSports overreach, unsticky monetization, and company collapse — **not** because of thumpers. Thumpers were its most salvageable idea: a player-triggered, social, dangerous extraction event. The merged design: SWG resource quality gives materials meaning; Firefall thumpers turn extraction into a risky event; component crafting (Drill/Pump/Hull now, Power Core/Sensor/Separator/etc. later) connects the two. Every better component should change the event profile (risk, maintenance, failure mode), not merely add output.

### R3 — Group vs Personal Thumpers

Question: did bigger Firefall thumpers trade output for danger, and should group output scale per helper? Conclusion: bigger thumpers offered capacity, payoff, group efficiency, and social defense hooks, traded against more enemies, destruction risk, and coordination cost. For this project, group thumpers must scale through **recovery efficiency, deposit access, completion success, and secondary rewards — never uncapped per-player duplication of scarce named resources**, which would inflate the SWG-style economy. MVP uses the personal thumper only; group thumpers are a backlog layer.

### R4 — SWG Crafting, Repair Kits, Active Events

Question (Ryan's correction): repair must not be a generic instant full restore. Conclusion: repair kits are crafted, resource-quality-driven, outcome-variable economy objects: named resources → kit properties → partial Condition restore / Integrity safety / field reliability. Repair context matters (workshop vs field vs emergency). The game should support both deploy-and-return async play and active live engagement; live mini-game choices must stay bounded tradeoffs, not twitch tests. This research produced the Decision 003 repair-kit model and the Decision 004/005 event-action structure.

### R5 — SWG Pre-CU Resource/Crafting Verdict

Question: was SWG's resource/crafting economy the failed part of SWG? Conclusion: **no** — it was among its most praised systems, creating real player roles (surveyor, harvester, crafter, shopkeeper, trader) and named-resource history/markets. SWG's failures were combat, content cadence, bugs, and redesigns. Pitfalls to avoid when adapting: opacity, complexity walls, high-end crafter dominance, low loot excitement for non-crafters, missing high-end sinks, and database/event-volume traps. Fit verdict: Farm RPG for scope discipline, SWG Pre-CU for the rotating named-resource economy, Firefall for extraction-event fantasy. Variable thumpers with degrading craftable parts create a self-sustaining loop but must launch small.

---

## Active Rollout Target Note

As of 2026-06-16, Decision 024 supersedes Decision 022 as the current playtest target. The next build starts in WORKSHOP, grants low-to-mid bench stock and the three thumper-part schematics, and keeps FIELD / RIG / SETTLEMENT in development until crafting is proven fun on its own. See `WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md`.
