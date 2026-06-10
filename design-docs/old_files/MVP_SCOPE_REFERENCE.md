# MVP Scope Reference — Async Frontier MMO

> Final review pass: 2026-06-09. This is the quick design-around-MVP reference. The canonical details remain in `DESIGN_BIBLE.md` and `DECISION_LOG.md`.

## Core MVP question

> Is it fun to survey Red Mesa, discover named resource signals, deploy a personal thumper, make a few event choices, recover resources, craft better parts/modules, and repeat while gear wears down fairly?

## Core toy

```text
survey → thump → claim → think-craft → equip/use → wear/repair → survey better
```

## Locked MVP content

- **Region:** Red Mesa only.
- **Frames:** Recon, Engineer, Vanguard.
- **Resource families:** Conductive Metal, Structural Alloy, Reactive Crystal.
- **Named resources:** Keth Iron, Red Mesa Conductive Slag, Asterion Frame Alloy, Pale Ember Crystal, Veyrith Copper, Thornwake Crystal.
- **Resource stats:** OQ, Conductivity, Hardness, Heat Resistance, Malleability.
- **Thumper:** one basic personal thumper.
- **Thumper slots:** Drill, Pump, Hull.
- **Event actions:** Signal Tune, Field Repair, Suppress Threat, Clear Pump Problem.
- **Complications:** Signal Drift, Hull Damage, Threat Surge, Pump Strain.
- **Universal safety choice:** Recall Early. This is not one of the four event actions.
- **Craftable outputs:** Basic Drill Head, Efficient Pump, Reinforced Hull Plate, Survey Scanner Module Mk I, Field Repair Kit.
- **Crafting interaction:** named-resource slot choice, weighted property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, result explanation.
- **Durability:** Condition + Integrity, with crafted Field Repair Kits.
- **Audit spine:** Pilot, Resource Instance, Resource Stack, Item, Schematic Definition, Crafting Attempt, Thumper Run, Thumper Event Window, Thumper Run Result, Repair Action, Economy Ledger.

## First-session path

```text
choose frame
→ survey Red Mesa
→ compare Keth Iron / Veyrith Copper / Thornwake Crystal
→ deploy on the recommended Veyrith Copper signal
→ resolve Signal Drift and Pump Strain
→ claim enough Veyrith Copper for one Survey Scanner Module Mk I
→ craft through named-resource slots, property preview, 3 tuning points, and Safe Craft / Careful Experiment
→ equip the scanner
→ survey again and see clearer information
```

## MVP screens

1. Pilot Home.
2. Red Mesa Survey.
3. Signal Detail / Deploy Thumper.
4. Thumper Run / Event Window.
5. Claim Results.
6. Crafting + Gear / Repair.

## Explicitly out of MVP

Marketplace, player-to-player trade, chat, guilds, settlements, public helper boards, group thumpers, contracts, multiple regions, advanced refining, Chemical Purity, separators, factories, batch crafting, weapons, armor suits, PvP, realtime combat, monetization, mobile app wrapper, broad MMO infrastructure, and a large content pipeline.

## Scope-change rule

New ideas do not enter MVP scope unless they fix a contradiction, unblock the prototype ladder, improve comprehension of the locked toy, protect resource/crafting/economy trust, or are required for playtest evidence. Otherwise, put them in `LAYERED_FEATURE_BACKLOG.md`.

## Implementation order

1. Paper / spreadsheet economy prototype.
2. Text-only loop prototype.
3. Clickable single-player vertical slice.
4. Instrumented playtest build.
5. Presentation pass.
6. Production-point review.
