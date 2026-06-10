# Lesson 21 — Thumper parts as equippable, wearing items

> **Phase 6 / Lesson 6.3** — Starter worn drill/pump/hull, equip slots, deploy snapshots, part properties feed run math, claim applies wear to the parts that ran, repair kits target parts — closing the craft → equip → thump → wear → repair loop.

**Prerequisite:** Lessons 19–20 (Condition + Integrity, Field Repair Kit).

**Out of scope:** Full six-screen UI, bloom rotation, prospecting, workshop repair polish, part salvage/deletion.

**Learning goal:** Understand **snapshot-at-deploy auditability** and why better crafted parts must change thumper outcomes through **data**, not special-case code.

---

## 1. Snapshot-at-deploy auditability

Decision 012 requires answering:

> What thumper run produced which resources, waste, wear, damage, and salvage?

If deploy only read live equipped items at claim time, a player could swap parts mid-run and corrupt the audit trail. The server therefore **freezes** parts at deploy:

```text
deploy
  → read equipped drill / pump / hull item rows
  → insert thumper_run_part_snapshots (scores + condition + integrity)
  → generate event windows from run_seed
claim
  → resolve using snapshotted property scores (modifiers)
  → apply wear deltas only to snapshotted item_ids
```

Replay needs: `run_seed`, frozen windows, frozen part snapshots, stored responses — not the pilot's current loadout.

---

## 2. Starter worn kit (Decision 011)

On first `ensureDemoPilotReady`, pilots receive three **item rows** (not buffs):

| Item | Slot | Condition | Notes |
|------|------|-----------|-------|
| Worn Basic Drill | drill | 55 / 70 | Low extraction/wear-control scores |
| Worn Basic Pump | pump | 55 / 70 | Low recovery efficiency |
| Worn Basic Hull | hull | 55 / 70 | Low damage reduction |

Auto-equipped with `item_equipped` ledger rows (`source_type: starter_thumper_parts`).

---

## 3. Part properties → run math (data-driven)

Domain computes modifiers from snapshots — no `if (efficient_pump)` branches:

| Slot | Property | MVP effect |
|------|----------|------------|
| **Pump** | `recovery_efficiency` | Flat `pumpRecoveryBonus` on claimed quantity |
| **All** | Condition vs Integrity | `performanceMultiplier` (0.5 at 0 Condition — degraded, not deleted) |
| Drill / Hull | Other scores | Reserved for depth/threat/damage (hooks in place) |

```typescript
computeThumperPartRunModifiers(snapshots)
resolveThumperRunResult({ runConfig: { partModifiers }, ... })
```

**TDD proof:** same `run_seed` + responses, crafted Efficient Pump → **higher** `recoveredQuantity` than Worn Basic Pump.

---

## 4. Wear on claim

`computeRunPartWearDeltas` applies:

- Base per-slot Condition loss every run
- Extra pump wear on Pump Strain + hold
- Hull wear on Hull Damage + hold
- Small Integrity loss on Threat Surge + hold or risky push + hold

`applyWearToRunParts` updates **only** snapshotted `item_id` rows — bench spares untouched.

At **0 Condition**: `isItemDisabled` → 50% performance multiplier; row remains.

Field repair during a run updates the **hull item row** (and run hull columns for UI).

---

## 5. Equip and repair

| Action | Behavior |
|--------|----------|
| `equipThumperPartForPilot` | Server sets `equipped_*_item_id`, ledger `item_equipped` |
| `applyRepairKitToItemForPilot` | Consumes kit, partial restore, `repair_actions` + ledger |
| In-run `field_repair` | Targets snapshotted hull item |

Schematic validation: `isThumperPartSchematic` + `thumperPartSlotForSchematic`.

---

## 6. Domain + DB API

| Symbol | Role |
|--------|------|
| `STARTER_WORN_THUMPER_PARTS` | Fixed worn definitions |
| `computeThumperPartRunModifiers` | Snapshot → run math |
| `computeRunPartWearDeltas` / `applyWearToRunParts` | Claim wear |
| `ensureStarterThumperPartsForPilot` | One-time grant + equip |
| `snapshotEquippedPartsForRun` | Deploy freeze |
| `applyRunWearToPartItems` | Post-claim persistence |

Migration: `0015_thumper_parts_equip.sql`

---

## 7. TDD checklist

| Test | Proves |
|------|--------|
| Efficient Pump > Worn Pump on same seed | Crafting changes extraction outcomes |
| Wear only on run parts | Bench inventory unchanged |
| 0 Condition → 0.5 multiplier | Degraded, not deleted |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

---

## Recap checklist

- [x] Worn starter drill/pump/hull as real items
- [x] Equip slots + ledger `item_equipped`
- [x] Deploy part snapshots
- [x] Pump efficiency feeds claim quantity
- [x] Claim wear on snapshotted items only
- [x] Repair kits target part/scanner items
- [ ] Bloom generator (Lesson 6.4)

**Next exercise:** Seeded random bloom generator and manual rotation (Lesson 22 / Decision 018).
