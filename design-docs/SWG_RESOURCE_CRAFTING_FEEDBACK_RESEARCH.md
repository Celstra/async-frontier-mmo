# SWG Pre-CU Resource/Crafting Feedback Research

> Purpose: Capture the source-backed findings that informed the design-bible update so they are not lost to chat compaction. This file focuses on whether SWG Pre-CU resource/crafting should inspire the core loop, and whether variable/degrading Firefall-style thumpers strengthen or weaken that loop.

---

## 1. Executive conclusion

The available evidence does **not** support the idea that SWG Pre-CU resource/crafting was the failed part of Star Wars Galaxies.

The stronger read is:

- SWG's resource/crafting economy was one of its most remembered and praised systems.
- The system generated real player roles: surveyors, harvesters, crafters, shopkeepers, arbitrage traders, and brand/reputation builders.
- The failures around SWG were more about combat, lack of content cadence, bugs, launch expectations, and later redesigns.
- But the resource/crafting model has serious pitfalls if copied wholesale: opacity, complexity, market domination, low loot excitement, lack of content for non-crafters, and database/event-volume risks.

Recommendation:

> Use SWG as the **economy substrate**, Firefall thumpers as the **extraction-event layer**, and Farm RPG as the **scope/growth discipline**.

---

## 2. Sources consulted / captured

### Directly readable sources

- Raph Koster — **Designing a Living Society in SWG, part one**  
  https://www.raphkoster.com/2015/04/21/designing-a-living-society-in-swg-part-one/

- Raph Koster — **Designing a Living Society in SWG, part two**  
  https://www.raphkoster.com/2015/04/22/designing-a-living-society-in-swg-part-two/

- Raph Koster — **Did Star Wars Galaxies Fail?**  
  https://www.raphkoster.com/2015/04/27/did-star-wars-galaxies-fail/

- Firefall Archive — **Thumper**  
  https://firefall-archive.fandom.com/wiki/Thumper

- Firefall Archive — **Thumping**  
  https://firefall-archive.fandom.com/wiki/Thumping

- Firefall Archive — **Scan Hammer**  
  https://firefall-archive.fandom.com/wiki/Scan_Hammer

- Firefall Archive — **Resource Thumping Guide**  
  https://firefall-archive.fandom.com/wiki/Resource_Thumping_Guide

- Firefall Archive — **Resource Collection**  
  https://firefall-archive.fandom.com/wiki/Resource_Collection

### Search-result/forum snippet sources

These were visible as search snippets but the original forum pages were blocked/login-gated in the tool environment:

- SWGEmu archive snippet — **End of Summer Update**  
  `archive.swgemu.com/forums/showthread.php?p=729126`  
  Snippet: SWG still had “the best crafting system in any MMO.”

- SWGEmu forum snippet — **New Play-Test Server Survey Results**  
  `swgemu.com/forums/showthread.php?p=1681805`  
  Snippet discusses best resources, ADKs, tapes, and **consistently** crafting the best stuff.

### Access limitations

- Reddit blocked unauthenticated scraping/API calls from this environment.
- Several SWGEmu forum pages returned 403 or login/permission pages.
- Therefore, the strongest direct evidence in this pass is from Raph Koster's directly readable postmortem and comment threads, plus search-result snippets from SWGEmu.

---

## 3. Positive feedback / why the system is worth adapting

### 3.1 Players praised the depth of crafting/resource quality

A former player/commenter on Koster's **Did Star Wars Galaxies Fail?** post wrote that:

- The crafting/resource system was “fantastic.”
- SWG was the only MMO they knew that required “actual thinking while crafting.”
- Mastering a profession, setting up a shop, hunting server-best resources, finding experimentation tapes, and producing top-level items was enough for years of play.

Design implication:

> Resource quality created expertise. Players could become known for mastery, not just level/gear score.

### 3.2 The economy created real weak-tie interdependence

Koster describes SWG as built around **weak-tie interdependence**: players you do not know personally are still crucial to the world and economy.

Design implication:

> The game felt like a society because combatants, crafters, entertainers, doctors, harvesters, merchants, and city/shop owners all mattered.

For this project, the equivalent is:

```text
Surveyor finds signal
  -> Thumper operator extracts
  -> Refiner improves material
  -> Crafter makes parts/modules
  -> Combat/explorer player uses and degrades them
  -> Demand returns to the economy
```

### 3.3 Offline/async harvesting supported short sessions

Koster says mission terminals, offline crafting, and harvesting were intentionally designed to make SWG accessible in shorter sessions, while still producing high weekly/monthly stickiness.

Design implication:

> This maps extremely well to a Farm RPG-style async MMO. Players can do meaningful actions without needing real-time group scheduling every session.

### 3.4 Named resources created history and markets

Koster describes players discovering great minerals, mining them, hoarding them, trickling them onto the market, and arbitraging scarcity.

Design implication:

> A resource is not just “Copper.” It is “Veyrith Copper, week 14, Red Mesa, CD 936.” That gives the economy memory.

### 3.5 Crafting created brand identity

Koster notes that SWG's system traded away loot-drop Excalibur for player-made brands and named models.

Design implication:

> Let players/crafters leave identity on objects, but do not remove all loot excitement.

---

## 4. Negative feedback / risks to avoid

### 4.1 Players resisted no-loot expectations

Koster says players “kicked pretty hard against no loot.” MMO/CRPG players expected recognizable rewards from enemies and shared stories around obtaining rare drops.

Risk:

> A pure crafted-only economy can feel sterile or unrewarding to players who want treasure, trophies, rare drops, and visible prestige.

Mitigation:

- Keep crafting as the best source of functional gear.
- Still include non-economy-breaking loot:
  - cosmetics
  - relics
  - blueprints
  - lore items
  - rare salvage
  - unique skins
  - named discovery badges
  - trophy components used by crafters

### 4.2 Item quality was too opaque

Koster notes that a plain crafted pistol might be better than an impressive weapon, and players could not tell well at a glance.

Risk:

> If item quality is hidden behind spreadsheets, most players disengage.

Mitigation:

- Use readable item cards.
- Show relevant stat contributions.
- Add quality bands/grades.
- Show item provenance:
  - made by X
  - using Y resource
  - from Z deposit/week
- Give crafted parts visible identities.

### 4.3 Full-time crafting is not for everyone

The same player who praised crafting said the big early problem was lack of content, and “full time crafting isn’t for everyone.”

Risk:

> A resource/crafting economy cannot be the only fun. It needs adventure, contracts, world events, discovery, story, and combat/defense abstractions.

Mitigation:

- Use thumpers to turn resource gathering into events.
- Add contracts and regional threats.
- Let non-crafters generate demand and earn rewards.

### 4.4 Combat/content problems overshadowed good economy

Koster says many social systems were cheap and memorable, but many players were right that the core combat game did not work well enough.

Risk:

> A beautiful economy cannot save a boring action loop.

Mitigation:

- The MVP must test if surveying/thumping/crafting/decay is fun before building the full economy.
- Add danger/events around thumpers early, even if abstracted.

### 4.5 Database/event-volume trap

Koster describes an intended system where crafters would earn XP when others used their products. It was cut because having every object send messages back to its maker on use would make the database “fall over and die.”

Risk:

> A learning project can drown in per-item telemetry if every use creates too many writes/events.

Mitigation:

- Use inventory/economy ledgers for correctness.
- Aggregate crafter reputation asynchronously.
- Batch usage summaries daily/hourly.
- Track item lineage only where useful.
- Avoid per-use notifications to makers.

### 4.6 High-end crafter dominance

Koster says they failed to limit recipe knowledge enough, so high-level crafters owned markets for components and cheaper items. Limiting known recipes was discussed but not shipped.

Risk:

> If one account can craft everything, specialization dies and lower-level markets vanish.

Mitigation:

- Limit active recipes/specializations.
- Require tooling/stations by specialty.
- Make some recipes local/faction/planetary.
- Encourage component specialists.
- Add contract manufacturing instead of universal crafting.

### 4.7 Not enough high-end economic sinks

Koster says they should probably have made harvesters need to be rebuilt or remade when changing resource targets, because high-end businesses lacked enough sinks.

Risk:

> Wealthy players hoard resources and then exit the sink loop, destabilizing the economy.

Mitigation:

- Thumper parts degrade.
- Thumper retuning/changing targets costs parts or calibration kits.
- Higher-tier thumpers consume more maintenance/fuel.
- Public/world events consume resources.
- Repairs consume crafted repair kits.

---

## 5. Firefall thumpers: fit and adaptation

Firefall's thumping loop:

1. Use scan hammer to locate resource concentrations.
2. Deploy thumper.
3. Thumper extracts while attracting enemies.
4. Players defend it.
5. Larger thumpers produce more but are more dangerous.
6. If destroyed, the thumper can be lost.
7. Extraction creates a dramatic event rather than pure passive gathering.

This fits the project because it solves one SWG risk:

> SWG harvesting can become too passive/spreadsheet-heavy. Firefall-style thumpers add risk, event hooks, social defense, and parts degradation.

Recommended adaptation:

```text
SWG-like resource substrate:
  named resources + quality stats + survey concentration + shifting deposits

Firefall-like extraction layer:
  thumper size + duration + capacity + danger + part wear

Farm RPG-like scope:
  simple async actions, server-authoritative outcomes, tiny loop first
```

---

## 6. Variable thumper tiers

Do not copy Firefall's capacity numbers directly. Use conservative tiers.

| Tier | Role | Duration | Output | Risk |
|---|---|---:|---:|---:|
| Stock Personal | beginner solo | 1-2h | low | low |
| Light Personal | solo upgrade | 2-3h | modest | low/moderate |
| Medium Personal | skilled solo/duo | 3-5h | good | moderate |
| Heavy Personal | high-investment solo/duo | 5-8h | high | high |
| Stock Squad | group/social contract | 4-6h | high fixed pool | moderate/high |
| Heavy Squad | event/guild operation | 8-12h | very high fixed pool | high/public |

Economy safety rule:

> Node output is fixed and split. Do not duplicate full payouts for every helper.

Helpers can instead receive:

- contract pay
- faction
- XP
- common salvage
- defense badges
- small bonus materials from separate reward pools

---

## 7. Craftable degrading thumper parts

This is likely the cleanest economy loop.

| Part | Affects | Resource stat hooks | Degrades from |
|---|---|---|---|
| Chassis/frame | HP, slots, salvage recovery | OQ, DR/toughness | attacks, terrain |
| Drill head | extraction rate, max hardness | OQ, toughness, conductivity | units mined, hard nodes |
| Power core | runtime, fuel efficiency, noise | energy potential, OQ | runtime, overheating |
| Hopper/sifter | capacity, purity, waste reduction | OQ, polymers/malleability | abrasive soil, fill cycles |
| Stabilizers | failure chance, terrain tolerance | toughness, OQ | storms, heavy deployments |
| Scanner/uplink | survey accuracy, warnings | conductivity, OQ | scans, interference |
| Cooling system | overclock safety, long-job stability | chemicals/fluids, OQ | heat, long jobs |
| Defense hardpoints | offline defense rating | conductivity, toughness | combat events, ammo use |
| Recall/insurance module | saves parts on failure | electronics, rare resources | one-use/heavy wear |

Degradation rules:

- Normal wear per deployment.
- Extra wear from attacks/failures.
- Bigger thumpers = more wear and fuel cost.
- Repair consumes materials/repair kits.
- Repeated repair can reduce max condition slightly.
- Catastrophic failure returns salvage instead of deleting everything most of the time.
- High-quality resources make parts last longer and fail less, but they still decay.

---

## 8. Economy loop created by degrading thumpers

Recurring demand sources:

- Survey tools
- Scanner upgrades
- Thumper frames
- Drill heads
- Power cores
- Hoppers
- Stabilizers
- Cooling systems
- Fuel/power cells
- Repair kits
- Raw resources
- Refined materials
- Crafted frame modules
- Defense contracts
- Survey reports/coordinates/intel

This creates a loop:

```text
Resources make thumper parts
  -> thumper parts extract resources
  -> extraction wears parts
  -> worn parts require repair/replacement
  -> better resources make better parts
  -> better parts open harder/richer nodes
```

The main danger is self-reference/inflation.

Mitigations:

- Require diverse resource families.
- Make thumper parts compete with player gear for premium resources.
- Use finite node depletion.
- Cap active deployments.
- Add fuel/maintenance sinks.
- Make public events consume resources.
- Add decay but make it predictable.

---

## 9. MVP recommendation

Start very small:

- 1 planet
- 3 zones
- 3 resource stats: OQ, DR/toughness, conductivity/energy
- 2 thumper tiers:
  - Stock Personal
  - Light Personal
- 4 parts:
  - frame
  - drill head
  - power core
  - hopper
- 1 survey tool
- 1 repair kit
- 5 crafting recipes
- no full player market yet
- ledger every economy mutation

MVP design question:

> Is it fun to survey a zone, find a named resource signal, deploy a thumper, claim material, craft a better part, and watch that part wear down over future deployments?

If yes, scale up.

If no, do not add more complexity.

---

## 10. Final verdict

SWG Pre-CU resource/crafting is **not a failed system to avoid**. It is a powerful system that needs modernization and simplification.

The best project fit is:

- **Farm RPG** for gradual scope and async UX.
- **SWG Pre-CU** for named rotating resource economy.
- **Firefall** for thumper fantasy, risk, and extraction events.

Variable thumpers with degrading craftable parts are a good fit because they turn the resource economy into a self-sustaining loop, but they must launch small and be tested before a full market is added.
