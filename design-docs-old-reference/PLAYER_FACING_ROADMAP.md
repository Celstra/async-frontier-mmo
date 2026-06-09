# Player-Facing Roadmap — Async Frontier MMO

> No dates. No promises. This is a long-term feature map for what the game could grow into **if the core loop is fun**.  
> The roadmap is written player-facing on purpose, but it also gives the developer a practical order for building systems slowly without losing the small details we discussed.

---

## Roadmap principle

The game should grow outward from one repeatable toy:

```text
Survey → discover resource → deploy thumper → handle extraction event
→ claim/refine resources → craft/equip modules → use/decay gear
→ survey better next time
```

Every future feature should strengthen at least one part of that loop:

- **Surveying and discovery**
- **Thumper extraction and risk**
- **Resource quality and scarcity**
- **Crafting, modules, and player identity**
- **Use, decay, repair, and replacement demand**
- **Async multiplayer cooperation**
- **World/faction progression**

If a feature does not connect back to those, it belongs later or not at all.

---

# 1. First Playable Frontier

## Player promise

Start as a frontier pilot with a frame, a scanner, and a basic thumper. Learn to read the land, extract strange resources, craft better gear, and push into harsher zones.

## Core player features

### Account and pilot identity

- Create a pilot profile.
- Choose a starting frame identity.
- See pilot stats, equipment, inventory, and activity history.
- Basic profile page other players can eventually inspect.

### Starting frames

Initial frames should be small, distinct verb packages rather than generic gear-score shells.

- **Recon**
  - Better survey clarity.
  - Extra clue on resource scans.
  - Event action: Signal Tune.
- **Engineer**
  - Better repair efficiency.
  - Lower thumper wear.
  - Event action: Field Repair.
- **Vanguard**
  - Better threat suppression.
  - Reduced thumper damage.
  - Event action: Suppress Threat.

### First region

- One starting region, such as **Red Mesa**.
- A few named resource pockets.
- Simple environmental modifiers.
- Simple threat state.
- Region screen that shows enough mystery to make scanning tempting.

### Basic survey action

- Scan a region for resource signals.
- Reveal resource family, rough quality, concentration, depth, and threat hints.
- Let players compare survey results instead of blindly clicking.
- Keep early survey UI readable: no spreadsheet wall.

### Basic thumper deployment

- Deploy a basic personal thumper on a discovered signal.
- Show expected:
  - extraction time,
  - threat level,
  - expected recovery,
  - thumper condition risk,
  - resource quality risk.
- Let players claim when the event resolves.
- Keep the first version owner-controlled: the player chooses the site, loadout, doctrine, repair/recall decisions, and how much risk to accept.

### First event choices

The first version should have only a few event actions, but they should feel meaningful:

- Tune the signal.
- Repair hull damage.
- Suppress threat.
- Clear a pump problem.
- Recall early if things look bad.

### First crafting recipes

Start with only a few recipes:

- Basic survey upgrade.
- Basic thumper drill.
- Basic pump.
- Basic hull plate.
- One frame module.

### Basic durability and repair

- Crafted modules and thumper parts have condition.
- Condition decreases only on meaningful use.
- Worn parts become less efficient before they break.
- Repair should be visible and understandable, not punitive.
- Repair kits are crafted items, not instant full restores.
- A basic Field Repair Kit should have resource-driven properties such as Condition Restored, Integrity Safety, and Field Reliability.
- Early repair UI should show expected repair range, kit match, and integrity risk before the player commits.

---

# 2. Expanding the Core Loop

## Player promise

The frontier starts feeling less like a clicker and more like a world: resources have names, quality matters, machines have parts, and every extraction tells a small story.

## Surveying and discovery expansion

### Named resources

Resources should not just be generic Copper or Crystal.

Examples:

- Veyrith Copper
- Asterion Structural Alloy
- Pale Ember Crystal
- Red Mesa Conductive Slag

Each named resource can have:

- family,
- rarity,
- quality stats,
- spawn region,
- concentration pockets,
- active lifespan,
- historical record after despawn.

### Resource stats

Start simple, then expand cautiously.

Initial stats:

- **OQ / Overall Quality** — general excellence.
- **Conductivity** — power, sensors, electronics.
- **Hardness** — drills, armor, structural strength.
- **Heat Resistance** — engines, cooling, volcanic regions.
- **Malleability** — repairs, hull shaping, stabilizers.
- **Chemical Purity** — refining, separators, contamination control.

Potential later stats:

- Shock Resistance.
- Density.
- Resonance.
- Corrosion Resistance.
- Energy Potential.

### Resource concentration gameplay

- Resources appear in uneven pockets.
- Surveying reveals better/worse concentrations.
- Better tools increase scan range and clue quality.
- Players can choose between safe mediocre deposits and risky high-quality deposits.
- Concentration affects output, but quality affects what the material is good for.

### Sampling

- Take small samples before committing a thumper.
- Samples can confirm quality ranges.
- Sampling may consume action energy or time.
- Good samples become useful for trading intel or planning group thumps.

### Survey reports and coordinates

Eventually, players can create/share/sell:

- survey reports,
- resource coordinates,
- region intel,
- danger warnings,
- recommended thumper loadouts.

This supports a **Surveyor** role without needing realtime map movement.

### Resource history

- Despawned named resources should not return exactly as they were.
- Old high-quality resources become historically valuable.
- Players can view a resource archive or discovered-resource codex.
- Items can show the historical resource they were made from.

---

## Thumper expansion

### Thumper sizes

Start with personal thumpers, then add larger rigs.

Possible progression:

1. **Field Thumper**
   - Solo/personal.
   - Low risk.
   - Low capacity.
   - Good for common resources.

2. **Improved Field Thumper**
   - Better capacity.
   - Higher part wear.
   - More event complications.

3. **Prospector Rig**
   - Longer deployment.
   - Better access to deep deposits.
   - Requires better components.

4. **Prototype Group Thumper**
   - First async multiplayer extraction test.
   - Fixed node output.
   - Helpers improve recovery efficiency and earn secondary rewards.

5. **Squad Thumper**
   - Public/private event visibility.
   - Helper roles.
   - More dangerous event table.
   - Better secondary salvage/faction rewards.

6. **Heavy Group Rig**
   - High-risk frontier operation.
   - Deeper resources.
   - Major regional/faction attention.
   - Severe wear/repair costs.

### Thumper event stats

Thumpers should eventually generate an event profile from parts instead of being simple tiers.

Event stats:

- Extraction Rate.
- Recovery Efficiency.
- Max Depth.
- Resource Integrity.
- Capacity.
- Noise / Threat Signature.
- Hull / Durability.
- Heat / Instability.
- Deployment Time.
- Recall Safety.
- Helper Capacity.
- Repairability.

### Thumper components

Do not add all of these at once. These are long-term slots for build variety.

#### Drill Head / Resonator

- Affects extraction rate, max depth, resource fracture, and noise.
- Better drills can reach deeper deposits.
- Tradeoff: louder resonance can attract threats or damage fragile resources.

#### Pump / Intake Manifold

- Affects recovery efficiency and waste chance.
- Better pumps recover more of the capped node.
- Tradeoff: poor pumps clog or waste rare material.

#### Separator / Sorter

- Affects purity, byproduct yield, contamination, and refining cost.
- Better separators preserve resource integrity.
- Tradeoff: complex separators are expensive and may jam.

#### Power Core / Engine

- Affects duration, extraction rate, heat, and support for active modules.
- Better cores support heavier builds.
- Tradeoff: heat spikes, fuel cost, and stronger threat signature.

#### Stabilizer / Anchor Legs

- Affects hazard resistance, hull damage reduction, and failure chance.
- Better stabilizers reduce earthquake/storm/impact risk.
- Tradeoff: heavy anchors slow deployment and recall.

#### Armor Plating / Hull

- Affects HP, damage resistance, and repair efficiency.
- Better hulls reduce catastrophic loss.
- Tradeoff: heavier/noisier rigs attract more danger or recall slower.

#### Cooling System

- Affects overheat chance, event duration, and forced shutdowns.
- Better cooling enables long/high-power deployments.
- Tradeoff: poor cooling causes pauses, heat damage, or extra enemy attention.

#### Sensor Suite

- Affects survey precision, event forecasting, weak-point targeting, and warning quality.
- Better sensors reveal better pre-deploy estimates.
- Tradeoff: expensive electronics can be jammed by storms or enemies.

#### Signal Beacon / Uplink

- Affects public visibility, helper slots, contribution tracking, and event discovery.
- Better beacons help group coordination.
- Tradeoff: stronger signals attract raiders, bugs, or hostile factions.

#### Cargo Bay / Containment

- Affects capacity, volatile-resource handling, and cargo loss on damage.
- Better containment preserves resources under pressure.
- Tradeoff: larger bays extend event duration or increase target value.

#### Recall System / Lift Thrusters

- Affects early recall, emergency escape, and salvage chance.
- Better recall systems make risky digs more forgiving.
- Tradeoff: costly charge/fuel use and possible failure under damage.

#### Repair Drones / Field Maintainer

- Affects passive repair, helper repair bonuses, and component wear.
- Better drones reduce downtime.
- Tradeoff: consume drone parts, batteries, or repair kits.

### Component quality rule

Every better component should create both:

- a stronger positive capability,
- and a sharper cost/risk profile.

Bad:

```text
Better drill = more output in every situation.
```

Good:

```text
High-frequency drill = faster extraction and deeper access,
but more noise and higher threat escalation.
```

---

## Thumper event expansion

### Event meters

Start with a few meters and add more only when the UI can explain them.

Initial meters:

- Extraction progress.
- Hull integrity.
- Threat level.
- Heat / instability.
- Recovery efficiency.
- Resource integrity.

Later meters:

- Noise.
- Cargo security.
- Signal strength.
- Swarm pressure.
- Weather exposure.
- Contamination.
- Recall readiness.

### Event actions

Events should work for both deploy-and-return players and players who stay live in the experience. An unattended thumper can still resolve, but active players get small text/menu mini-games that improve safety, resource integrity, salvage odds, repair efficiency, and event story. Active play should not duplicate the node's scarce output pool.

Possible async/live actions:

- Defend perimeter.
- Repair hull.
- Tune drill frequency.
- Clear pump clog.
- Cool engine.
- Scan for weak pockets.
- Haul cargo.
- Suppress swarm tunnel.
- Boost uplink.
- Stabilize anchors.
- Seal cargo rupture.
- Reroute power.
- Jam enemy scanners.
- Call for help.
- Recall early.
- Emergency abandon and salvage.

### Complications

Possible event complications:

- Bug swarm arrives.
- Burrowing creatures attack from below.
- Drill hits unstable strata.
- Pump clogs.
- Engine overheats.
- Cargo bay ruptures.
- Signal attracts raiders.
- Storm interrupts sensors.
- Enemy faction scans the beacon.
- Rare pocket is discovered mid-event.
- Volatile resource starts degrading.
- Hull drops below safe recall threshold.

### Live mini-game tradeoff rule

Every live prompt needs a real tradeoff. If one answer is always correct, it is not a decision — it is busywork.

Good live event choices should follow this shape:

```text
Do A -> improve one meter, worsen or risk another meter
Do B -> preserve safety, give up speed/output/opportunity
Do C -> gamble for upside, increase wear/threat/contamination
Do nothing / ignore -> conserve action, attention, kit charge, heat budget, or avoid escalating the event
```

Ignoring an event should not mean "I failed to click the good button." It should mean the player deliberately conserved a limited resource or avoided a bad trade.

### Live mini-game examples

Keep these as short, readable choices rather than twitch mechanics. First-pass examples:

#### Signal Drift

The signal starts drifting away from the highest-quality pocket.

| Choice | Upside | Cost / risk | Best for |
|---|---|---|---|
| Tune signal | improves Resource Integrity / keeps extraction on target | consumes action window; small sensor wear; may reduce threat response this tick | Recon / scanner builds |
| Boost signal | may reveal rare pocket or increase Recovery Efficiency | raises Noise/Threat; beacon wear; raider scan chance | high-risk/high-reward runs |
| Ignore drift | preserves action, sensor condition, and low signal profile | extraction may drift to lower purity or lose rare-pocket chance | damaged rigs, stealthy/low-risk runs |

So the decision is not "why not tune?" The decision is: do I spend my limited attention and sensor condition on cleaner extraction, or save it for heat, hull, threat, or recall problems?

#### Heat Spike

The power core is running hot.

| Choice | Upside | Cost / risk | Best for |
|---|---|---|---|
| Vent heat | lowers Heat/Instability | slows Extraction Progress; may reduce Resource Integrity for volatile materials | safe completion |
| Hold steady | no immediate cost | heat may continue rising | when extraction is almost done |
| Overdrive | faster extraction / chance to finish before threat arrives | major heat, power-core wear, possible Integrity loss | risky push runs |

#### Pump Clog

The pump is clogging with abrasive material.

| Choice | Upside | Cost / risk | Best for |
|---|---|---|---|
| Clear gently | protects Pump Condition and Resource Integrity | costs time/action; lower short-term output | rare/fragile resources |
| Force pressure | keeps Extraction Progress moving | pump wear, contamination, possible cargo loss | common resources / urgent recalls |
| Pause extraction | prevents damage escalation | loses time and may attract threat while idle | saving expensive parts |

#### Hull Damage

The rig is taking damage under pressure.

| Choice | Upside | Cost / risk | Best for |
|---|---|---|---|
| Light patch | small repair, low Integrity risk | may not be enough | stable situations |
| Standard patch | moderate repair | consumes crafted kit charge/material | normal field repair |
| Hard patch | large repair now | high kit use, flaw/Integrity risk | emergency save |
| Recall | protects components/cargo | ends extraction early | preserving gear |

#### Threat Tunnel

A hostile tunnel opens near the thumper.

| Choice | Upside | Cost / risk | Best for |
|---|---|---|---|
| Suppress | lowers Threat / protects hull | ammo/gear wear/action cost | Vanguard/combat builds |
| Fortify | reduces incoming damage | slows extraction or consumes hull materials | defensive builds |
| Distract | protects rare cargo/sensors | personal/frame wear; lower combat salvage | support/scout builds |
| Call for help | opens helper slot / social reward | stronger beacon, more noise, reward split | multiplayer events |

Each mini-game should connect to crafted gear: scanner arrays help signal tuning, cooling modules help heat choices, threat modules help combat prompts, and crafted repair kits determine how safe/effective field repairs are.

### Public combat distress board

This is the preferred first public/helper layer, but it belongs **after** the personal thumper loop works. The board is for combat events around thumpers, not for strangers making extraction or equipment-risk decisions for the owner.

Player-facing promise:

> When frontier danger erupts around a thumper, nearby pilots can answer the call, suppress threats, earn combat salvage, and help the owner get home safely.

Good board entries:

- “Burrower tunnel opening near Red Mesa thumper — suppress threat.”
- “Raider scan on public beacon — jam/distract attackers.”
- “Swarm pressure rising — defend perimeter for salvage/reputation.”
- “Cargo predator sighted — protect the rig, recover trophy parts.”

Board guardrails:

- Helpers act on threat/combat verbs: suppress, distract, fortify, scout, jam, recover salvage.
- Helpers do not choose owner actions: overdrive, push deeper, recall, abandon cargo, spend owner kits, or risk owner components.
- If nobody answers, the owner's doctrine resolves the event. The timer should not block forever waiting for public help.
- Helper rewards should lean toward combat salvage, trophy components, faction rep, cosmetics, badges, and small payouts. Do not duplicate scarce node resources per helper.

### Resolution choices

- Continue to 100% for completion bonus.
- Recall early to preserve thumper and cargo.
- Push deeper for bonus yield/integrity risk.
- Abandon cargo to save components.
- Salvage a destroyed rig.

---

# 3. Crafting, Gear, and Economy Identity

## Player promise

The best gear is not just looted. It is discovered, extracted, refined, crafted, named, used, repaired, worn down, and remembered.

## Crafting expansion

### Recipe categories

- Survey tools.
- Thumper components.
- Frame modules.
- Weapon components.
- Armor/hull plates.
- Refiner parts.
- Repair kits.
- Calibration kits.
- Consumables.
- Settlement/project materials.
- Cosmetic trophies.

### Schematics

- Recipes can accept broad resource families at first.
- Later, advanced schematics can care about specific resource stats.
- Factory/batch crafting can eventually require exact named resources.
- Schematics should clearly show which stats matter.

### Crafting allocation / experimentation

Borrow the player-facing idea from SWG: crafting should involve thought after you have the resources. Keep the first version tiny.

A crafting screen can show:

```text
1. Add named resources
2. Preview weighted item properties
3. Spend a few tuning points
4. Choose safe craft or risky experiment
5. Create item / kit / batch recipe
```

Example Field Repair Kit allocation:

```text
[++] Condition Restored
[+]  Integrity Safety
[ ]  Kit Efficiency
[ ]  Field Reliability
[ ]  Compatibility Range
```

This lets two crafters use good resources differently: one makes a big emergency patch kit, another makes a careful precision kit that protects max condition.

### Item property clarity

Avoid SWG's opacity problem.

Show players:

- what resource was used,
- which stats mattered,
- what the item is good at,
- what the tradeoff is,
- who crafted it,
- condition/durability,
- repair history or major provenance.

### Crafted item provenance

Items can display:

- crafter name,
- resource name,
- region of origin,
- batch/serial name,
- notable event source,
- faction mark,
- “made from historic resource” callout.

Example:

```text
Quiet Bore Pump Mk II
Crafted by: AsterWorks
Material: Veyrith Copper, Red Mesa Week 14
Strength: +Recovery Efficiency
Tradeoff: -Heat Stability
```

### Crafter identity

Support player brands without creating database overload.

Possible features:

- Crafter profile pages.
- Shop blurbs.
- Item maker names.
- Aggregated reputation summaries.
- Periodic “your items were used in X successful thumps” reports.
- Badges for specialization.

Avoid:

- every item use sending instant messages/events to the crafter,
- global best-crafter dominance too early,
- one account trivially mastering every recipe category.

### Specialization

Eventually encourage player economic roles:

- quiet drill specialist,
- high-recovery pump maker,
- heat-resistant engine maker,
- hull/armor fabricator,
- survey tool crafter,
- refiner,
- repair kit producer,
- faction-contract manufacturer.

Ways to support specialization later:

- local recipes,
- faction recipes,
- limited active specialties,
- workshop upgrades,
- component mastery,
- contract manufacturing,
- regional crafting bonuses.

### Refining

Raw extracted resources can become more useful through refining.

Possible refining features:

- Remove contamination.
- Split byproducts.
- Improve usability at some loss.
- Convert raw ore into ingots/plates/circuits/crystal matrices.
- Preserve or damage resource integrity depending on refiner quality.
- Use better separators/refiners for higher quality output.

### Decay, repair, and replacement

Decay should create demand, not resentment.

Possible rules:

- Durability only decreases on meaningful use.
- Better resources improve max durability.
- Repair restores condition but may have a ceiling.
- Repair kits consume resources.
- Field repairs are less efficient than workshop repairs.
- Damaged parts can become salvage instead of vanishing.
- Cosmetic/achievement items usually do not decay.

### Economic sinks

Long-term sinks that support the economy:

- Thumper part wear.
- Frame module wear.
- Repair kits.
- Calibration kits.
- Retuning thumpers for new resource targets.
- Fuel/charges for bigger rigs.
- Public settlement projects.
- Faction operations.
- Failed-event salvage losses.
- Blueprint research costs.
- High-end workshop maintenance.

---

# 4. Frames, Builds, and Player Roles

## Player promise

Your frame changes what you do in the world, not just your numbers.

## Frame expansion

### Frame design rule

Frames define verbs, efficiencies, and constraints. Crafted modules tune the frame.

Good:

```text
Recon sees clearer signals and can tune events.
Engineer repairs and stabilizes machinery.
Vanguard suppresses threats and protects rigs.
```

Bad:

```text
Frame A has +5% output, Frame B has +7% output.
```

### Possible future frames

#### Recon

- Survey clarity.
- Signal tuning.
- Hidden pocket detection.
- Threat forecasting.
- Coordinate/intel generation.

#### Engineer

- Repair actions.
- Heat control.
- Stability bonuses.
- Better field maintenance.
- Drone support.

#### Vanguard

- Threat suppression.
- Hull protection.
- Emergency response.
- Better outcomes during attacks.

#### Hauler

- Cargo security.
- Better recall/carry capacity.
- Reduced material loss.
- Logistics contracts.

#### Signalist

- Beacon boosting.
- Group event coordination.
- Contribution tracking.
- Jammer/counter-signal tools.

#### Refiner

- Better raw-material processing.
- Reduced contamination.
- Higher byproduct yield.
- Improved resource integrity preservation.

#### Field Medic / Support Frame

- Helper buffs.
- Event action recovery.
- Lower group action costs.
- Better rescue/salvage outcomes.

### Frame modules

Frame modules are the main customization layer. The frame defines base verbs; modules specialize those verbs.

Possible module categories:

- survey modules,
- defense modules,
- repair modules,
- heat modules,
- cargo modules,
- signal modules,
- refining modules,
- combat/salvage modules,
- contract modules,
- faction modules,
- cosmetic modules.

Modules should:

- be craftable,
- use named resources,
- have clear tradeoffs,
- wear down from meaningful use,
- make a player's chosen frame feel different.

#### Example module slots

**Scanner Array**

- Improves survey clarity, signal range, hidden-pocket detection, and possibly salvage identification.
- Resource hooks: Conductivity, OQ, Chemical Purity.

**Salvage Harness**

- Improves chance to recover intact components from combat/exploration events.
- Resource hooks: Malleability, Hardness, Conductivity.
- Optional augments: raider toolkits, pre-war clamps, preserved sensor claws.

**Trophy Recovery Kit**

- Improves quality tier of biological/trophy drops: mangled → chipped → intact → preserved → pristine.
- Resource hooks: Chemical Purity, Malleability, Heat Resistance.
- Optional augments: field preservative glands, cryo capsules, faction specimen kits.

**Threat Suppression Module**

- Improves defend, suppress tunnel, escort cargo, and hostile-event actions.
- Resource hooks: Hardness, Conductivity, Heat Resistance.

**Field Repair Rig**

- Improves thumper/module repair actions and emergency recovery.
- Resource hooks: Malleability, Hardness, OQ.

**Cooling / Stability Module**

- Improves heat control, overheat prevention, and stability actions.
- Resource hooks: Heat Resistance, Conductivity.

**Cargo / Recovery Module**

- Improves haul actions, cargo security, and salvage after bad recalls.
- Resource hooks: Hardness, Malleability.

**Signal / Uplink Module**

- Improves public beacon strength, helper slots, contribution tracking, and jamming/counter-signal events.
- Resource hooks: Conductivity, OQ.

### Frame module economy loop

Combat/salvage tuning should come from these crafted modules, not from abstract permanent character stats.

```text
Better resources -> better frame modules
Better frame modules -> better survey/thumper/combat outcomes
Better outcomes -> better materials/augments
Better materials/augments -> better modules and thumpers
Durability/repair -> ongoing demand
```

Example:

```text
Player wants preserved mandibles
  -> equips Trophy Recovery Kit
  -> kit was crafted from high-quality resources
  -> kit may use optional combat/salvage augments
  -> kit loses condition through event use
  -> kit can be repaired/rebuilt by crafters
```

### Frame module durability model

Use two durability layers:

```text
Condition = current health of the module
Integrity = current maximum condition / long-term structural health
```

- Condition drops from meaningful use and is normally repairable back to the current Integrity cap.
- Integrity should not decrease from every normal use.
- Integrity drops only from severe events: catastrophic damage, risky field repair, overheat/overload, using a broken item, emergency recall, failed salvage, or repeated repair after full break.
- At 0 Condition, a module becomes disabled or inefficient, not deleted.
- Frame modules should usually be repairable because they are identity gear.
- If Integrity gets very low, rebuilding/replacing becomes more efficient than repairing.

Repair should be an economy decision, not a `click kit = 100% restored` action. Crafted repair kits should have their own quality, resource provenance, tuning, and compatibility. A kit may restore a strong amount of Condition, protect Integrity, work better in the field, or specialize in certain module families — but no single cheap kit should do everything perfectly.

This keeps durability as an economy sink without making every click feel like permanent gear damage.

---


# 5. Combat, Exploration, and Salvage Layer

## Player promise

Players who do not want to be full-time crafters still have a valuable identity. They go into danger, complete combat/exploration events, bring back rare salvage, blueprint fragments, trophies, and prototype parts that crafters need to finish the best equipment.

## Design decision

We did **not** decide against combat. We decided against starting with realtime action combat or making combat the whole game.

The intended split is:

```text
Crafting = best reliable functional performance
Combat/exploration/events = rare inputs, discoveries, trophies, blueprints, reputation, and exotic modifiers
Crafters + adventurers = best finished items
```

This prevents the SWG failure mode where non-crafters feel unrewarded, while also avoiding the opposite failure mode where loot drops make crafters irrelevant.

## Roadmap placement: when combat arrives

Pushback / sequencing: full combat should **not** be part of the first production pass if the extraction-crafting loop is not fun yet. The first pass should only include combat-shaped pressure as event meters and simple choices.

Recommended order:

```text
Pass 1: Survey -> thump -> craft -> repair loop feels good
Pass 2: Live event tradeoffs make thumping interesting while active
Pass 3: Combat-focused event role becomes a clear playstyle
Pass 4: Separate patrols, hunts, bounties, ruins, and faction combat contracts
```

So yes: combat belongs clearly on the roadmap, but as the **next layer after** the core resource/crafting toy proves itself.

## First combat-like layer

The first version should be abstract and async, tied directly to thumper events. Combat is a role contribution to extraction pressure, not a separate battle simulator yet.

Examples:

- Defend a thumper perimeter.
- Suppress a swarm tunnel.
- Drive off raiders attracted by a beacon.
- Escort cargo out after a dangerous extraction.
- Stabilize a region during a faction incursion.
- Rescue/salvage a damaged rig.

This is combat as **event contribution**, not twitch combat.

### Combat-focused helper role in thumper events

A combat-focused player should be able to join a public thumper event as a defender/suppressor without being forced to care about pump math. Their choices should still involve tradeoffs.

Example combat contribution choices:

| Choice | Helps | Cost / tradeoff | Reward tendency |
|---|---|---|---|
| Hold perimeter | lowers Threat and hull damage | consumes combat gear condition; lower salvage chance | faction credit, event success |
| Hunt the source | chance to stop threat escalation | may leave thumper exposed; higher personal wear | trophy parts, biomaterials |
| Protect cargo | reduces cargo loss / contamination | less threat reduction | owner gratitude, logistics rep |
| Disable raider tech | reduces beacon jamming / scan pressure | requires salvage tools; may damage recoverable tech | tech salvage, blueprint fragments |
| Call reinforcements | opens more helper slots | raises signal/noise and splits reward pool | social/event completion |

This gives the combat player identity early without adding full combat progression too soon.

## Adventure/event rewards

Combat and exploration events should reward things crafters cannot simply manufacture from common resources.

Possible rewards:

- rare salvage,
- prototype components,
- blueprint fragments,
- faction tokens,
- monster/raider materials,
- exotic catalysts,
- trophy parts,
- cosmetic drops,
- region intel,
- damaged pre-war tech,
- special item cores,
- story/lore artifacts.

## How combat rewards feed crafting

Combat/exploration should usually provide unfinished or unstable inputs, not complete best-in-slot gear.

Examples:

```text
Swarm Queen Mandible
  -> used by crafters to make high-hardness drill heads

Raider Signal Coil
  -> used by crafters to make stealthier beacons or jammer modules

Pre-war Heat Sink
  -> used by crafters to make advanced cooling systems

Volatile Crystal Heart
  -> used by crafters to make high-output power cores with instability tradeoffs

Prototype Frame Servo
  -> used by crafters to unlock or finish advanced frame modules

```

## Optional augment rule

The safest default is to treat combat/exploration finds as **optional augment inputs**, similar in spirit to SWG crafting experimentation/optional components.

Base item crafting should usually remain possible with surveyed/refined resources alone:

```text
High-quality resource bloom
  -> determines the base item's main stat ceiling, reliability, durability, and identity

Optional combat/exploration augment
  -> adds a modifier, specialty behavior, proc, resistance, cosmetic trait, or recipe twist
```

This preserves resource discovery as the heart of the economy. A preserved monster part should not erase the value of finding a legendary Conductive Metal bloom.

### Recommended formula

```text
Final crafted item = schematic
  + crafter skill/workshop
  + named resource quality/stat fit       # primary power source
  + optional augment quality              # secondary specialization layer
  + experimentation/tuning choices
```

Resource quality should set the **base performance and durability**. Combat/exploration augments should usually affect **specialization**.

Examples:

- A great drill still needs high-Hardness resource.
- A Swarm Queen Mandible augment can add burrow-swarm bonus, fracture resistance, or threat interaction.
- A poor metal + preserved mandible should make an interesting but flawed drill, not a best-in-slot drill.
- A legendary metal + mangled mandible should still be excellent at its base job, but less exotic.
- Legendary metal + preserved mandible is the chase outcome.

## Augment quality tiers

Combat-found items can have their own condition/quality tier so combat players have progression and build tuning without replacing resource blooms.

Example tiers:

- Mangled Queen Mandible — common, low augment strength.
- Chipped Queen Mandible — uncommon, usable.
- Intact Queen Mandible — rare, strong.
- Preserved Queen Mandible — very rare, high-quality augment.
- Pristine Queen Mandible — exceptional, event-defining augment.

The quality tier can be explained fictionally:

- the part was damaged during combat,
- the player lacked the right recovery tool,
- the wrong damage type ruined it,
- the event was completed too aggressively,
- the player recalled too late,
- the region threat contaminated it.

## Required-component exception

Some advanced/exotic schematics can require a combat/exploration component, but there should usually be substitute grades.

Example:

```text
Burrow-Slicer Drill Head
Requires:
- high-Hardness metal resource
- drill schematic
- one mandible-class trophy component

Accepted trophy components:
- Mangled Queen Mandible: unlocks basic burrow bonus, low durability
- Intact Queen Mandible: stronger bonus, normal durability
- Preserved Queen Mandible: strongest bonus, extra event option
```

This lets combat matter without saying “you cannot craft a drill unless this one rare drop appears.” The base category remains craftable; the exotic variant asks for adventure inputs.

## Economy guardrails for combat augments

- Combat augments should be consumed, damaged, or bound into the crafted item when used.
- Drop supply should be budgeted by event/region, not infinitely farmed per helper.
- Group participation can improve recovery quality/chance, but should not duplicate rare augments for every participant.
- Discovery bonuses should trade off against combat/extraction efficiency.
- Rotate combat/event sources like resource blooms: different regions/events temporarily make different trophy families available.
- Avoid permanent universal best augments; each augment should be situational.
- Keep resource quality as the main determinant of base power.
- Use ledgers for every augment drop, trade, crafting consumption, and salvage event.

## Combat-player build tuning

Combat-oriented players can tune toward better recovery of special items, but with tradeoffs.

Possible tuning knobs:

- higher chance to preserve trophy components,
- better salvage identification,
- better blueprint-fragment discovery,
- less damage to recoverable parts,
- better expedition outcomes,
- better faction bounty access.

Tradeoffs:

- lower raw extraction contribution,
- higher gear wear,
- fewer defense actions,
- more action cost,
- less resource recovery efficiency.

So a combat player can become “the person who brings back preserved mandibles,” while the crafter and resource economy still matter.

## Direct combat rewards are still allowed

Combat players should sometimes get immediate excitement too.

Allowed direct rewards:

- cosmetics,
- trophies,
- badges,
- faction reputation,
- titles,
- lore unlocks,
- damaged/unfinished gear,
- temporary consumables,
- rare salvage bundles,
- prototype components.

Be careful with direct fully-functional gear. If it exists, it should usually be:

- damaged,
- unstable,
- uncalibrated,
- lower durability,
- missing a crafted finishing step,
- or strong in one weird niche rather than generally best.

## Combat event types

### Thumper defense

- Triggered by noisy/high-value extractions.
- Rewards salvage, faction reputation, biomaterials, and contribution credit.
- Feeds the thumper loop directly.

### Patrol / sweep contracts

- Clear hostile pressure in a region.
- Temporarily lowers threat or improves survey/extraction conditions.
- Rewards faction tokens, salvage, and occasional blueprint fragments.

### Incursion events

- Regional threat spikes.
- Players contribute actions over time.
- Success unlocks safer extraction windows, public project progress, or faction rewards.

### Ruin expeditions

- Exploration-focused event chain.
- Finds old-world tech, damaged components, lore, and blueprints.
- Can require crafted gear to attempt safely.

### Hunt/bounty events

- Target a dangerous creature, raider leader, or machine.
- Rewards trophy components and reputation.
- Trophy components become high-value crafting inputs.

### Salvage operations

- Recover parts from crashed ships, failed thumpers, old battlefields, or abandoned facilities.
- Rewards damaged components that refiners/crafters can restore.

## Combat progression

Combat progression should be horizontal and role-based, not just bigger damage numbers.

Possible progression:

- threat suppression efficiency,
- better event action options,
- safer recovery/salvage outcomes,
- improved faction access,
- ability to take harder contracts,
- better odds of identifying useful salvage,
- improved synergy with crafted modules.

## Relationship to frames

Frames can make the combat/adventure layer feel different:

- **Vanguard** handles defense, suppression, escort, and threat-heavy events.
- **Recon** finds hidden pockets, scouts enemy activity, and improves ambush/ruin outcomes.
- **Engineer** disables machines, salvages tech, repairs under fire, and stabilizes equipment.
- **Hauler** secures cargo during dangerous extraction or convoy events.
- **Signalist** jams enemy scans, boosts public calls, and coordinates group responses.
- **Support/Medic** improves rescue, recovery, and action efficiency in hard events.

## Guardrails

- Do not make combat drop the best finished gear by itself.
- Do not make crafting the only way to feel rewarded.
- Do not require realtime group scheduling at first.
- Do not create per-second combat simulation.
- Do not add PvP before the PvE economy and social loops work.
- Do not let combat rewards bypass resource scarcity or durability sinks.

---
# 6. Multiplayer and Social World

## Player promise

The world feels alive even when players are not online at the same time.

## Async multiplayer features

### Public thumper beacons

- Players can post public extraction events.
- Others can see danger, resource family, reward rules, time remaining, and requested help.
- Beacons create social play without requiring synchronized sessions.

### Helper roles

Helpers should do meaningful actions:

- defend,
- repair,
- tune,
- haul,
- scout,
- cool,
- stabilize,
- boost signal,
- suppress threat.

### Reward model for group thumpers

Avoid multiplying scarce resources per helper.

Recommended model:

- Node has fixed rare-resource cap.
- More contributors improve recovery efficiency.
- Helpers earn secondary rewards.
- Owner/deployer gets a reserve or contract-defined share.
- Participants earn faction, XP, salvage, biomaterials, badges, and public progress.

Possible reward buckets:

1. Primary scarce resource.
2. Secondary salvage/biomaterials.
3. Faction or contract pay.
4. Regional/public progress.
5. Participation badges or reputation.

### Reward split contracts

Later group events can support:

- owner reserve,
- equal split,
- contribution-weighted split,
- fixed helper pay,
- faction-sponsored extraction,
- guild/settlement project extraction.

### Contracts

Contracts are one of the safest ways to add multiplayer and direction.

Possible contract types:

- Deliver specific resources.
- Craft a component with minimum stats.
- Repair public infrastructure.
- Help defend a group thumper.
- Survey a region for a faction.
- Refine contaminated material.
- Haul cargo from an event.
- Contribute to settlement projects.
- Complete daily/weekly frontier requests.

### Trade and gifting

Later, once economy correctness exists:

- Player-to-player gifting.
- Resource trade.
- Item trade.
- Contract fulfillment.
- Market listings.
- Buy orders.
- Crafter shops.
- Safe trade limits and anti-dupe ledgers.

### Chat and community

Add only after the game needs it and moderation tools exist.

Possible sequence:

1. Preset helper messages/reactions.
2. Event comments.
3. Region boards.
4. Trade board.
5. Global chat.
6. Faction/guild chat.

Moderation needs:

- mute/report tools,
- admin logs,
- rate limits,
- trade-scam protections,
- chat rules.

### Leaderboards and public stats

Farm RPG-style community stats can make the world feel alive.

Possible stats:

- thumpers deployed today,
- resources extracted,
- public events completed,
- rare pockets discovered,
- regions stabilized,
- crafted items made,
- components repaired,
- faction contracts fulfilled.

Keep leaderboards limited and non-toxic early.

---

# 7. Factions, Regions, and World Progression

## Player promise

The frontier is contested. Your extractions, contracts, and public projects change what opens next.

## Regions

Regions can differ by:

- resource families,
- threat type,
- environmental hazards,
- faction presence,
- event tables,
- thumper recommendations,
- required depth/access,
- story/lore.

Possible region examples:

- Red Mesa — starter metals, heat, burrowing insects.
- Sunken Basin — chemical purity, contamination, flooded ruins.
- Glass Wastes — crystals, storms, sensor interference.
- Blackpine Expanse — organics, wildlife pressure, stealth threats.
- Orbital Debris Field — electronics, salvage, signal hazards.

## Environmental hazards

- Heat storms.
- Electrical storms.
- Quakes.
- Corrosive fog.
- Signal interference.
- Volatile strata.
- Burrowing swarms.
- Raider patrols.
- Faction lockdowns.

Hazards should interact with components:

- cooling matters in heat,
- shock resistance matters in storms,
- stabilizers matter in quakes,
- sensors matter in interference,
- hull/cargo matter against raiders.

## Factions

Factions can provide identity, goals, and controlled content expansion.

Possible faction roles:

- frontier government,
- mining guild,
- research institute,
- salvage union,
- settlement cooperative,
- hostile/raider faction,
- alien/Chosen-like threat.

Faction features:

- reputation.
- contracts.
- unlockable recipes.
- regional projects.
- cosmetic badges.
- faction shops.
- public operations.
- faction-specific thumper modifiers.

## Public projects

Public projects consume resources and give the server shared goals.

Examples:

- repair a region relay,
- build a settlement workshop,
- stabilize a dangerous zone,
- unlock a new survey tower,
- construct a faction depot,
- research a new schematic class,
- repel a regional incursion.

## World events

Possible event types:

- Chosen-style incursion.
- Bug migration.
- Rich resource bloom.
- Electrical storm season.
- Contaminated resource outbreak.
- Salvage convoy crash.
- Faction survey race.
- Global extraction challenge.
- Region defense campaign.

Events should create temporary reasons to use different components, frames, and social roles.

---

# 8. Content, Collection, and Long-Term Retention

## Player promise

There is always something small to chase: a better scan, a cleaner resource, a rare component, a public project, a badge, a crafter reputation, or a story from a dangerous thump.

## Collections and codex

- Resource archive.
- Region discovery log.
- Thumper component codex.
- Frame module collection.
- Enemy/threat codex.
- Faction lore entries.
- Event history.
- Crafted-item provenance gallery.

## Achievements and badges

Possible badges:

- first successful thump,
- perfect recall,
- saved a thumper under 5% hull,
- discovered high-quality resource,
- crafted server-notable component,
- helped 100 public thumps,
- repaired 1,000 hull damage,
- completed faction contract chain,
- contributed to regional unlock.

## Quests / Help Requests / Contracts

Farm RPG-style requests can give structure without forcing a linear story.

Possible request types:

- bring resources,
- craft parts,
- scout region,
- help public thumper,
- repair faction equipment,
- test new scanner,
- supply settlement project,
- recover salvage,
- complete event milestone.

## Daily/weekly-style activities without dates in this roadmap

Potential repeatable content:

- rotating resource spawns,
- faction requests,
- public project contributions,
- event contracts,
- market opportunities,
- region threat changes,
- limited-time cosmetic/trophy pursuits.

## Pixel art and presentation

Pixel art can support identity without requiring a full realtime world.

Possible visual layers:

- frame portraits,
- thumper rigs,
- component icons,
- resource icons,
- region cards,
- event banners,
- faction emblems,
- item rarity/provenance frames,
- simple animated extraction scenes,
- damaged/overheated thumper states.

---

# 9. Economy, Market, and Player Professions

## Player promise

Players can become known for what they do: finding, extracting, refining, crafting, repairing, hauling, trading, or organizing group operations.

## Emergent professions

- **Surveyor** — finds great deposits and sells intel.
- **Harvester** — runs thumpers and sells raw material.
- **Refiner** — improves raw resources and byproduct yield.
- **Crafter** — produces frame modules, tools, and thumper parts.
- **Repairer** — maintains components and sells repair kits.
- **Contractor** — completes faction/player jobs.
- **Adventurer** — completes combat/exploration events for salvage, trophies, and blueprint fragments.
- **Defender** — helps protect public thumpers.
- **Hauler** — secures cargo and logistics.
- **Trader** — arbitrages scarcity.
- **Organizer** — runs group thumps or faction projects.

## Marketplace features

Build carefully after ledgers and trade safety are solid.

Possible sequence:

1. NPC/faction turn-ins.
2. Direct gifting with limits.
3. Simple player trade.
4. Market listings.
5. Buy orders.
6. Crafter shops.
7. Contract manufacturing.
8. Reputation and shop discovery.

## Inflation guardrails

- Rare resource nodes have capped output.
- Group play improves recovery, not infinite duplication.
- Decay and repairs create sinks.
- Public projects consume resources.
- Bigger thumpers consume more maintenance.
- High-quality stockpiles matter but should not permanently lock out new players.
- Avoid tracking every tiny item-use event; aggregate where possible.

---

# 10. Supporter Model and Monetization, If the Game Earns It

## Player promise

The game stays ad-free. Purchases support development and community events without making non-paying players feel like second-class citizens.

## Monetization principles

Borrow the Farm RPG lesson:

- no ads,
- optional support,
- earnable premium currency if used,
- permanent convenience/QoL carefully bounded,
- cosmetics/profile identity,
- supporter badges,
- beta/alpha access for supporters only if fair,
- never monetize before the core loop creates affection.

## Possible supporter features

- Supporter badge.
- Profile cosmetics.
- Frame portrait cosmetics.
- Thumper paint jobs.
- Beacon skins.
- Extra loadout slots.
- More saved survey notes.
- More market watchlist slots.
- Nameplate/emblems.
- Cosmetic settlement decorations.
- Monthly supporter currency.
- Optional test realm access.

## Avoid

- paid-only best components,
- paid-only rare resources,
- paid PvP advantage,
- manipulative timers,
- loot boxes,
- forced purchases to repair decay,
- paid group-thumper resource multiplication.

---

# 11. Build Order Summary

This is not a date roadmap. It is the likely safest order of expansion.

## Stage A — Prove the toy

- Profile.
- One region.
- Three starting frames.
- Survey action.
- Named resources.
- Personal thumper.
- Tiny event system.
- Claim/refine resources.
- Five recipes.
- Basic durability.
- Economy ledger.

## Stage B — Make the loop legible and repeatable

- Better resource display.
- Clear item stat outcomes.
- Resource archive.
- More survey clues.
- More event complications.
- Repair kits.
- Calibration kits.
- Better thumper result screen.
- Basic contracts.

## Stage C — Add meaningful build variety

- More thumper components.
- More frame modules.
- Event meters.
- Component tradeoffs.
- Environmental hazards.
- Refining.
- Item provenance.
- Crafter identity.
- First combat/exploration reward inputs: salvage, blueprint fragments, prototype parts, and trophies.

## Stage D — Add async multiplayer

- Public thumper beacons.
- Helper actions.
- Contribution tracking.
- Secondary helper rewards.
- Prototype group thumper.
- Reward split rules.
- Public stats.
- Limited gifting/trade.

## Stage E — Add world pressure

- Factions.
- Regional combat/exploration events.
- Patrol, bounty, salvage, and ruin contracts.
- Public projects.
- Faction contracts.
- Region unlocks.
- Threat states.
- Settlement/project resource sinks.

## Stage F — Add economy depth

- Marketplace.
- Buy orders.
- Crafter shops.
- Contract manufacturing.
- Specializations.
- Advanced schematics.
- More resource families/stats.
- Historic resource economy.

## Stage G — Add long-term identity and content cadence

- Collections.
- Achievements.
- Codex.
- More regions.
- More frames.
- Cosmetic progression.
- Seasonal/world events.
- Supporter model if justified.

---

# 12. Feature Parking Lot by Loop Area

Use this as the developer checklist when deciding where a small idea belongs.

## Surveying

- Scan range.
- Signal clarity.
- Concentration percentages.
- Depth estimates.
- Threat estimates.
- Weather/environment readouts.
- Resource stat ranges.
- Sampling.
- Survey reports.
- Coordinates/intel sharing.
- Hidden pockets.
- False positives.
- Scanner interference.
- Region survey mastery.

## Resource economy

- Named resource instances.
- Rotating spawns.
- Fixed quality stats.
- Resource families/subclasses.
- Historical scarcity.
- Stockpiling.
- Resource archive.
- Byproducts.
- Contamination.
- Volatile resources.
- Refining loss.
- Resource provenance.

## Thumpers

- Personal thumper.
- Improved thumper.
- Prospector rig.
- Prototype group thumper.
- Squad thumper.
- Heavy rig.
- Deploy time.
- Capacity.
- Node cap.
- Recovery efficiency.
- Recall safety.
- Completion bonus.
- Component wear.
- Salvage on failure.
- Insurance/recall module.

## Thumper components

- Drill/resonator.
- Pump/intake manifold.
- Separator/sorter.
- Power core/engine.
- Stabilizer/anchor legs.
- Armor plating/hull.
- Cooling system.
- Sensor suite.
- Signal beacon/uplink.
- Cargo bay/containment.
- Recall system/lift thrusters.
- Repair drones/field maintainer.
- Control console.
- Fuel cells/charges.
- Calibration kits.

## Event actions

- Defend.
- Repair.
- Tune.
- Clear clog.
- Cool engine.
- Scan weak pocket.
- Haul cargo.
- Suppress tunnel.
- Boost uplink.
- Stabilize anchors.
- Reroute power.
- Jam scanners.
- Recall early.
- Emergency salvage.

## Crafting

- Recipes.
- Schematics.
- Resource-stat hooks.
- Experimentation-like tuning.
- Refining.
- Repair kits.
- Module crafting.
- Thumper-part crafting.
- Batch crafting.
- Crafter names.
- Item provenance.
- Specializations.
- Contract manufacturing.

## Gear and frames

- Frame verbs.
- Frame passives.
- Frame event actions.
- Frame modules.
- Loadouts.
- Durability.
- Repairs.
- Cosmetics.
- Role specialization.
- Support/hauler/refiner/signalist frames.

## Combat / exploration

- Thumper defense.
- Patrol/sweep contracts.
- Regional incursions.
- Ruin expeditions.
- Hunt/bounty events.
- Salvage operations.
- Rare salvage.
- Blueprint fragments.
- Prototype components.
- Trophy parts.
- Exotic catalysts.
- Mangled/intact/preserved trophy quality tiers.
- Optional augment components.
- Required exotic schematic components with substitute grades.
- Recovery-quality bonuses.
- Faction tokens.
- Damaged/unfinished gear.
- Combat-event cosmetics.
- Threat reduction.
- Escort/convoy events.
- Rescue/recovery actions.

## Multiplayer

- Public beacons.
- Helper slots.
- Contribution tracking.
- Reward split contracts.
- Owner reserve.
- Secondary rewards.
- Gifting.
- Trade.
- Market.
- Crafter shops.
- Region boards.
- Chat later.
- Moderation tools.

## World/factions

- Region threat.
- Faction reputation.
- Faction contracts.
- Public projects.
- Settlement upgrades.
- Regional unlocks.
- Invasions/incursions.
- Storms/hazards.
- Lore entries.
- Event history.

## Retention and polish

- Collections.
- Codex.
- Badges.
- Public stats.
- Activity history.
- Profile cosmetics.
- Pixel-art item icons.
- Region cards.
- Thumper condition visuals.
- Event result summaries.
- Supporter cosmetics.

---

# 13. Durability and frame-module research reference

Detailed notes: `DURABILITY_AND_FRAME_MODULE_RESEARCH.md`.

Recommended durability rule:

> Routine use causes repairable Condition loss. Severe events and risky choices can reduce Integrity/max condition. Frame modules should not be surprise-deleted.

---

# 14. Final guardrail

Do not build all of this first.

Build the smallest version of the core loop, then use this roadmap as a menu of expansions. The right next feature is the one that makes the loop more readable, more surprising, more social, or more replayable without turning the project into a full realtime MMO.
