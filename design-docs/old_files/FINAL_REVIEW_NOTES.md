# Final Review Notes — MVP Document Pass

Review date: 2026-06-09.

## What changed

- Removed upload suffixes like `(11)` and `(13)` from filenames.
- Put MVP design/build documents at the package root.
- Moved research documents into `research/`.
- Moved the old `PLAYER_FACING_ROADMAP.md` duplicate into `legacy/PLAYER_FACING_ROADMAP_LEGACY_ALIAS.md` so it no longer appears to be a current public promise.
- Added `MVP_SCOPE_REFERENCE.md` as the quick design-around-MVP sheet.

## MVP discrepancies corrected

1. **Decision 015 wording normalized.**
   - Changed ambiguous wording from “Decisions 001–014 define the MVP” to “Decisions 001–014 define MVP content; Decision 015 freezes scope and defines completion” where clarity mattered.
   - Synced `DECISION_LOG.md` Decision 015 with the fuller canonical wording in `DESIGN_BIBLE.md`.

2. **Research docs now defer older candidate MVPs.**
   - Added a review note to each research file: the Design Bible and Decision Log override older candidate wording.

3. **Firefall thumper research aligned to the locked MVP.**
   - Corrected the research candidate from five MVP thumper slots to the locked three: Drill, Pump, Hull.
   - Corrected old event-meter/resource-stat recommendations to the locked MVP visible run state and five MVP stats.
   - Demoted Power Core, Sensor/Beacon, Separator, Cooling, Cargo Bay, Recall System, Repair Drones, Fuel Cells, and Calibration Kits to deferred component slots.

4. **Group thumpers demoted out of MVP.**
   - Clarified that the MVP has one basic personal thumper only.
   - Renamed the old “MVP group thumper test” section to a post-MVP test.

5. **Repair/crafting research aligned to MVP crafting.**
   - Marked Chemical Purity, sealants, compatibility range, Precision Repair Kits, Calibration Kits, and Overhaul Kits as future/deferred systems.
   - Added the locked MVP Field Repair Kit substitution formulas using only OQ, Conductivity, Hardness, Heat Resistance, and Malleability.
   - Demoted Risky Experiment and larger tuning-point counts to post-MVP; MVP remains exactly 3 tuning points with Safe Craft / Careful Experiment.

6. **Active event recommendations aligned.**
   - Replaced the older three-prompt “Signal Drift / Heat Spike / Hull Damage” MVP suggestion with the locked four complication/action pairs: Signal Drift / Signal Tune, Hull Damage / Field Repair, Threat Surge / Suppress Threat, Pump Strain / Clear Pump Problem.

7. **SWG resource/crafting MVP recommendation aligned.**
   - Replaced an older “1 planet, 3 zones, 3 stats, 2 thumper tiers, 4 parts” MVP candidate with the locked Red Mesa MVP: one region, six named resources, five stats, one basic personal thumper, three slots, four actions, five recipes, no marketplace, no group thumpers, no mandatory refining, and no Chemical Purity.

8. **Tech plan review note added.**
   - Kept the web-first, server-authoritative modular monolith recommendation.
   - Added a pricing caution that current provider prices/free tiers must be rechecked before spending and that the MVP architecture should not rely on promotional allowances.

## Remaining intentional non-MVP material

The research and backlog still contain post-MVP ideas such as refining, separators, group thumpers, public helper boards, marketplaces, Chemical Purity, expanded modules, live mini-games, factories, contracts, and broader MMO systems. These are intentionally preserved as future candidates, but they are not MVP scope unless a future scope-change review explicitly promotes them.

## Final MVP check

No top-level MVP document now requires any of the following for the MVP: marketplace, chat, guilds, group thumpers, public helper boards, multiple regions, mandatory refining, Chemical Purity, separators, factories, batch crafting, weapons, armor suits, PvP, realtime combat, monetization, mobile wrapper, or broad MMO infrastructure.
