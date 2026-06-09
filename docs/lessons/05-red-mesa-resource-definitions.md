# Lesson 05 — Red Mesa resource definitions (domain only)

> **Exercise:** Add pure domain data and types for the six locked Red Mesa MVP resources — family, stat personality, and prototype numeric values from Decision 006 and Decision 010. No DB tables, no UI, no random generation yet.

**Prerequisite:** Lesson 04 complete (demo pilot / open thumper scoped correctly).

**Out of scope:** `resource_instances` tables, survey UI, bloom rotation, crafting formulas, stat mutation during thumper runs.

---

## 1. Why we start in `packages/domain` before the database

The prototype ladder (Decision 014) says: **prove the economy math before wiring persistence**.

Resource definitions are **game rules data**, not storage layout:

| Layer | Responsibility |
|-------|----------------|
| **`packages/domain`** | What resources exist, what stats they have, what families they belong to — fixed facts the rest of the app consults |
| **`packages/db`** (later) | Which *instance* of a named resource is active in the current bloom, who owns stacks, ledger entries |
| **`apps/web`** (later) | Survey screens, claim results, crafting previews |

Putting the six Red Mesa resources in domain first gives you:

1. **Fast tests** — Vitest runs in milliseconds; no Postgres required to assert “Veyrith Copper has high Conductivity.”
2. **Single source of truth** — Crafting, survey hints, and thumper results will all import the same definitions instead of duplicating a spreadsheet in SQL seed data and TypeScript.
3. **Clean architecture habit** — Domain has no Drizzle, no SvelteKit, no HTTP. You learn to separate *what the game says* from *how we store it*.
4. **TDD-friendly slice** — Write failing documentation tests first; make them pass with a small `redMesaBloom.ts` module.

```text
Decision 006 + 010  →  domain constants/types  →  tests pass
                              ↓ (later lessons)
                         DB resource_instance rows point at domain ids
                              ↓
                         web shows survey bands / claim amounts
```

When DB tables arrive (Decision 012), a `resource_instance` row will reference a domain resource id and copy immutable stats at spawn time. The domain file remains the catalog; the DB row is “this bloom’s copy of Veyrith Copper right now.”

---

## 2. Locked content — six resources, three families, five stats

### Resource families (Decision 001 / 006)

| Family | Count in bloom |
|--------|----------------|
| **Conductive Metal** | 2 |
| **Structural Alloy** | 2 |
| **Reactive Crystal** | 2 |

### MVP stat codes (already in `packages/shared`)

`OQ`, `conductivity`, `hardness`, `heat_resistance`, `malleability` — internal scale **1–1000** (Decision 010).

`packages/domain` already exports a placeholder:

```typescript
export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;
```

This lesson upgrades that to a **complete** stat map (all five keys required) for bloom resources.

### Red Mesa Bloom roster (Decision 006 personalities + Decision 010 numbers)

| Resource | Family | Role / personality | OQ | Cond. | Hard. | Heat | Mall. |
|----------|--------|-------------------|---:|---:|---:|---:|---:|
| **Keth Iron** | Structural Alloy | Balanced baseline; decent Hardness | 520 | 220 | 650 | 480 | 560 |
| **Red Mesa Conductive Slag** | Conductive Metal | Useful Heat Resistance; low OQ; uneven Conductivity | 340 | 610 | 310 | 720 | 390 |
| **Asterion Frame Alloy** | Structural Alloy | High Hardness; good Malleability; weaker Conductivity | 690 | 260 | 850 | 610 | 760 |
| **Pale Ember Crystal** | Reactive Crystal | High Heat Resistance; decent OQ | 680 | 520 | 360 | 880 | 470 |
| **Veyrith Copper** | Conductive Metal | Very high Conductivity; high OQ; **weak Hardness** | 820 | **930** | **260** | 540 | 620 |
| **Thornwake Crystal** | Reactive Crystal | One great stat, one terrible — tempting but risky | 590 | 910 | 420 | **210** | **160** |

Design intent to preserve in tests:

- **Veyrith Copper** — Conductivity in the **Exceptional** band (900+), Hardness in **Weak** band (250–499). The tutorial’s “exciting find.”
- **Thornwake Crystal** — very high Conductivity, very low Heat Resistance and Malleability (specialist risk).
- **Keth Iron** — middle-of-the-road starter structural material.

---

## 3. Immutability rule — predict before coding

Decisions 005, 009, and 010 lock this:

> Named resource stats do **not** mutate during extraction. Bad thumper events may reduce **quantity**, create waste, or damage gear — but they do **not** create a worse-stat stack of the same named resource.

**Pause — your turn:**

Before any edits, reply in chat with **your prediction**: *Why should resource stats stay fixed during a thumper run instead of degrading when the player ignores Pump Strain or Hull Damage?*

Hints to think about (do not peek at the answer block until you have your own answer):

- What happens to crafting if the same stack could have different Conductivity values?
- What does Decision 009 say about tuning vs upgrading resources?
- How would players trust claim results?

<details>
<summary>Coach answer (after you reply)</summary>

Stats are the **identity** of a named resource. If extraction could lower Conductivity:

- Stacks of “Veyrith Copper” would no longer combine cleanly — same name, different stats.
- Crafting ceilings would become unpredictable; tuning could not be separated from “did I thump badly?”
- The SWG-style loop (“find the right stats before despawn”) collapses if stats are a moving target.
- Waste and reduced **yield** already punish bad runs without laundering a rare resource into a mediocre one.

So domain defines **immutable** stat maps; thumper resolution (later) only affects **how much** you recover, not **what** the resource is.

</details>

---

## 4. Target module shape

Suggested new files under `packages/domain/src/resources/`:

```text
packages/domain/src/resources/
  types.ts              # ResourceFamily, NamedResourceDefinition, complete stat map type
  redMesaBloom.ts       # RED_MESA_BLOOM_RESOURCES record + helpers
  redMesaBloom.test.ts  # documentation tests (this lesson)
```

### Types to introduce

```typescript
/** Locked MVP resource families. */
export type ResourceFamily =
  | 'conductive_metal'
  | 'structural_alloy'
  | 'reactive_crystal';

/** All five MVP stats required — not Partial. */
export type CompleteResourceStatMap = Record<ResourceStatCode, number>;

export type NamedResourceId =
  | 'keth_iron'
  | 'red_mesa_conductive_slag'
  | 'asterion_frame_alloy'
  | 'pale_ember_crystal'
  | 'veyrith_copper'
  | 'thornwake_crystal';

export type NamedResourceDefinition = {
  id: NamedResourceId;
  displayName: string;
  family: ResourceFamily;
  stats: CompleteResourceStatMap;
};
```

Export from `packages/domain/src/index.ts`:

- Types above (or re-export from `resources/types.ts`)
- `RED_MESA_BLOOM_RESOURCES` — `Record<NamedResourceId, NamedResourceDefinition>` or `readonly NamedResourceDefinition[]`
- Optional helpers: `getRedMesaResource(id)`, `listRedMesaResources()`, `MVP_RESOURCE_STAT_CODES` constant for tests

Keep `ResourceStatMap` as `Partial<...>` only if other code still needs it; bloom definitions use the complete map.

---

## 5. TDD — three documentation tests

Write these in `redMesaBloom.test.ts` **first** (they should fail until `redMesaBloom.ts` exists).

### Test 1 — exactly six MVP resources

```typescript
it('defines exactly six Red Mesa bloom resources', () => {
  expect(listRedMesaResources()).toHaveLength(6);
});
```

Proves Decision 006 roster is complete — no accidental seventh resource, no missing entry.

### Test 2 — each resource has all five MVP stats

```typescript
const MVP_STATS: ResourceStatCode[] = [
  'OQ',
  'conductivity',
  'hardness',
  'heat_resistance',
  'malleability'
];

it('gives every bloom resource all five MVP stats', () => {
  for (const resource of listRedMesaResources()) {
    for (const stat of MVP_STATS) {
      expect(resource.stats[stat], `${resource.id}.${stat}`).toBeTypeOf('number');
      expect(resource.stats[stat], `${resource.id}.${stat}`).toBeGreaterThanOrEqual(1);
      expect(resource.stats[stat], `${resource.id}.${stat}`).toBeLessThanOrEqual(1000);
    }
  }
});
```

Proves no `Partial` gaps — crafting and survey code can rely on every stat being present.

### Test 3 — Veyrith Copper personality (design intent)

```typescript
it('makes Veyrith Copper high Conductivity and weak Hardness per design intent', () => {
  const veyrith = getRedMesaResource('veyrith_copper');

  expect(veyrith.family).toBe('conductive_metal');
  expect(veyrith.stats.conductivity).toBeGreaterThanOrEqual(900); // Exceptional band
  expect(veyrith.stats.hardness).toBeLessThan(500);               // Weak band
  expect(veyrith.stats.conductivity).toBe(930);
  expect(veyrith.stats.hardness).toBe(260);
});
```

Uses Decision 010 exact prototype values **and** band language from Decision 010’s quality table — so a future balance tweak that moves 930 → 905 still passes the band assertions if you keep those; exact equality pins the locked spreadsheet numbers.

Optional fourth test (stretch):

```typescript
it('covers two resources per family', () => {
  const families = listRedMesaResources().map((r) => r.family);
  expect(families.filter((f) => f === 'conductive_metal')).toHaveLength(2);
  // ... structural_alloy, reactive_crystal
});
```

---

## 6. Implementation order

1. **You predict** immutability rationale (section 3) — coach confirms.
2. **You predict** which files change (section 7).
3. Add `types.ts` + failing tests.
4. Run `pnpm --filter @async-frontier-mmo/domain test` — see red failures.
5. Implement `redMesaBloom.ts` with Decision 010 table literals.
6. Re-export from `index.ts`.
7. Green tests + `pnpm check`.

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

---

## 7. Predict which files change

Before editing, list every file you expect to touch and why.

Hints:

- Where does `ResourceStatCode` already live?
- Does `shared` need new exports, or only `domain`?
- Should thumper tests change?
- Does `apps/web` or `packages/db` import resource data yet?

Reply in chat with your file list. The coach will confirm, then apply minimal edits (or walk you through typing them).

---

## 8. Apply + verify (coach step)

After your immutability answer and file prediction:

1. Add `packages/domain/src/resources/types.ts`.
2. Add `redMesaBloom.test.ts` (failing).
3. Add `redMesaBloom.ts` (six resources, Decision 010 stats).
4. Update `packages/domain/src/index.ts` exports.
5. Run domain tests and workspace check.

---

## Recap checklist

- [ ] Six named resources in domain, matching Decision 006 roster
- [ ] Each resource has family + all five stats (1–1000)
- [ ] Veyrith Copper: Conductivity 930, Hardness 260; band tests document intent
- [ ] No DB migration, no UI, no survey RNG
- [ ] `pnpm --filter @async-frontier-mmo/domain test` passes
- [ ] `pnpm check` passes

**Next exercise:** Add a pure domain function that maps an internal stat value to a survey **band** label (`Poor` … `Exceptional`) using Decision 010’s table — still no DB.
