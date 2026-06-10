# Lesson 15 — Schematic engine and Survey Scanner Module Mk I

> **Exercise:** Build generic schematic machinery in `packages/domain` — versioned schematic data, Decision 010 math, property preview, tuning validation, Safe Craft / Careful Experiment — expressed first as **Survey Scanner Module Mk I** with Decision 016-A weights.

**Prerequisite:** Lessons 13–14 (resource instances, stacks, claim reward). Red Mesa bloom stats from Lesson 6 (`redMesaBloom.ts`).

**Out of scope:** Refining, batch crafting, factories, crafting server actions, inventory consume, UI screens, the other four schematics (Lesson 5.4).

**Learning goal:** Understand **resource primacy** (Decision 009) — named-resource stats set the ceiling; schematic weights and tuning only express that potential — and why schematics are **versioned data**, not hard-coded functions.

---

## 1. Resource primacy (Decision 009)

Crafting power flows in one direction:

```text
Resource stats (1–1000)  →  schematic weights  →  property preview  →  tuning expression  →  craft mode variance
         ↑ primary ceiling                              ↑ relative only              ↑ bounded
```

- A high-Conductivity core like **Veyrith Copper** raises every scanner line that weights Conductivity.
- **Tuning points** add +5% relative per point on a line (3 total). They help you **express** good resources on the properties you care about — they do not inject flat quality.
- **Careful Experiment** rolls **once per craft** (75% +3% to every tuned line, 20% unchanged, 5% minor flaw on the item). Boost is capped at **100** only — it can push a line above `base × 1.15` when tuning left headroom. Poor material still cannot be tuned into Veyrith-tier output.

The TDD case *"Veyrith beats Slag by more than 3 tuning points can close"* proves this: even with all 3 points on one line, Slag never catches Veyrith on any scanner property when lens and mount are held constant.

---

## 2. Why schematics are versioned data (Decision 012)

Schematics are **not** TypeScript functions per recipe. They are records:

```text
SchematicDefinition
  id, version          ← bump version when weights change; old crafts stay auditable
  slots[]              ← family requirements (Conductive Metal, Reactive Crystal, …)
  properties[]         ← weight terms per output line
```

**Survey Scanner Module Mk I** lives in `packages/domain/src/crafting/schematics/surveyScannerMkI.ts` at **version 2** (Decision 016-A amended Survey Clarity to read Crystal Lens **Conductivity** instead of OQ).

Lesson 5.4 adds Drill Head, Pump, and Hull Plate as **more data files** — no new engine code.

---

## 3. Decision 010 math (locked shape)

```text
weighted_total       = Σ (stat_value × weight)   // weights sum to 1 per property line
base_score           = weighted_total / 10      // 0–100 crafted property scale
tuned_score          = base × (1 + 0.05 × points_on_line), cap 100
resource_ceiling     = min(100, base × 1.15)    // all 3 points on one line
```

**Craft modes**

| Mode | Result |
|------|--------|
| **Safe Craft** | `final = tuned_score` |
| **Careful Experiment** | One roll per craft: 75% +3% to all tuned lines (cap 100), 20% unchanged, 5% minor flaw on item |

**Crafted output bands** (different from resource stat bands — note **Basic**, not Weak):

| Score | Band |
|------:|------|
| 0–39 | Poor |
| 40–54 | Basic |
| 55–69 | Solid |
| 70–84 | Strong |
| 85–94 | Excellent |
| 95–100 | Exceptional |

Never **Legendary** in MVP.

---

## 4. Survey Scanner Module Mk I (Decision 016-A)

**Slots**

| Slot | Family |
|------|--------|
| Conductive Core | Conductive Metal |
| Crystal Lens | Reactive Crystal |
| Frame Mount | Structural Alloy |

**Property weights**

| Property | Formula |
|----------|---------|
| **Survey Clarity** | 60% Core Conductivity + 25% Lens **Conductivity** + 15% avg OQ |
| **Stat Hint Accuracy** | 50% Core Conductivity + 30% Lens Heat Resistance + 20% avg OQ |
| **Signal Range** | 55% Core Conductivity + 25% Lens Heat Resistance + 20% avg OQ |

Amendment A fixes Thornwake Crystal: high Conductivity (910) now matters on Survey Clarity, while low Heat Resistance (210) hurts the other two lines — **tempting but risky** (Decision 006).

---

## 5. Domain API (pure functions)

| Symbol | Role |
|--------|------|
| `SURVEY_SCANNER_MK_I` | Versioned schematic data |
| `previewCraftProperties(schematic, slotFills, tuning)` | UI preview before commit — partial tuning OK while editing |
| `validateTuningAllocation(schematic, tuning)` | Rejects unknown properties and >3 total points |
| `validateCraftTuningAllocation(schematic, tuning)` | Requires exactly 3 points for craft commit |
| `resolveCraft({ schematic, slotFills, tuning, mode, experimentSeed })` | Safe Craft or seeded Careful Experiment (exact 3 points) |
| `getPropertyOutputBand(score)` | Poor → Exceptional bands |
| `getResourcePropertyCeiling(baseScore)` | Resource-defined max per line |

Slot fills include `resourceId`, `family`, and **copied** `stats` — the engine rejects wrong families (e.g. Structural Alloy in Conductive Core). Tuning and preview are read-only on stats.

---

## 6. TDD proofs (Lesson acceptance)

| # | Test | What it proves |
|---|------|----------------|
| 1 | Veyrith core > Slag core on all three lines even when Slag spends all 3 tuning points | Resource primacy |
| 2 | Thornwake lens wins Survey Clarity, loses Stat Hint + Signal Range vs Pale Ember | Tempting-but-risky specialist |
| 3 | 4th tuning point throws; preview does not mutate slot stats | Tuning is allocation, not stat editing |
| 4 | Careful Experiment: one outcome per craft; boost can exceed `resourceCeiling` up to 100 | Decision 010 craft variance |
| 5 | Wrong slot family throws; `resolveCraft` requires exactly 3 tuning points | Slot rules + craft commit |

---

## 7. Files added

```text
packages/domain/src/crafting/
  types.ts
  propertyBand.ts
  schematicEngine.ts
  schematics/surveyScannerMkI.ts
  schematicEngine.test.ts
  propertyBand.test.ts
```

Exports re-exported from `packages/domain/src/index.ts`.

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

---

## 9. What you learned

- Resource stats define the **ceiling**; weights and tuning **express** it.
- Schematics are **data + version** so weight amendments stay auditable.
- `previewCraftProperties` is the UI hook before a craft commit.
- Thornwake vs Pale Ember is the first **meaningful tradeoff** lens choice in the first survey teaching set.

**Next exercise (Lesson 5.2):** Wire a crafting server action — choose schematic → fill slots from owned stacks → preview → allocate 3 tuning points → Safe Craft or Careful Experiment → persist crafted item + ledger.
