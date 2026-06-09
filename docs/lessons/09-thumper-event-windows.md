# Lesson 09 — Deterministic thumper event windows (domain only)

> **Exercise:** Add a pure domain model that plans **two scripted event windows** for the first-session Veyrith Copper run: Signal Drift → Signal Tune, then Pump Strain → Clear Pump Problem. Test-first in `packages/domain`; no DB, no UI choices, no resolution math yet.

**Prerequisite:** Lessons 05–07 complete (Red Mesa resources + survey domain, `thumper_runs` with `target_resource_id`, deploy from survey signal).

**Out of scope:** `thumper_event_windows` DB table, player response storage, run result / payout math, visible run-state meters, random complication generation, Hull Damage / Threat Surge in the tutorial generator, realtime combat, jobs/workers, absent-player auto-resolution.

**Learning goal:** Understand why MVP thumpers are **short choice moments inside an async run** — not a 40-minute watch session — and encode the locked Decision 011 tutorial complications as testable domain data.

---

## 1. Why event windows are attention windows, not a 40-minute watch

Firefall thumpers were social and dangerous; this MVP keeps the **fantasy** (something went wrong — respond) without **realtime babysitting**.

```text
Async run (minutes):     deploy ──────────────── timer / progress ──────────────── claim
Active moment (seconds):              ↑ window 1 choice    ↑ window 2 choice
```

| Layer | Player experience | Implementation today |
|-------|-------------------|----------------------|
| **Async shell** | Deploy, go do something else, come back | `deployed_at` + `duration_seconds` → `resolveThumperState()` |
| **Event window** | One complication, a few buttons, done | **This lesson** — domain plan only |
| **Claim** | Pick up results | Later lesson — stacks + ledger |

The run can take real-world time. The **choices** should not. Each window is: read complication → pick matching action, hold, or Recall Early → move on. That is how an async frontier MMO stays playable on a phone between meetings.

Decision 005: absent players get conservative defaults later. This lesson only defines **what windows exist** for the tutorial — not how unresolved choices are penalized.

---

## 2. Complication → matching response (and why)

MVP locks four complication/action **pairs**. Each pair teaches a different gear fantasy:

| Complication | Matching action | What it proves in the toy |
|--------------|-----------------|---------------------------|
| **Signal Drift** | **Signal Tune** | Survey/signal clarity matters — lock onto the named resource you chose |
| **Hull Damage** | **Field Repair** | Condition/Integrity + repair kits matter (deferred in first session) |
| **Threat Surge** | **Suppress Threat** | Vanguard / hull survival under pressure |
| **Pump Strain** | **Clear Pump Problem** | Pump quality, recovery efficiency, waste — **without mutating named-resource stats** |

Decision 011 scripts the **first session** to use only the first and last rows:

```text
Window 1: Signal Drift  →  player may use Signal Tune
Window 2: Pump Strain   →  player may use Clear Pump Problem
```

**Why Signal Drift first:** You just surveyed and picked Veyrith Copper. Drift teaches “your lock on *this* signal can slip — signal gear/actions preserve the target.”

**Why Pump Strain second:** After signal lock, extraction teaches “getting ore out efficiently matters — pump problems create waste, not a worse stat roll on the copper.”

**Why Hull Damage is deferred:** Repair kits and Integrity trust should not appear before the player understands crafting/repair. First run stays survivable.

---

## 3. Four event actions vs Recall Early

Decision 004 locks exactly **four event actions**:

1. Signal Tune  
2. Field Repair  
3. Suppress Threat  
4. Clear Pump Problem  

**Recall Early** is **not** a fifth event action. It is a universal **safety choice**: stop accepting risk, keep secured progress, forfeit remaining projected recovery, end the run early. Safety valve, not combat.

```text
Event actions (4):     match specific complications during a window
Recall Early:          always available alongside them; ends the run early
```

The domain model should expose:

- `eventActions` — the four MVP actions (for UI copy / validation lists later)
- `safetyChoices` — `['recall_early']` — separate from the four
- `windows[]` — each window has one `complication` and one `matchingAction`

Tests must prove Recall Early is available but **not** counted among the four event actions.

---

## 4. Where this lives (domain only)

```text
packages/domain/src/thumper/
  types.ts                      ← complication, action, window types
  complicationActions.ts        ← locked pair map (all four pairs for types)
  generateFirstSessionEventWindows.ts
  generateFirstSessionEventWindows.test.ts
```

No Svelte, no Drizzle, no HTTP. Same pattern as `surveyRedMesaFirstSession()`.

The DB `thumper_runs` row still only stores timing + target. Persisting windows and player responses is **Lesson 3.4** (learning path) / next DB lesson.

---

## 5. Intended types

```typescript
// packages/domain/src/thumper/types.ts

/** Locked MVP complications (Decision 005). Tutorial uses two; types include all four for the pair map. */
export type ThumperComplicationId =
	| 'signal_drift'
	| 'hull_damage'
	| 'threat_surge'
	| 'pump_strain';

/** Locked MVP event actions (Decision 004) — exactly four. */
export type ThumperEventActionId =
	| 'signal_tune'
	| 'field_repair'
	| 'suppress_threat'
	| 'clear_pump_problem';

/** Universal safety choice — not an event action. */
export type ThumperSafetyChoiceId = 'recall_early';

export type ThumperEventWindow = {
	/** 1-based order in the run (window 1, window 2, …). */
	windowIndex: number;
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
};

export type ThumperEventWindowPlan = {
	windows: ThumperEventWindow[];
	/** The four MVP event actions (for menus / validation). */
	eventActions: readonly ThumperEventActionId[];
	/** Always includes recall_early; separate from eventActions. */
	safetyChoices: readonly ThumperSafetyChoiceId[];
};
```

---

## 6. Intended pair map + generator

```typescript
// packages/domain/src/thumper/complicationActions.ts
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

export const THUMPER_EVENT_ACTIONS = [
	'signal_tune',
	'field_repair',
	'suppress_threat',
	'clear_pump_problem'
] as const satisfies readonly ThumperEventActionId[];

export const THUMPER_SAFETY_CHOICES = ['recall_early'] as const;

export const COMPLICATION_MATCHING_ACTION: Record<
	ThumperComplicationId,
	ThumperEventActionId
> = {
	signal_drift: 'signal_tune',
	hull_damage: 'field_repair',
	threat_surge: 'suppress_threat',
	pump_strain: 'clear_pump_problem'
};

export function getMatchingAction(
	complication: ThumperComplicationId
): ThumperEventActionId {
	return COMPLICATION_MATCHING_ACTION[complication];
}
```

```typescript
// packages/domain/src/thumper/generateFirstSessionEventWindows.ts
import type { NamedResourceId } from '../resources/types.js';
import {
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './complicationActions.js';
import type { ThumperEventWindowPlan } from './types.js';

const FIRST_SESSION_TARGET: NamedResourceId = 'veyrith_copper';

const FIRST_SESSION_COMPLICATIONS = ['signal_drift', 'pump_strain'] as const;

/**
 * Decision 011 — first tutorial run on recommended Veyrith Copper:
 * exactly two windows, deterministic order, no RNG.
 */
export function generateFirstSessionEventWindows(input: {
	targetResourceId: NamedResourceId;
}): ThumperEventWindowPlan {
	if (input.targetResourceId !== FIRST_SESSION_TARGET) {
		throw new Error(
			`First-session event windows are only defined for ${FIRST_SESSION_TARGET}`
		);
	}

	const windows = FIRST_SESSION_COMPLICATIONS.map((complication, index) => ({
		windowIndex: index + 1,
		complication,
		matchingAction: COMPLICATION_MATCHING_ACTION[complication]
	}));

	return {
		windows,
		eventActions: THUMPER_EVENT_ACTIONS,
		safetyChoices: THUMPER_SAFETY_CHOICES
	};
}
```

(Import `COMPLICATION_MATCHING_ACTION` from `complicationActions.ts` in the real file.)

**Why throw for non-Veyrith targets?** First-session script is locked to the recommended path. Other targets get their own generators in later lessons when bloom/risk modes exist. Throwing avoids silently returning an empty list.

---

## 7. TDD — write these tests first

Create `packages/domain/src/thumper/generateFirstSessionEventWindows.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { THUMPER_EVENT_ACTIONS } from './complicationActions.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';

describe('generateFirstSessionEventWindows', () => {
	it('tutorial Veyrith Copper run gets Signal Drift then Pump Strain', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.windows).toHaveLength(2);
		expect(plan.windows.map((w) => w.complication)).toEqual([
			'signal_drift',
			'pump_strain'
		]);
		expect(plan.windows.map((w) => w.windowIndex)).toEqual([1, 2]);
	});

	it('each complication has the correct matching action', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.windows[0]).toMatchObject({
			complication: 'signal_drift',
			matchingAction: 'signal_tune'
		});
		expect(plan.windows[1]).toMatchObject({
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem'
		});
	});

	it('Recall Early is available but not counted as one of the four event actions', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.safetyChoices).toEqual(['recall_early']);
		expect(plan.eventActions).toEqual(THUMPER_EVENT_ACTIONS);
		expect(plan.eventActions).toHaveLength(4);
		expect(plan.eventActions).not.toContain('recall_early');
		expect(plan.safetyChoices).not.toEqual(plan.eventActions);
	});
});
```

Optional fourth test (pair map integrity):

```typescript
import { getMatchingAction } from './complicationActions.js';

it('pair map covers all four complications', () => {
	expect(getMatchingAction('signal_drift')).toBe('signal_tune');
	expect(getMatchingAction('hull_damage')).toBe('field_repair');
	expect(getMatchingAction('threat_surge')).toBe('suppress_threat');
	expect(getMatchingAction('pump_strain')).toBe('clear_pump_problem');
});
```

Run and confirm **red** before implementing:

```bash
pnpm --filter @async-frontier-mmo/domain test
```

---

## 8. Export from `packages/domain/src/index.ts`

Add exports (names may match your files):

```typescript
export {
	generateFirstSessionEventWindows,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES,
	getMatchingAction,
	COMPLICATION_MATCHING_ACTION
} from './thumper/...';
export type {
	ThumperComplicationId,
	ThumperEventActionId,
	ThumperSafetyChoiceId,
	ThumperEventWindow,
	ThumperEventWindowPlan
} from './thumper/types';
```

---

## 9. What we are not building yet

| Deferred | Why |
|----------|-----|
| DB `thumper_event_windows` rows | Need player response + audit lesson first |
| UI buttons for choices | Domain must be true before wiring actions |
| Resolution math (waste, wear, payout) | Needs response + run result types |
| Random / risk-based window count | Decision 005 allows 3 windows on push runs — later |
| Hull Damage / Threat Surge in generator | Not in Decision 011 first session |
| Jobs polling “open window” | HTTP + timestamps sufficient for MVP |
| Realtime combat | Explicitly out of MVP scope |

---

## 10. Apply + verify (implementation step)

1. Add `types.ts` and `complicationActions.ts`.
2. Add failing `generateFirstSessionEventWindows.test.ts`.
3. Implement `generateFirstSessionEventWindows.ts`.
4. Export from `packages/domain/src/index.ts`.
5. Run:

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

No web or db changes in this lesson.

---

## 11. Predict which files change

| File | Change |
|------|--------|
| `packages/domain/src/thumper/types.ts` | **New** — window/action/complication types |
| `packages/domain/src/thumper/complicationActions.ts` | **New** — pair map + constants |
| `packages/domain/src/thumper/generateFirstSessionEventWindows.ts` | **New** — tutorial generator |
| `packages/domain/src/thumper/generateFirstSessionEventWindows.test.ts` | **New** — three required tests |
| `packages/domain/src/index.ts` | Export new symbols |

Does **not** change: `resolveThumperState.ts`, `thumper_runs` schema, `+page.server.ts` (until a later UI lesson).

---

## Recap checklist

- [x] `generateFirstSessionEventWindows({ targetResourceId: 'veyrith_copper' })` returns 2 windows
- [x] Order: Signal Drift → Pump Strain
- [x] Matching actions: Signal Tune, Clear Pump Problem
- [x] `eventActions` length 4; `recall_early` only in `safetyChoices`
- [x] No RNG, no DB, no UI, no jobs
- [x] Domain tests + `pnpm check` pass

**Next exercise:** Persist event windows on the run (or child rows), record player responses, and resolve a minimal `ThumperRunResult` at claim — still deterministic tutorial payouts.
