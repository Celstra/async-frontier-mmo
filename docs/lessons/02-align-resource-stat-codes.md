# Lesson 02 — Align resource stat codes with MVP scope

> **Exercise:** Replace the placeholder `ResourceStatCode` union in `packages/shared` with the locked MVP stat set from `design-docs/MVP_SCOPE_REFERENCE.md`, and update the dev display on the home page.

**Prerequisite:** Lesson 01 complete; `pnpm check` passes.

**Locked MVP stats:** OQ, Conductivity, Hardness, Heat Resistance, Malleability.

---

## 1. Why shared stat vocabulary matters

Named resources in Async Frontier are not just “iron” or “copper” — each stack carries **property stats** (OQ, Conductivity, etc.) that drive crafting previews, thumper yield, and gear performance.

If every package invents its own stat names:

- domain formulas reference `'EN'` while the DB column says `energy`
- the crafting UI shows labels the server never stored
- a rename in one file silently breaks another

`packages/shared` is the **contract layer**: one TypeScript union that every package imports. Domain, web, and (later) DB all speak the same vocabulary.

```text
design-docs/MVP_SCOPE_REFERENCE.md  →  packages/shared (ResourceStatCode)
                                              ↓
                         domain (ResourceStatMap) · web (display) · db (columns)
```

**Rule:** Lock stat codes in `shared` early; treat changes like a schema migration.

---

## 2. Current code

### `packages/shared/src/index.ts`

```typescript
/** Resource quality stat codes used across the monorepo (MVP subset). */
export type ResourceStatCode = 'OQ' | 'DR' | 'EN' | 'CD';
```

`DR`, `EN`, and `CD` were placeholders — they are **not** in the MVP scope doc.

### `apps/web/src/routes/+page.svelte` (dev block)

```typescript
const resourceStatCodes: ResourceStatCode[] = ['OQ', 'DR', 'EN', 'CD'];
```

In dev mode the page prints this array to prove `web → shared` imports work.

### `packages/domain/src/index.ts`

```typescript
import type { ResourceStatCode } from 'shared';

export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;
```

Domain imports the type but does **not** list literal codes — it inherits whatever `shared` exports.

---

## 3. Target code

Use readable string literals. Keep `OQ` — it is the established SWG-style term in the design docs. Use lowercase snake_case for multi-word stats (TypeScript convention for string union values).

### `packages/shared/src/index.ts`

```typescript
/** Resource property stat codes — locked MVP set (see MVP_SCOPE_REFERENCE.md). */
export type ResourceStatCode =
	| 'OQ'
	| 'conductivity'
	| 'hardness'
	| 'heat_resistance'
	| 'malleability';
```

### `apps/web/src/routes/+page.svelte`

```typescript
const resourceStatCodes: ResourceStatCode[] = [
	'OQ',
	'conductivity',
	'hardness',
	'heat_resistance',
	'malleability'
];
```

No new resources, crafting logic, DB tables, or screens in this lesson — only the shared vocabulary and dev display.

---

## 4. Predict which files change

Before editing, list every file you expect to touch and why.

Hints:

- Where is `ResourceStatCode` **defined**?
- Where are the old placeholder literals (`'DR'`, `'EN'`, `'CD'`) **hardcoded**?
- Which files only **import** the type without listing values?

Reply in chat with your file list. The coach will confirm, apply minimal edits, and run `pnpm check`.

---

## 5. Apply + verify (coach step)

After your prediction:

1. Edit `packages/shared/src/index.ts`.
2. Edit `apps/web/src/routes/+page.svelte` if needed.
3. Run `pnpm check`.
4. In dev, load `/` and confirm the dev note shows the five MVP stats.

---

## Recap checklist

- [ ] `ResourceStatCode` matches MVP_SCOPE_REFERENCE.md
- [ ] No placeholder `DR` / `EN` / `CD` left in source
- [ ] `pnpm check` passes
- [ ] Dev display lists all five codes

**Next exercise:** Lesson 1.3 — Replace global latest thumper with a demo pilot/open-run concept.
