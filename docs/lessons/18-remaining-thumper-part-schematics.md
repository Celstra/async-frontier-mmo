# Lesson 18 — Drill, pump, and hull plate schematics as data

> **Exercise:** Add **Basic Drill Head**, **Efficient Pump**, and **Reinforced Hull Plate** as versioned `SchematicDefinition` records — **zero engine changes**. If the engine needed edits, Lesson 5.1’s generic design was wrong.

**Prerequisite:** Lessons 15–17 (schematic engine, craft, equip scanner).

**Out of scope:** Equipping thumper parts (Lesson 6.3), Field Repair Kit schematic file (Lesson 6.2), weapons, armor, refiners, a sixth recipe.

**Learning goal:** **Data-driven content** vs **code-driven content** — new recipes are JSON-shaped records consumed by the same `previewCraftProperties` / `resolveCraft` path.

---

## 1. Data vs code

| Data-driven (this lesson) | Code-driven (avoid for recipes) |
|---------------------------|----------------------------------|
| `basicDrillHead.ts` — slots + weight terms | `if (recipe === 'drill') { … }` |
| Bump `version` when weights change | Copy-paste math per item |
| `MVP_THUMPER_PART_SCHEMATICS` array | New engine branch per schematic |

The engine from Lesson 15 already understands families, weight terms, tuning, and craft modes. This lesson only adds **three more records**.

---

## 2. Locked weights (Decision 010 + 021-A)

### Basic Drill Head (`version: 1`)

| Slot | Family |
|------|--------|
| Cutting Bit | Structural Alloy |
| Conductive Coil | Conductive Metal |
| Resonance Crystal | Reactive Crystal |

| Property | Formula |
|----------|---------|
| Extraction Rate | 50% Cutting Bit Hardness + 30% Coil Conductivity + 20% avg OQ |
| Depth Access | 50% Cutting Bit Hardness + 30% Crystal Heat Resistance + 20% avg OQ |
| Wear Control | 45% Crystal Heat Resistance + 35% Cutting Bit Malleability + 20% avg OQ |

### Efficient Pump (`version: 2` — 021-A)

| Slot | Family |
|------|--------|
| Intake Manifold | Conductive Metal |
| Flexible Housing | Structural Alloy |
| Flow Crystal | Reactive Crystal |

| Property | Formula |
|----------|---------|
| Recovery Efficiency | 45% Intake Conductivity + 35% Housing Malleability + 20% avg OQ |
| Clog Resistance | 45% Housing Malleability + 30% Housing Hardness + 25% avg OQ |
| **Field Stability** | 45% Crystal HR + **35% Intake Malleability** + 20% avg OQ |

**021-A change:** Field Stability reads **Intake Malleability**, not Conductivity — Sorrel Vein Copper becomes the pump copper.

### Reinforced Hull Plate (`version: 1`)

| Slot | Family |
|------|--------|
| Outer Plate | Structural Alloy |
| Bracing Layer | Structural Alloy |
| Bonding Matrix | Reactive Crystal |

| Property | Formula |
|----------|---------|
| Max Condition | 45% Outer Hardness + 30% Bracing Malleability + 25% avg OQ |
| Damage Reduction | 50% Outer Hardness + 30% Bonding HR + 20% avg OQ |
| Repairability | 45% Bracing Malleability + 35% avg OQ + 20% Outer Hardness |

---

## 3. Nine-resource domain data

Decision 021 adds **Sorrel Vein Copper**, **Bendrel Ridge Alloy**, and **Glimmerfall Shard** to `redMesaBloom.ts` so allocation tests can run in pure domain without the DB seed.

---

## 4. Exports

```text
packages/domain/src/crafting/schematics/
  basicDrillHead.ts
  efficientPump.ts
  reinforcedHullPlate.ts
  surveyScannerMkI.ts   (Lesson 15)
  index.ts              → MVP_THUMPER_PART_SCHEMATICS
```

Fifth MVP recipe (**Field Repair Kit**) lands in Lesson 6.2 — allocation test uses inline 021-A Field Reliability weights until then.

Crafted drill/pump/hull items are **not equippable** yet (Lesson 6.3 wires thumper part slots).

---

## 5. TDD proofs

| # | Test | What it proves |
|---|------|----------------|
| 1 | All four thumper-part schematics `preview` + `resolveCraft` | Same engine path |
| 2 | Asterion cutting bit > Keth on Drill Extraction Rate | Hardness-weighted line works |
| 3 | Each recipe: different input combos win different property lines | Stage 1 differentiation |
| 4 | Veyrith best scanner CM; Sorrel best pump Field Stability; Slag best repair filament HR | CM allocation decision (021) |

---

## 6. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

**Engine change gate:** If you thought you needed to edit `schematicEngine.ts`, stop — the lesson failed its design goal. Extend **data** instead.

---

## 7. What you learned

- Recipes are **versioned data**; the engine is generic.
- **021-A** diversifies which stat each CM slot reads — allocation matters.
- Lesson 5.1’s engine investment pays off: three files, no new math code.

**Next exercise (Lesson 19 / Phase 6 Lesson 6.1):** Condition + Integrity domain model — `docs/lessons/19-condition-integrity-domain.md`.
