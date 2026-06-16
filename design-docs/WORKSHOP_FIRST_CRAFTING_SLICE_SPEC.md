# Workshop-First Crafting Slice Spec

Companion spec for Decision 024. Active playtest target as of 2026-06-16.

Implementation execution plan: `WORKSHOP_FIRST_IMPLEMENTATION_PLAN.md`.

## 1. Purpose

The next playtest starts in the workshop and asks one focused question:

```text
Is it fun to compare imperfect named resources, choose schematic slots, experiment, craft thumper parts, and chase the best result possible from the bench stock?
```

The slice exists because crafting is the intended "wow" pillar, but previous funnels buried it behind field, settlement, thumper, and tutorial systems. This playtest should make the crafting toy visible first.

## 2. Active Scope

Player-facing scope:

- **WORKSHOP** is the first and primary screen.
- **FIELD**, **RIG**, and **SETTLEMENT** remain visible in navigation, but each shows an **In Development** state.
- The player receives three thumper-part schematics:
  - **Basic Drill Head**
  - **Efficient Pump**
  - **Reinforced Hull Plate**
- The player receives enough starter resources to craft and compare multiple attempts for each schematic.
- The playtest loop is craft, compare, reclaim/sell old results, receive more imperfect materials, and craft again.

Non-goals:

- No survey or field map.
- No thumper deployment.
- No settlement orders or turn-ins.
- No rig equip/use loop beyond possible item preview.
- No marketplace, trade, refining, factories, combat, or multiplayer.
- No best-in-slot starter grant.

## 3. Starting Inventory

The starter grant is **workshop bench stock**, not the live Red Mesa bloom. It may use familiar family names, but it must not grant live-bloom unicorn values such as Veyrith-tier Conductivity.

Grant:

- 3 named **Structural Alloy** resources.
- 3 named **Conductive Metal** resources.
- 3 named **Reactive Crystal** resources.
- Prototype default quantity: **180 units per named resource**.

Quantity goal:

- Enough for roughly 10-15 total crafts depending on recipe mix.
- Enough to try each thumper-part schematic multiple times.
- Not enough to make every permutation free of consequence.

Quality guardrails:

- Most starter stat values should sit in the **250-650** range.
- A starter resource may have one specialist stat in the **650-799** range.
- Starter resources must not contain **800+ Excellent** or **900+ Exceptional** stats unless Ryan explicitly runs a rarity test.
- No starter resource should be a broad multi-stat winner.
- At least one resource in each family should be an awkward specialist: one tempting stat, one clear weakness.

The intended feeling is "best within this imperfect batch," not "best possible item."

## 4. Resource Discovery

Resource stats are visible because the workshop has an analyzer, but schematic mastery should still be discovered through crafting.

Show before crafting:

- Resource family.
- Named resource identity.
- Resource stat values and bands.
- Schematic slot family requirements.
- Output property preview bars.
- Tuning controls.

Do not show up front:

- Exact formula weights.
- "Best input" recommendations.
- Full global explanations of every resource-to-property relationship.

After crafting, explain results in bench-note language:

```text
High Hardness helped Hull Integrity.
Low Malleability limited Repairability.
This Pump favored flexible conductive metals more than raw Conductivity.
```

Result explanations should be truthful and formula-backed, but qualitative enough that players learn by comparing attempts.

## 5. Crafting Interaction

The workshop flow remains resource-first:

```text
choose schematic -> fill named-resource slots -> preview output properties -> tune -> craft/experiment -> compare result
```

Locked guardrails from Decisions 007, 009, and 010 still apply:

- Named resource stats set the practical ceiling.
- Tuning expresses where potential goes.
- Experimentation may vary the result within resource-derived potential.
- Tuning and experimentation never mutate resource stacks.
- Weak resources cannot be laundered into rare-resource equivalents.
- Crafted items preserve resource provenance.

For this slice, repeated comparison matters more than one tutorial-perfect craft. The UI should keep a visible result history:

- Last craft.
- Best craft this session per schematic.
- Property comparison against selected prior item.
- Resource provenance on each crafted item.
- Favorite/keep marker so the player can protect a good result from reclaim/sell actions.

## 6. Reclaim, Sell, and Restock

Because thumpers are disabled, the workshop needs a controlled way to keep experimentation moving.

Reclaim/break down old crafted parts:

- Returns a lossy percentage of the exact named resources consumed by that item.
- Is intentionally lossy.
- Does **not** improve or reroll resource stats.
- Must not become a way to turn mediocre resources into better resources.
- Is tracked in the database with item provenance and resource-return ledger entries.

Supply crates:

- Prototype cadence should be set by simulation before implementation.
- Supply must include a timer or other anti-stuck route so players cannot exhaust all craftable material and soft-lock.
- A crate grants 3-5 named resource stacks from low-to-mid bands.
- Crates should mostly provide more imperfect decisions, not clean upgrades.
- Rare high-quality drops are disabled for the first workshop playtest unless Ryan explicitly enables a rarity test.

No new workshop-credit currency exists in this slice unless explicitly approved later.

## 7. Other Screens

Navigation remains visible to show product shape, but other screens should not compete with the workshop.

- **FIELD:** `In Development - field surveying is offline for this playtest.`
- **RIG:** `In Development - rig deployment is offline for this playtest.`
- **SETTLEMENT:** `In Development - settlement orders are offline for this playtest.`

Those screens should not contain partial old tutorial flows, old calls to action, or dead-end controls.

## 8. Telemetry

Track whether crafting itself is repeatable and understandable.

Required events:

- `workshop_started`
- `starter_resources_viewed`
- `schematic_selected`
- `resource_slot_filled`
- `resource_slot_replaced`
- `tuning_changed`
- `craft_started`
- `craft_completed`
- `result_compared`
- `item_favorited`
- `item_reclaimed`
- `supply_crate_opened`
- `repeat_same_schematic`
- `crafted_each_thumper_part`

Playtest notes should answer:

- Did the player craft 5+ times without being asked?
- Did the player retry the same schematic with different resources?
- Did the player understand that the best resource depends on the schematic and property?
- Did the player talk about wanting better resources?
- Did the player preserve a favorite craft?
- Did the player ask how to go find better materials?

The strongest success signal is not "they finished the tutorial." It is:

```text
I want to find better resources for another attempt.
```

## 9. Exit Criteria

The workshop-first slice is promising if external testers:

- Craft multiple times voluntarily.
- Compare resource stats without being prompted.
- Notice tradeoffs between resources in the same family.
- Understand that low/mid resources cap outcomes.
- Want better resource drops without being handed a unicorn.
- Can explain why at least one crafted part came out better or worse.

Only after this passes should the field/survey/thumper loop return as the way players earn better materials.
