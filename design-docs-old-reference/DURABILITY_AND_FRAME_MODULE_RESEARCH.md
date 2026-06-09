# Durability + Frame Module Research Notes

> Purpose: Decide how frame module customization, combat/salvage tuning, repair, durability, max durability, and gear loss should work in the async frontier MMO without making players hate the economy sink.

---

## 1. Design question

Ryan raised several connected concerns:

- Combat/exploration build tuning should depend on **crafted frame components/modules**, not an abstract character stat.
- Frame modules should slot into the same crafting economy as scanners, thumpers, and regional resource hunting.
- Combat-oriented players could use frame customization to improve salvage quality or the chance of finding intact/preserved adventure components.
- Durability needs to support the economy, but players often hate durability and gear loss.
- We need to decide whether items should always be repairable, and whether max durability should decrease over time.

---

## 2. Sources / examples checked

### Existing project research

- `DESIGN_BIBLE.md`
  - Already includes crafted frame modules, thumper parts, durability/decay, and the crafted-best vs combat/exploration guardrail.
- `PLAYER_FACING_ROADMAP.md`
  - Already includes frame modules, module categories, combat/exploration salvage, optional augment inputs, and durability.
- `SWG_RESOURCE_CRAFTING_FEEDBACK_RESEARCH.md`
  - Captures the reason decay matters for a player economy, while warning about complexity and player frustration.
- `FIREFALL_FAILURE_AND_THUMPER_COMPONENT_RESEARCH.md`
  - Captures thumper components, component wear, catastrophic loss risk, and the need to make risk visible.

### External mechanics / player sentiment examples

- **The Legend of Zelda: Breath of the Wild** — Wikipedia reception section notes criticism focused on weapon durability. This is a useful cautionary example: even a beloved game can receive durability criticism when weapons break often and players feel discouraged from using items they like.
  - https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Breath_of_the_Wild

- **Old School RuneScape Barrows equipment** — OSRS Wiki documents a more accepted MMO-style degradation model: Barrows gear has 15 hours of in-combat use, does not lose performance as it degrades, becomes unusable at 0, and can be repaired; repair cost scales with degradation.
  - https://oldschool.runescape.wiki/w/Barrows_equipment

- **Guild Wars 2 defeated/downed flow** — GW2 Wiki shows a modern soft-death pattern: open-world defeat sends players to waypoints/revive flow rather than taking their gear. This is a useful counterexample where the penalty is interruption and positioning, not item loss.
  - https://wiki.guildwars2.com/wiki/Defeated

- **EVE Online** — Wikipedia documents EVE as a complex MMO with player professions including mining, manufacturing, trading, exploration, and combat, and a shared world famous for player interaction. EVE-style destruction works because the whole game is built around risk, replacement, player production, and PvP loss. That does not mean casual async players will accept similar loss by default.
  - https://en.wikipedia.org/wiki/Eve_Online

---

## 3. What players usually hate about durability

Players tend to hate durability when it does one or more of these:

1. **Deletes beloved gear with little warning**
   - Feels like losing identity, not paying a maintenance cost.

2. **Punishes ordinary play too often**
   - If using the cool item means losing it, players hoard it or avoid fun.

3. **Interrupts the fun loop at bad times**
   - “Stop adventuring and go repair” is friction if it happens too frequently.

4. **Feels like a tax with no interesting decision**
   - Pure gold repair bills are tolerated in some MMOs, but rarely loved.

5. **Obscures what will happen**
   - Hidden breakpoints, surprise deletion, or unclear repair outcomes create distrust.

6. **Invalidates rare drops or crafts too quickly**
   - If a hard-earned item disappears before the player forms attachment, the system feels hostile.

7. **Creates no upside for other players**
   - Durability is more accepted when it feeds crafters, repairers, salvagers, traders, and event organizers instead of just draining coins.

---

## 4. What players are more likely to accept

Durability is more acceptable when it is:

- visible,
- predictable,
- repairable,
- tied to meaningful use,
- slow enough to form attachment,
- part of a player economy,
- avoidable/mitigable through skill or preparation,
- attached to risky actions rather than passive time,
- a source of decisions, not just punishment.

OSRS Barrows is a useful model: the item degrades through combat use, has clear stages, does not gradually lose stats before 0, becomes unusable when fully degraded, and is repairable with a cost based on degradation.

---

## 5. Recommended durability model

Use a two-layer model:

```text
Condition = current health of the item/module
Integrity = current maximum condition / long-term structural health
```

### Condition

Condition is the normal durability meter.

- Drops from meaningful use.
- Drops from thumper events, combat events, repairs, scanning, hauling, and field actions.
- Can usually be repaired back to the current Integrity cap.
- At 0, the item becomes disabled or severely inefficient, not deleted.

### Integrity

Integrity is the long-term wear ceiling.

- Should **not** decrease from every normal use.
- Drops only from severe events:
  - catastrophic thumper damage,
  - emergency recall,
  - using an item while broken,
  - risky field repair,
  - overheat/overload complications,
  - failed salvage,
  - repeated repair after full break,
  - optional “push beyond safe limits” choices.
- Can be restored by expensive overhaul, replacement subcomponent, or partial rebuild.
- Full restoration may require matching resource families, repair kits, or original/compatible resources.

### Why this works

This creates regular maintenance demand without making players feel that every click permanently ruins their gear.

```text
Normal play -> condition loss -> routine repair sink
Risky play / failure -> integrity loss -> deeper repair/rebuild sink
Extreme failure -> salvage/rebuild decision
```

Important correction: repair is not `pop a kit and restore to 100%`. Repair kits are crafted items with quality, resource provenance, tuning, and compatibility. They restore a range of Condition and may protect against Integrity loss depending on kit properties and repair context.

---

## 6. Should items always be repairable?

Recommended answer:

> Most player-owned crafted gear and frame modules should be repairable, but not always cheaply or perfectly.

### For frame modules

Frame modules are identity gear. Be gentler.

- Always repairable from broken to usable.
- Routine repairs restore Condition to current Integrity.
- Severe damage can reduce Integrity.
- Expensive overhaul can restore some or all Integrity.
- If Integrity gets very low, rebuilding/replacing becomes more efficient than repairing.
- Do not surprise-delete frame modules.

### For thumper components

Thumper components can be harsher because thumpers are the risk-taking extraction layer.

- Usually repairable.
- Can suffer Integrity loss from bad events.
- Can be partially salvaged if destroyed.
- Catastrophic total loss should be rare, visible, and tied to explicit risk.
- Insurance/recall modules can reduce loss.

### Crafted repair kit model

Repair kits should follow the same resource-quality logic as other crafted items.

Example properties:

| Property | What it affects | Resource hooks |
|---|---|---|
| Condition Restored | repair amount | Malleability, OQ, Chemical Purity |
| Integrity Safety | avoids max-condition damage | Malleability, Hardness, OQ |
| Field Reliability | works during active events / heat / pressure | Heat Resistance, Conductivity, OQ |
| Compatibility Range | works across module families | Chemical Purity, Malleability, OQ |

Repair contexts:

- **Workshop repair**: safer, better preview, lower Integrity risk, can use station/crafter bonuses.
- **Field repair**: faster, usable during active thumper events, consumes kits under pressure, higher Integrity/flaw risk.
- **Emergency bypass**: may save the event but can create temporary flaws or Integrity damage.

A good repair screen should show:

```text
Expected repair: +18-25 Condition
Integrity risk: Low
Kit match: Good
Context: Field / under heat pressure
```

### For combat/exploration augments

Augments/trophy parts should often be consumed into crafted items.

- Mangled/intact/preserved items can be consumed during crafting.
- If an augmented item breaks, the augment may be recoverable at reduced quality depending on salvage tools.
- This creates demand without making base crafting impossible.

---

## 7. Frame module customization model

Frame modules should be the way players tune toward survey, thumper, combat, salvage, and support roles.

The frame defines base verbs. Modules specialize those verbs.

```text
Frame = action identity
Module = crafted specialization
Resource quality = base power/durability
Combat/salvage augment = specialty modifier
Durability = economy sink and risk memory
```

### Example frame module slots

#### Scanner Array

- Improves survey clarity, signal range, and hidden-pocket detection.
- Resource hooks: Conductivity, Overall Quality, Chemical Purity.
- Combat/salvage tie-in: better identification of recoverable tech during ruins/salvage events.

#### Salvage Harness

- Improves chance to recover intact components from combat/exploration events.
- Resource hooks: Malleability, Hardness, Conductivity.
- Optional augment: raider toolkits, pre-war clamps, preserved sensor claws.

#### Trophy Recovery Kit

- Improves quality tier of biological/trophy drops.
- Resource hooks: Chemical Purity, Malleability, Heat Resistance.
- Optional augment: field preservative glands, cryo capsules, faction specimen kits.

#### Threat Suppression Module

- Improves combat/event actions such as suppress tunnel, defend perimeter, escort cargo.
- Resource hooks: Hardness, Conductivity, Heat Resistance.
- Optional augment: swarm mandibles, raider targeting coils, faction ammo cores.

#### Field Repair Rig

- Improves thumper/module repair actions.
- Resource hooks: Malleability, Hardness, OQ.
- Optional augment: repair drone cores, recovered maintenance arms.

#### Cooling / Stability Module

- Improves heat control and overheat prevention.
- Resource hooks: Heat Resistance, Conductivity.
- Optional augment: pre-war heat sinks, volatile crystal regulators.

#### Cargo / Recovery Module

- Improves haul actions, cargo security, and salvage after bad recalls.
- Resource hooks: Hardness, Malleability, Density if added later.
- Optional augment: intact cargo seals, raider lockboxes, recall thruster parts.

#### Signal / Uplink Module

- Improves public beacon strength, helper slots, contribution tracking, and jamming/counter-signal events.
- Resource hooks: Conductivity, OQ, Shock Resistance if added later.
- Optional augment: raider signal coils, storm crystals, faction comm relays.

---

## 8. Combat/salvage tuning should come from modules

Do not give players an abstract “+salvage chance” stat detached from the economy.

Instead:

```text
Player wants preserved mandibles
  -> equips Trophy Recovery Kit
  -> kit was crafted from high-quality resources
  -> kit may use optional combat/salvage augments
  -> kit loses condition through event use
  -> kit can be repaired/rebuilt by crafters
```

This creates a complete economy loop:

```text
Better resources -> better frame modules
Better frame modules -> better survey/thumper/combat outcomes
Better outcomes -> better materials/augments
Better materials/augments -> better modules and thumpers
Durability/repair -> ongoing demand
```

---

## 9. Preserving resource bloom importance

Combat-found items should not negate resource quality.

Recommended stat ownership:

| Source | Should control |
|---|---|
| Named resource quality | base power, durability, reliability, stat ceiling |
| Crafter skill/workshop | consistency, experimentation/tuning, final polish |
| Frame module slot | what kind of action is improved |
| Combat/exploration augment | special modifier, quality-tier bonus, exotic behavior |
| Event performance | chance to preserve/recover high-tier augment |

Example:

```text
Preserved Queen Mandible does not make a bad drill great.
It makes a great drill special against burrowing threats.
```

---

## 10. Economy/inflation guardrails for salvage quality

- Trophy/augment drops should be event-budgeted, not duplicated per helper.
- Group play can improve preservation chance, not create infinite pristine parts.
- Salvage-quality builds should trade off against defense, extraction, or survey output.
- Combat events should rotate like resource blooms: different regions/events expose different trophy families.
- Augments should usually be consumed into crafted items or degraded through salvage/recovery.
- High-tier augment recovery should require preparation, correct module loadout, and good event outcome.
- Do not let every player farm the same best trophy forever.

---

## 11. Final recommendation

Add frame module upgrades explicitly as the customization layer that controls survey, thumper, combat, salvage, and support specialization.

For durability:

> Use repairable Condition for normal wear, reserve max-durability/Integrity loss for severe events and risky choices, and avoid surprise permanent gear loss for frame modules.

This gives the economy a sink without recreating the parts of durability systems players usually hate.
