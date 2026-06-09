# Design Bible — Async Frontier MMO

> **Working premise:** Build a small, learnable, Farm RPG-style async MMO that starts with one or two satisfying loops and grows over time. The fantasy direction is Firefall-inspired sci-fi frontier extraction with pixel art, while the economy inspiration is Star Wars Galaxies Pre-CU's resource surveying, named resource qualities, harvesting, crafting, decay, and player-driven stockpiling.

This file is the project-owned design bible for the game concept. It is intentionally separate from `production-point.md`, which is a copyrighted game-development reference book used by the local docs MCP.

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

The game should **not** become a Frankenstein system pile. The resource/thumper economy is only a fit if it becomes a central toy: surveying → finding → extracting → refining → crafting → using/decaying → needing new resources.

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
  -> refine/craft modules
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

Reference: `FIREFALL_FAILURE_AND_THUMPER_COMPONENT_RESEARCH.md`.
Reference: `DURABILITY_AND_FRAME_MODULE_RESEARCH.md`.

### Thumper components as the SWG/Firefall bridge

Thumpers should be craftable assemblies whose parts are made from SWG-style named resources. Each part changes the extraction event.

MVP components:

| Component | Main effects | Core tradeoff |
|---|---|---|
| Drill | Extraction rate, depth access | Faster/deeper often means louder/more threat |
| Pump | Recovery efficiency, waste reduction | Poor pumps waste scarce resources |
| Hull | HP, repairability | Heavy hull slows deployment/recall |
| Power Core | Rate/duration, active module support | Strong cores create heat/instability |
| Sensor/Beacon | Survey accuracy, helper slots, public visibility | Strong signals attract help and danger |

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
Field Repair Kit
Condition Restored = Malleability + OQ + Chemical Purity
Integrity Safety   = Malleability + Hardness + OQ
Field Reliability  = Heat Resistance + Conductivity + OQ
Compatibility      = Chemical Purity + Malleability + OQ
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
Survey → find → thump → refine → craft → use → decay → repeat
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
7. Player empties hopper and refines resources.
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

### Recipe example

```yaml
recipe: Lightweight Recon Sensor
inputs:
  - 20 units Conductive Metal
  - 10 units Polymer
  - 1 Basic Circuit
properties:
  scan_range:
    CD: 70%
    OQ: 30%
  durability:
    DR: 80%
    OQ: 20%
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
| Condition Restored | how much current condition is recovered | Malleability, OQ, Chemical Purity |
| Integrity Safety | chance the repair avoids max-condition damage | Malleability, Hardness, OQ |
| Field Reliability | performance during live events / heat / pressure | Heat Resistance, Conductivity, OQ |
| Compatibility Range | how many item families the kit works well on | Chemical Purity, Malleability, OQ |

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

Reference: `MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md`.

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

Combat/exploration rewards should usually be **optional augments**, not replacements for the resource-quality economy. Base functional items should remain craftable from surveyed/refined resources; adventure inputs add specialty modifiers, exotic variants, recovery bonuses, cosmetics, or blueprint unlocks. If an exotic schematic requires a combat-found item, accept substitute quality grades (mangled/chipped/intact/preserved/pristine) so resource quality still sets the base power while the combat item sets the specialty layer.

Frames matter because they define verbs, efficiencies, and constraints; crafted modules tune and specialize those verbs.

Frame module upgrades should be the source of combat/salvage tuning. A player who wants better preserved trophy parts should equip a crafted Trophy Recovery Kit or Salvage Harness; those modules should depend on named resource quality, optional adventure augments, and durability/repair. Do not create abstract permanent salvage bonuses detached from the crafting economy.

### MVP content

- 1 planet/frontier world
- 1 zone: Red Mesa
- 3 frames: Recon, Engineer, Vanguard
- 3 resource families: Conductive Metal, Structural Alloy, Reactive Crystal
- 6 named resource spawns
- 5 resource stats: OQ, Conductivity, Hardness, Heat Resistance, Malleability
- 1 survey action
- 1 deploy-thumper action
- 2–4 thumper event actions
- 1 thumper claim/resolution action
- 3 thumper components: Drill, Pump, Hull
- 5 crafting recipes
- Durability/condition on modules
- Simple inventory/economy ledger

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
  -> find 82% Veyrith Copper signal with medium threat
Deploy basic thumper
  -> spend frame action to tune/repair/suppress
Claim recovered Veyrith Copper + maybe salvage
Craft Recon Sensor / Pump / Hull Plate
Equip crafted module
Use module to improve the next survey or thumper event
Module loses durability over meaningful use
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

Reference: `TECH_STACK_AND_INFRA_COST_PLAN.md`.

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

### Important tables/entities

- players
- planets
- zones
- resource_families
- resource_instances
- resource_spawn_locations
- survey_results or scan_logs
- thumpers
- thumper_events
- inventory_stacks
- inventory_transactions
- recipes
- crafted_items
- item_instances
- durability_events

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

This is a learning project, so treat the ledger as a core coding-practice goal.

---

## 14. Open Questions

1. What is the exact smallest fun loop?
2. Should planets be literal planets, zones, or regions?
3. How often should resources shift: weekly, biweekly, irregular 6–21 days, or seasonal?
4. How many stats are understandable at first?
5. Should thumper defense be abstract actions, async group events, or later real-time encounters?
6. How harsh should decay be?
7. Is trade/gifting needed in MVP, or can it wait?
8. What is the pixel-art scope for the first vertical slice?

---

## 15. Immediate Next Steps

1. Build a paper/spreadsheet prototype of resource stats → crafted item stats.
2. Build a tiny CLI or web prototype for:
   - resource generation
   - survey action
   - thumper deploy/claim
   - craft item
   - durability loss
3. Test whether the loop is understandable and compelling before adding more content.
4. Only after the core toy works, choose the production stack and start the real app.

---

## 16. Current Recommendation

The SWG Pre-CU resource loop is not a bad fit. It may be the **best fit** for making a Firefall-inspired text MMO feel like a true world.

But the implementation must be disciplined:

- Use SWG as inspiration, not as a full spec.
- Start with 3 stats, not 11.
- Start with one planet, not a galaxy.
- Start with one thumper type, not a full industrial system.
- Start with a handful of recipes, not a complete economy.
- Make decay gentle and visible.
- Keep surveying/thumping/crafting as the central toy.

If that tiny loop is fun, the project has a strong foundation.

---

## 17. Feedback-Backed Check: Was SWG Resource/Crafting a Failed System?

This section was added after specifically asking: **do not bolt on a failed system just because it sounds deep.**

### Source-backed read

The evidence does **not** point to SWG Pre-CU resource/crafting as the failed part of SWG. The stronger pattern is:

- Players and designers frequently remember the crafting/resource economy as one of SWG's strongest, most differentiated systems.
- SWG's larger problems were launch expectations, combat/balance, lack of quest/content cadence, bugs, and later radical redesigns.
- The resource/crafting system still had serious risks: too much complexity, market domination by high-end crafters, poor readability for casual players, and tension with players who expected epic loot drops.

### What players/designers praised

From Raph Koster's SWG postmortem/comment discussion:

- A former player/commenter wrote that the **crafting/resource system was fantastic**, that SWG was the only MMO they knew that required “actual thinking while crafting,” and that mastering a profession, running a shop, hunting server-best resources, finding experimentation tapes, and producing top-level items was enough for **years of play**.
- The same commenter said the bazaar/search changes helped smaller crafters because customers could discover competitive goods without needing a prime shop location.
- Koster describes the SWG economy as intentionally based on **weak-tie interdependence**: players you do not know well still matter to your survival/economy.
- Koster says SWG's offline crafting/harvesting and mission terminals were designed to make MMO play accessible in shorter sessions, while still producing very high weekly/monthly stickiness.
- The crafting/resource system created a player economy where great minerals were discovered, mined, hoarded, trickled onto the market, and arbitraged.
- Crafters could create brands and item identities instead of loot tables being the only source of prestige.

### What players/designers criticized or what clearly hurt

Do not ignore the negatives:

- Koster says **players kicked pretty hard against no loot** because MMO/CRPG players expected recognizable trophy drops and shared loot-acquisition stories.
- Gear superiority was not always readable at a glance. A plain-looking crafted pistol might be better than a visually impressive weapon, which weakened fantasy/status communication.
- A commenter praised crafting but still said the **big problem in the early years was lack of content** and that full-time crafting was not for everyone.
- Koster says many social/economic features were prioritized while the **core combat game did not work well enough**, and many players were right to criticize that.
- Koster notes a failed/omitted crafting advancement idea: crafters earning XP when others used their products. It was cut because every item sending usage messages to its maker would have made the database “fall over and die.” This is a technical warning for this project.
- Koster says the team failed to create enough high-end economic sinks for businesses and should probably have made harvesters need to be rebuilt or remade when changing resource targets.
- Koster says high-level crafters owning too many recipes let them dominate lower-level component/cheap item markets; limiting known recipes was discussed but not shipped.

### Source snippets to keep in mind

Source URLs:

- Raph Koster, **Designing a Living Society in SWG, part one**: https://www.raphkoster.com/2015/04/21/designing-a-living-society-in-swg-part-one/
- Raph Koster, **Designing a Living Society in SWG, part two**: https://www.raphkoster.com/2015/04/22/designing-a-living-society-in-swg-part-two/
- Raph Koster, **Did Star Wars Galaxies Fail?**: https://www.raphkoster.com/2015/04/27/did-star-wars-galaxies-fail/
- SWGEmu forum Google snippet, **End of Summer Update**: archive.swgemu.com/forums/showthread.php?p=729126 — snippet says SWG still had “the best crafting system in any MMO.”
- SWGEmu forum Google snippet, **New Play-Test Server Survey Results**: swgemu.com/forums/showthread.php?p=1681805 — snippet discusses best resources, ADKs, tapes, and consistently crafting the best stuff.

Important caveat: some SWGEmu forum pages are blocked/login-gated from this environment, so the forum evidence above is preserved as search-result snippets, while the Koster pages were directly readable.

### Decision

The SWG-style resource/crafting system is **not disqualified** as a failed system. It is a strong fit, provided this project avoids SWG's failure modes.

Adopt:

- Changing named resources.
- Surveying/concentration gameplay.
- Resource stats that matter to crafted item stats.
- Crafting as a source of player identity and brand/reputation.
- Decay/repair/replacement as a fair economic sink.
- Async/offline harvesting so short sessions still matter.

Avoid or delay:

- Total no-loot philosophy. The game can still have trophies, cosmetics, relics, blueprints, lore items, rare salvage, and named discoveries.
- Opaque item quality. Players need understandable item cards, comparison hints, quality grades, and visible provenance.
- Too many resource stats at launch.
- Unlimited crafter recipe dominance.
- Pure spreadsheet play with no adventure/context.
- Every item reporting every usage event to its crafter. Use aggregated stats, batch jobs, or periodic summaries instead.

---

## 18. Variable Thumpers + Degrading Parts Economy

Firefall's thumpers are a good bridge between SWG's passive harvesters and a more adventurous extraction fantasy.

Firefall source URLs:

- Firefall Archive, **Thumper**: https://firefall-archive.fandom.com/wiki/Thumper
- Firefall Archive, **Thumping**: https://firefall-archive.fandom.com/wiki/Thumping
- Firefall Archive, **Scan Hammer**: https://firefall-archive.fandom.com/wiki/Scan_Hammer
- Firefall Archive, **Resource Thumping Guide**: https://firefall-archive.fandom.com/wiki/Resource_Thumping_Guide
- Firefall Archive, **Resource Collection**: https://firefall-archive.fandom.com/wiki/Resource_Collection

### Adaptation principle

Use SWG as the **resource substrate** and Firefall as the **extraction event layer**.

```text
SWG-like world substrate:
  named resources + stats + survey concentrations + shifting spawns

Firefall-like extraction layer:
  thumper size + deployment duration + danger + capacity + damage/wear

Project economy loop:
  survey -> deploy thumper -> defend/stabilize async -> claim raw resource
  -> refine -> craft thumper parts/modules -> parts degrade -> repair/replace
```

### Thumper sizes

Start conservative. Do **not** copy old Firefall capacity jumps literally if they multiply output too quickly.

Recommended initial tiers:

| Tier | Role | Duration | Output | Risk |
|---|---|---:|---:|---:|
| Stock Personal | beginner solo | 1-2h | low | low |
| Light Personal | solo upgrade | 2-3h | modest | low/moderate |
| Medium Personal | skilled solo/duo | 3-5h | good | moderate |
| Heavy Personal | high-investment solo/duo | 5-8h | high | high |
| Stock Squad | group/social contract | 4-6h | high fixed pool | moderate/high |
| Heavy Squad | event/guild operation | 8-12h | very high fixed pool | high/public |

For economy safety, **node output is fixed and split**, not duplicated for every helper.

### Craftable thumper parts

Thumpers should be made of craftable, degrading parts:

| Part | Affects | Resource stat hooks | Degrades from |
|---|---|---|---|
| Chassis/frame | HP, slots, salvage recovery | OQ, DR/toughness | attacks, rough terrain |
| Drill head | extraction rate, max hardness | OQ, toughness, conductivity | units mined, hard nodes |
| Power core | runtime, fuel efficiency, noise | energy potential, OQ | runtime, overheating |
| Hopper/sifter | capacity, purity, waste reduction | OQ, malleability/polymers | abrasive soil, fill cycles |
| Stabilizers | failure chance, terrain tolerance | toughness, OQ | storms, heavy deployments |
| Scanner/uplink | survey accuracy, event warning | conductivity, OQ | scans, signal interference |
| Cooling system | overclock safety, long-job stability | chemicals/fluids, OQ | heat, long jobs |
| Defense hardpoints | offline defense rating | conductivity, toughness | combat events, ammo use |
| Recall/insurance module | saves parts on failure | electronics, rare resources | one-use or heavy wear |

### Degradation rules

Use predictable degradation, not surprise punishment.

- Each deployment causes normal wear.
- Bigger thumpers cause more wear and consume more fuel/maintenance.
- Bad events cause extra wear or part damage.
- Repair consumes resources and/or crafted repair kits.
- Repeated repair can reduce max condition slightly, but communicate it clearly.
- Catastrophic failure should usually return salvage, not delete everything.
- High-quality parts last longer and fail less, but still decay.

### Why this is a good economy loop

This creates multiple recurring markets:

- Survey tools and scan upgrades.
- Thumper frames/parts.
- Fuel/power cells.
- Repair kits.
- Replacement drill heads and hoppers.
- Raw resources.
- Refined materials.
- Crafted frame modules/combat gear.
- Guard/defense contracts.
- Survey reports / coordinates / intel.

### Main risk

The loop becomes self-referential: thumpers gather resources to make better thumpers to gather more resources.

Mitigations:

- Require diverse inputs across zones/resource families.
- Make thumper parts compete with player gear/modules for the same high-quality resources.
- Use finite node depletion and deployment caps.
- Add fuel/maintenance/resource sinks.
- Make public events and contracts consume resources for world progress.
- Keep early progression shallow until the economy is observable.

### Updated recommendation

Variable thumpers with craftable degrading parts are a **good fit** and may be the cleanest way to make the economy loop self-sustaining.

But launch with only:

- 2 thumper tiers.
- 4 parts.
- 3 resource stats.
- Predictable wear.
- Fixed node output.
- No full player market until the ledgers and sinks are correct.
