# Lesson 16 — Starter stockpile and full scanner craft

> **Exercise:** Grant the Decision 011 starter stockpile to new/demo pilots, then craft Survey Scanner Module Mk I end-to-end — three slot fills, 3 tuning points, Safe Craft or Careful Experiment — with transactional consume, item provenance, crafting audit rows, and a Decision 008 result explanation.

**Prerequisite:** Lesson 15 (schematic engine + scanner data).

**Out of scope:** Equip scanner (Lesson 5.3), inventory browser polish, other schematics, refining, factories.

**Learning goal:** Understand **spend-vs-create** in one transaction and why **crafting attempts** are audited separately from the item row.

---

## 1. Spend vs create (one transaction)

Crafting is not “delete resources somewhere, insert item somewhere else.” It is one atomic story:

```text
BEGIN
  1. idempotency check (pilot + craft key)
  2. validate slot families + stack quantities
  3. domain preview + resolve (pure math)
  4. INSERT crafting_attempt (in_progress)
  5. UPDATE stacks −1 per slot + ledger resource_consumed
  6. INSERT item (property scores + provenance)
  7. UPDATE crafting_attempt → completed + item_id
  8. ledger item_crafted
COMMIT
```

If step 5 fails, no item exists. If the client double-submits with the **same idempotency key**, step 1 returns the existing completed attempt — **no second consume**.

**Spend** = `resource_consumed` ledger rows tied to `crafting_attempt.id`.
**Create** = `items` row + `item_crafted` ledger row.

---

## 2. Why crafting attempts are audited

Decision 012 requires answering after the fact:

- Which exact named resources were consumed?
- What tuning and craft mode were chosen?
- What base/tuned/final scores resulted?
- What item was produced?

The **item** holds current property scores and slot provenance (which `resource_instance_id` filled each slot). The **crafting_attempt** holds the full preview, tuning allocation, mode, experiment outcome, and result explanation JSON — frozen at craft time even if schematic weights change later.

Idempotency key: `(pilot_id, idempotency_key)` unique index — duplicate form posts replay the same attempt.

---

## 3. Decision 011 starter stockpile

New/demo pilots receive ledger-recorded grants (once per pilot):

| Resource | Quantity | Family |
|----------|---------:|--------|
| Keth Iron | 12 | Structural Alloy (Frame Mount) |
| Pale Ember Crystal | 6 | Reactive Crystal (Crystal Lens) |

Source: `starter_stockpile` in ledger payload. **`pilots.starter_stockpile_granted_at`** is set atomically (`UPDATE … WHERE … IS NULL`) so concurrent first loads cannot double-grant. First scanner craft also needs **Veyrith Copper** from the tutorial claim (Conductive Core).

Default suggested tuning (changeable in UI):

```text
Survey Clarity: 2
Stat Hint Accuracy: 1
Signal Range: 0
```

---

## 4. Domain additions

| Symbol | Role |
|--------|------|
| `STARTER_STOCKPILE_GRANTS` | Quantities for starter grant |
| `FIRST_SCANNER_SUGGESTED_TUNING` | Decision 011 default |
| `CRAFT_QUANTITY_PER_SLOT` | MVP = 1 unit per slot |
| `buildCraftResultExplanation(...)` | Decision 008 — stats → lines, tuning, mode (uses `resourceDisplayName` from slot fills, not the static catalog) |

---

## 5. DB additions

**Tables:** `items`, `crafting_attempts` (migration `0011_items_crafting_attempts.sql`).

**Queries:**

| Function | Role |
|----------|------|
| `ensureStarterStockpileForPilot` | Idempotent starter grants |
| `ensureDemoPilotReady` | Pilot + bloom instances + starter |
| `consumeResourceFromPilotTx` | Stack decrement + `resource_consumed` |
| `craftSchematicForPilot` / `craftSurveyScannerForPilot` | Transactional craft |
| `listPilotResourceStacksWithInstances` | Minimal slot picker data |

---

## 6. Web flow (`apps/web`)

- **Load:** inventory stacks + schematic metadata + suggested tuning.
- **Action `craftScanner`:** parse slots, tuning (exactly 3), mode, idempotency key → `craftSurveyScannerForPilot`.
- **UI:** slot `<select>` filtered by family, tuning inputs, Safe Craft / Careful Experiment — no full inventory screen.

Result block shows `buildCraftResultExplanation` summary per property line.

---

## 7. TDD proofs

| # | Test | What it proves |
|---|------|----------------|
| 1 | Wrong family or short quantity → `invalid_craft` | Clean failure before consume |
| 2 | Same idempotency key twice → `already_crafted`, one item, one consume | Idempotent craft |
| 3 | `item.provenance` lists exact `resourceInstanceId` per slot | Audit trail |

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate   # if needed
pnpm --filter @async-frontier-mmo/db test
pnpm --filter web build
```

---

## 9. What you learned

- Craft = **spend stacks + create item** in one transaction.
- **Crafting attempts** are the audit record; items are the playable object.
- Starter stockpile makes the first three-slot scanner craft possible before broader economy UI.
- Result explanation closes the Decision 008 comprehension loop.

**Next exercise (Lesson 5.3):** Equip the scanner and prove survey clarity scales with the crafted Survey Clarity score.
