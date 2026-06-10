# Lesson 20 — Field Repair Kit as a crafted repair item

> **Phase 6 / Lesson 6.2** — Add the fifth MVP recipe (**Field Repair Kit**), wire kit properties into partial Condition repair, record `repair_action` audit rows + ledger entries, and enable in-run **Field Repair** (kit-gated, kit-consuming) on Hull Damage windows.

**Prerequisite:** Lesson 19 (`applyRoutineUse`, `applyNormalRepair`, Integrity cap rules).

**Out of scope:** Repair workshop UI polish, overhaul kits, Chemical Purity, Precision/Overhaul/Calibration kits, equippable thumper parts as repair targets (Lesson 6.3), full six-screen MVP UI.

**Learning goal:** Understand why repair kits are **economy items** (not free heals), what a **repair action** must record for audit, and how **016-B / 021-A** weights make binder and filament choices matter.

---

## 1. Why Field Repair Kit is an economy item

Free “repair to 100%” would:

- Erase crafting demand after the first hull scratch.
- Hide whether named resources matter.
- Break Decision 012 audit (“what repair changed Condition or Integrity?”).

A **crafted consumable kit** ties repair to the same loop as everything else:

```text
Survey → thump → craft kit → spend kit under pressure → craft again
```

Kits carry **property scores** from inputs and tuning — Condition Restored, Integrity Safety, Field Reliability — so better blooms and allocation decisions change outcomes.

---

## 2. Why it must not be a full heal

Decision 003 locks the shape:

- Repair restores **partial** Condition from the kit’s **Condition Restored** score.
- Restoration is **capped at Integrity** (`applyNormalRepair` from Lesson 19).
- Integrity Safety **mitigates** Integrity loss during pressured field repair; it does not silently max-heal structural damage.
- Kits are **consumed** — one use, one audit row.

Domain scaling (MVP):

```typescript
conditionRestoredPointsFromKitScore(score) // ~12–28 points at typical craft scores
applyFieldRepairWithKit(target, { conditionRestored, integritySafety })
```

A score-90 kit on `{ condition: 50, integrity: 80 }` lands at **80**, not 100.

---

## 3. What a repair action should record

Decision 012 **Repair Action** — minimum audit fields:

| Field | Purpose |
|-------|---------|
| `pilot_id` | Who repaired |
| `repair_kit_item_id` | Which consumed kit (provenance via craft row) |
| `thumper_run_id` + `window_index` | In-run context |
| `condition_before` / `condition_after` | Visible wear answer |
| `integrity_before` / `integrity_after` | Max-durability trust |
| `kit_condition_restored_score` / `kit_integrity_safety_score` | Why this kit produced this outcome |
| `explanation` | Player-readable summary |

Ledger entries (append-only):

1. `repair_kit_consumed` — kit item spent
2. `item_repaired` — repair outcome summary
3. `item_condition_changed` — deltas for audit queries

Until Lesson 6.3, **run hull** columns on `thumper_runs` (`run_hull_condition`, `run_hull_integrity`) hold durability during a deploy; field repair updates those and cites them in `repair_actions`.

---

## 4. Schematic weights (Decision 016-B + 021-A)

**Field Repair Kit** slots: Patch Alloy (SA), Control Filament (CM), Reactive Binder (RC).

| Property | Formula |
|----------|---------|
| **Condition Restored** | 45% Patch Malleability + 35% avg OQ + 20% Patch Hardness |
| **Integrity Safety** (016-B) | 40% Patch Hardness + 30% Binder Heat Resistance + 30% avg OQ |
| **Field Reliability** (021-A) | 45% Binder HR + 35% Filament Heat Resistance + 20% avg OQ |

016-B proof (TDD): Pale Ember vs Thornwake binder → **different Integrity Safety** (binder HR matters). 021-A proof (from Lesson 18): Slag filament beats Veyrith on Field Reliability.

---

## 5. In-run Field Repair (Lesson 3.5 gate)

`getEventWindowResponseOptions` already disables `field_repair` when `fieldRepairKitCount === 0`.

This lesson wires:

```text
respond action
  → validateEventWindowResponse (kit count)
  → recordThumperEventWindowResponseForPilot
       → consume oldest unconsumed kit (items.consumed_at)
       → domain repair on run hull
       → repair_actions + ledger
       → record window choice
```

| Hull Damage choice | Effect on run hull |
|--------------------|-------------------|
| **field_repair** | Pressure lands (mitigated Integrity) + kit partial restore |
| **hold** | `applyHullDamageWithoutFieldRepair` — Condition −15, Integrity −3 |

Tutorial first run still avoids Hull Damage (Decision 011); seeded runs exercise the gate.

---

## 6. Domain + DB API

| Symbol | Role |
|--------|------|
| `FIELD_REPAIR_KIT` | Fifth MVP `SchematicDefinition` |
| `applyFieldRepairWithKit` | Partial restore, Integrity cap |
| `applyHullDamageFieldRepair` | Pressured hull window + kit |
| `craftFieldRepairKitForPilot` | Transactional craft |
| `countFieldRepairKitsForPilot` | Unconsumed kit inventory |
| `recordThumperEventWindowResponseForPilot` | Respond + repair side effects |

Files:

```text
packages/domain/src/crafting/schematics/fieldRepairKit.ts
packages/domain/src/durability/fieldRepair.ts
packages/db/drizzle/0014_field_repair_kit.sql
packages/db/src/schema/repairActions.ts
packages/db/src/queries/fieldRepair.ts
```

---

## 7. TDD checklist

| Test | Proves |
|------|--------|
| Kit crafts through engine | Fifth recipe is data, not special code |
| Different binders → different Integrity Safety | 016-B differentiation |
| Partial restore, Integrity cap | Not a full heal |
| `field_repair` rejected without kit | Gate from Lesson 3.5 |
| `field_repair` with kit consumes + audits | Economy + trust |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

---

## Recap checklist

- [x] `FIELD_REPAIR_KIT` schematic (016-B + 021-A weights)
- [x] Partial repair domain math capped at Integrity
- [x] `repair_actions` + ledger entries
- [x] Kit consumption on in-run Field Repair
- [x] Dynamic `fieldRepairKitCount` in respond/load
- [ ] Equippable thumper parts as repair targets (Lesson 6.3)

**Next exercise:** Thumper parts as equippable wearing items — wear lands on parts, repair targets equipped hull (Lesson 6.3).
