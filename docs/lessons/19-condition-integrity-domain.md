# Lesson 19 — Condition + Integrity domain model

> **Phase 6 / Lesson 6.1** — Add pure domain types and rules for **Condition** and **Integrity** — routine use wears Condition only, severe events may reduce Integrity, repair restores up to the Integrity cap — without repair UI, kit consumption, or complex durability simulation.

**Prerequisite:** Lessons 15–18 path (schematic engine, scanner craft, equip survey, thumper part schematics) or any point where items exist as crafted objects.

**Out of scope:** Field Repair Kit schematic and in-run repair (Lesson 6.2 / Lesson 20), repair UI, thumper part wear on claim, ledger `repair_action` rows, overhaul that restores Integrity, surprise item deletion.

**Learning goal:** Understand why **two-layer durability** is more trustworthy than simple item deletion, and what the server should do after **routine use**.

---

## 1. Why two layers beat “item breaks → deleted”

Players hate durability when it feels **opaque and punitive**: a favorite scanner vanishes after a few surveys with no warning, no repair path, and no audit trail.

Simple deletion also breaks **server authority**. If an item disappears, you cannot answer Decision 012’s audit question:

> Why did this item lose Condition?

A two-layer model separates **predictable wear** from **serious consequences**:

```text
Condition  = current health (goes down on meaningful use, goes up on repair)
Integrity  = maximum Condition / long-term structural ceiling
```

| Layer | What changes it | Player feeling |
|-------|-----------------|----------------|
| **Condition** | Survey, thump, craft — normal play | “I used my gear; I should repair soon.” |
| **Integrity** | Hull Damage, risky field repair, overload, emergency choices | “That was a bad event — my cap dropped.” |

**Trust rules (Decision 001 / DESIGN_BIBLE):**

- Routine use **mostly** reduces Condition.
- Integrity loss is **reserved** for severe events and risky choices.
- At **0 Condition**, the item is **disabled or inefficient** — not surprise-deleted.
- Frame modules (identity gear) should remain repairable; thumper parts may be harsher but still favor salvage/rebuild over opaque deletion.

This creates crafting demand (repair kits, better hull plates) without the Breath-of-the-Wild “weapon shattered” frustration.

---

## 2. What should happen after routine use

After a **meaningful action** (one survey, one thumper deploy cycle, one craft that stresses a tool):

```text
before: { condition: 100, integrity: 100 }
applyRoutineUse(..., conditionLoss: 3)
after:  { condition: 97, integrity: 100 }   ← Integrity unchanged
```

The domain function is **pure**: same inputs → same outputs. The web layer will later:

1. Load the item’s stored `condition` / `integrity`.
2. Call `applyRoutineUse` with the lesson’s positive wear amount (e.g. scanner wear of 3 Condition per survey).
3. Persist the returned state and write an audit explanation.

**Not yet in this lesson:** UI bars, kit gating, or tying wear to thumper run results. Those wire in when parts are equippable items (Lesson 6.3) and Field Repair Kits exist (Lesson 6.2).

At **0 Condition**:

```text
isItemDisabled({ condition: 0, integrity: 95 }) === true
```

The row still exists in the database. Gameplay can block equipping or reduce efficiency — but the player always sees *why* and can plan repair.

---

## 3. Severe events vs routine use

**Routine** — `applyRoutineUse(state, conditionLoss)`:

- Subtracts from Condition only.
- Never touches Integrity.

**Severe** — `applySevereEvent(state, { conditionLoss, integrityLoss? })`:

- Always applies Condition loss.
- Applies Integrity loss only when the caller passes it (hull breach, failed salvage, risky bypass — not every window).

Example hull damage during a push run:

```typescript
applySevereEvent(
  { condition: 80, integrity: 100 },
  { conditionLoss: 20, integrityLoss: 5 }
);
// → { condition: 60, integrity: 95 }
```

If Integrity drops below current Condition, the model **clamps** Condition to the new cap — the item does not stay “over-healed” relative to its structural limit.

**Tutorial first run (Decision 011):** no Integrity damage. Only Condition wear from normal extraction. That teaches the meter before max-durability risk appears.

---

## 4. Normal repair (domain only — no UI yet)

`applyNormalRepair(state, conditionRestored)`:

- Adds to Condition.
- **Caps at Integrity** — cannot exceed `getMaxCondition(state)`.
- Does **not** restore lost Integrity (overhaul is deferred).

```typescript
applyNormalRepair({ condition: 50, integrity: 80 }, 50);
// → { condition: 80, integrity: 80 }   not 100
```

Lesson 6.2 will map crafted kit **Condition Restored** scores into `conditionRestored` and add **Integrity Safety** for severe-context repairs. This lesson only establishes the cap rule.

---

## 5. Domain API

| Symbol | Role |
|--------|------|
| `ItemDurability` | `{ condition, integrity }` |
| `SevereDurabilityEvent` | `{ conditionLoss, integrityLoss? }` |
| `createItemDurability` | Normalize non-negative, `condition ≤ integrity` |
| `getMaxCondition` | Integrity cap for repair UI later |
| `isItemDisabled` | `condition === 0` — exists but unusable |
| `applyRoutineUse` | Meaningful use → Condition only |
| `applySevereEvent` | Catastrophic / risky → may reduce Integrity |
| `applyNormalRepair` | Restore Condition up to Integrity |

Files:

```text
packages/domain/src/durability/types.ts
packages/domain/src/durability/itemDurability.ts
packages/domain/src/durability/itemDurability.test.ts
```

Export from `packages/domain/src/index.ts`.

---

## 6. TDD checklist

| Test | Proves |
|------|--------|
| Routine use reduces Condition only | Survey/thump wear does not silently lower max durability |
| Severe event may risk Integrity | Hull-style damage can lower the repair ceiling |
| Normal repair cannot exceed Integrity-limited maximum | Kits cannot full-heal a structurally compromised item |
| 0 Condition does not delete | `isItemDisabled` — item record survives |
| Integrity drop clamps Condition | Cap math stays consistent |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

---

## 7. Architecture placement

```text
survey action / thumper claim / repair action (later)
        ↓
  load item condition + integrity from DB
        ↓
  domain.applyRoutineUse | applySevereEvent | applyNormalRepair
        ↓
  persist + audit explanation (later lessons)
```

Domain stays free of Svelte, HTTP, and Drizzle — same pattern as `resolveThumperRunResult` and `applySurveyClarityToResult`.

---

## Recap checklist

- [x] `ItemDurability` type with Condition + Integrity
- [x] `applyRoutineUse` — Condition only
- [x] `applySevereEvent` — optional Integrity loss
- [x] `applyNormalRepair` — capped at Integrity
- [x] No deletion at 0 Condition
- [ ] Repair UI (Lesson 6.2)
- [ ] Wear on equipped thumper parts at claim (Lesson 6.3)

**Next exercise:** Add **Field Repair Kit** as a crafted repair item — kit properties feed `applyNormalRepair`, Integrity Safety gates severe-context repair (Lesson 6.2 / `docs/lessons/20-field-repair-kit.md`).
