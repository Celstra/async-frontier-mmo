# Lesson 23 — Crafting + Gear / Repair screen

> **Exercise:** Split crafting and gear off Pilot Home into `/craft` — Decision 008 screen #6 and the **comprehension gate's home**. All five MVP schematics, named-resource comparison, weighted property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, result explanation, equip + repair kit craft.

**Prerequisite:** Lessons 20–22 (deploy → run → claim with Veyrith Copper in inventory).

**Out of scope:** Post-MVP crafting systems, marketplace/trade, full repair-in-run UI (Field Repair remains on Thumper Run).

**Learning goal:** Understand **thinking-craft** — how named resource stats flow through schematic weights into property previews and crafted items.

---

## 1. Thinking-craft (plain language)

SWG-style crafting here is not a recipe icon click:

```text
Named resource stats  →  schematic weights  →  property base scores
       ↓                        ↓
  slot allocation          3 tuning points
       ↓                        ↓
              Safe Craft / Careful Experiment
                       ↓
                 crafted item + explanation
```

**Thinking-craft** means the player reads stats, weights, and tradeoffs *before* committing stacks. Decision 008: **when in doubt, show the weights.**

---

## 2. Resource stats → property preview

Each schematic property line is a weighted sum of slot stats (Decision 010):

```text
baseScore = weighted_total / 10
tunedScore = base × (1 + 0.05 × tuningPointsOnLine)   // cap 100
```

| UI piece | Domain function |
|----------|-----------------|
| Weight labels per property | schematic `terms` (shown on `/craft`) |
| Live preview when slots filled | `previewCraftProperties()` |
| Commit | `resolveCraft()` inside db `craftSchematicForPilot` |

Resource stats are **read-only inputs** from the chosen named-resource instance — crafting never mutates the catalog stats of Veyrith Copper.

---

## 3. Allocation moment (named-resource comparison)

Decision 008 requires side-by-side comparison: *where else is this stack best?*

Domain: `buildResourceAllocationHints()` ranks each owned stack against all live schematic slots in its family:

| Column | Meaning |
|--------|---------|
| **Best use** | Highest weighted fit among MVP schematics |
| **Also useful for** | Next-best slots (teaches opportunity cost) |

Slot `<select>` options repeat the hint so choosing Veyrith for Conductive Core is an informed choice, not muscle memory.

---

## 4. Decision 008 checklist on `/craft`

| Requirement | Implementation |
|-------------|----------------|
| All five schematics | Nav links from `MVP_CRAFT_SCHEMATICS` |
| Slot picker + comparison table | GET preview form + allocation hints |
| Weighted property preview | Terms list + `propertyPreview` when all slots selected |
| Exactly 3 tuning points | GET refresh shows total; POST validates |
| Safe Craft / Careful Experiment | POST `craftMode` radio |
| Result explanation | `buildCraftResultExplanation` after craft |
| Equip scanner / thumper parts | Gear panel actions |
| Field Repair kit | Fifth schematic + kit count display |
| Condition / Integrity | Shown on crafted items and equipped gear |

---

## 5. Route layout

```text
Pilot Home (/)     summary + link → /craft
/craft             craft + gear + repair kit craft
/claim             links forward to /craft after first claim
```

Shared loader: `apps/web/src/lib/server/craftLoad.ts`  
Craft actions: `apps/web/src/routes/craft/+page.server.ts`

GET preview pattern (like Deploy tail refresh): change slot or tuning → `requestSubmit()` on preview form → server returns updated `propertyPreview`.

---

## 6. Files touched

| File | Role |
|------|------|
| `packages/domain/src/crafting/buildResourceAllocationHints.ts` | Allocation moment hints |
| `apps/web/src/lib/server/craftLoad.ts` | Inventory + stats + preview load |
| `apps/web/src/routes/craft/+page.server.ts` | Load + craft/equip actions |
| `apps/web/src/routes/craft/+page.svelte` | Crafting + Gear UI |
| `apps/web/src/routes/+page.svelte` | Home summary only |
| `apps/web/src/lib/pilotHome.ts` | Suggested actions → `/craft` |

---

## 7. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test buildResourceAllocationHints
pnpm check
pnpm --filter web build
```

Manual: claim Veyrith → `/craft` → select Survey Scanner → fill slots with Veyrith where hinted → allocate 3 tuning → Safe Craft → read explanation → Equip scanner → survey again with clearer readout.

---

## 8. Recap

**Learned:** Crafting is weighted stat math made visible. The comprehension gate lives here: weights, allocation hints, and result explanation teach *why* the scanner rolled the way it did.

**Next exercise:** Lesson 29 — Decision 013 playtest telemetry (`docs/lessons/29-decision-013-telemetry.md`), or walk the full first-session path in the browser as the Phase 7 review gate.

---

## Commit

```bash
git add packages/domain apps/web docs/lessons/23-crafting-gear-repair-screen.md
git commit -m "feat: add crafting gear screen with allocation hints"
```
