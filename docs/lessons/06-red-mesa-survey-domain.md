# Lesson 06 — Red Mesa survey result (domain only)

> **Exercise:** Add a pure domain function that returns the **first-session** Red Mesa survey comparison set — three deterministic signals with enough display info for a beginner to compare, and Veyrith Copper marked as the recommended thump target.

**Prerequisite:** Lesson 05 complete (`RED_MESA_BLOOM_RESOURCES`, resource types, documentation tests green).

**Out of scope:** Postgres `survey_logs`, bloom rotation RNG, full Red Mesa Survey UI screen, scanner upgrades, exact stat values on first survey.

---

## 1. What “survey” means in the MVP loop

Survey is the first step of the core toy:

```text
Survey → compare signals → deploy thumper → events → claim → craft → survey better
```

Decision 011 locks the **first** Red Mesa survey to exactly three signals:

| Signal | Teaching role |
|--------|----------------|
| **Keth Iron** | Safe baseline structural material |
| **Veyrith Copper** | Obvious exciting high-Conductivity find (**recommended**, not forced) |
| **Thornwake Crystal** | Tempting specialist with dangerous tradeoffs |

The player should be able to **compare** named resources before deploying a thumper — not blindly click the first row.

Decision 010 adds a display rule for early survey:

> Survey screens reveal **hints and bands** first. Claimed resources and crafting previews may show exact values.

So the first-session domain result should carry **comparison-friendly** fields (name, family, band hints, short teaching copy) — not necessarily the full internal stat sheet.

---

## 2. Deterministic tutorial data vs later world rotation

Two different problems get mixed up if you build one big “survey” function too early:

| Concern | First-session / prototype now | Production bloom later |
|---------|------------------------------|-------------------------|
| **Goal** | Teach resource identity and comparison | Simulate a living frontier deposit field |
| **Signal count** | Exactly 3 (Decision 011) | May show 2–3 from active bloom subset |
| **Which resources** | Always Keth / Veyrith / Thornwake for onboarding | Depends on active `resource_instance` rows |
| **Randomness** | None — same result every call | Irregular lifespans, despawn, rotation cadence (Decision 006) |
| **Persistence** | Pure function return value | `survey_completed` ledger + optional `survey_logs` (Decision 012) |
| **Scanner upgrades** | Not modeled yet | Clearer bands, extra clues (post–Mk I scanner) |

```text
NOW (lesson 06):
  surveyRedMesaFirstSession()  →  always the same 3 signals + recommendation

LATER (separate lessons):
  getActiveBloomInstances(db)  →  filter by region/scanner  →  build signal list
  advanceBloomCadence(job)     →  rotation / despawn
```

**Why keep them separate:** onboarding must stay readable for playtests (Decision 013). If your first survey already calls `Math.random()` or reads bloom rotation, you cannot tell whether testers failed to understand **resource stats** or just got a confusing random draw.

This lesson builds the **tutorial-shaped** branch only. It imports resource definitions from Lesson 05 (`getRedMesaResource`) so signal display stays tied to the canonical catalog.

---

## 3. Pause — what should the survey action output?

Before any edits, reply in chat with **your design** for the return shape.

Think about what a beginner needs on the **Red Mesa Survey** screen to compare three signals without a spreadsheet:

- How many signals?
- Per signal: which fields? (id, display name, family, stat bands, flavor text, threat hint, …)
- How do we mark **recommended** without **forcing** Veyrith Copper?
- Should exact stat numbers appear on the **first** survey, or only bands/hints (Decision 010)?

Example starter prompt (you may agree, change, or replace):

```typescript
type SurveySignal = {
  resourceId: NamedResourceId;
  displayName: string;
  family: ResourceFamily;
  teachingNote: string;           // one-line “why this matters”
  statHints: { stat: ResourceStatCode; band: StatBand }[];
  recommended: boolean;
};

type RedMesaSurveyResult = {
  regionId: 'red_mesa';
  signals: SurveySignal[];
  recommendedResourceId: NamedResourceId;
};
```

**Your turn:** describe (or sketch in TypeScript) what `surveyRedMesa…()` should return. The coach will confirm against Decision 011/010, then you predict files or say “apply it.”

<details>
<summary>Coach reference (after you reply)</summary>

Reasonable MVP first-session output:

- **Exactly 3 signals**, fixed order or stable sort — Keth Iron, Veyrith Copper, Thornwake Crystal.
- **Per signal:** `resourceId`, `displayName`, `family`, short `teachingNote`, 2–3 **band** hints on stats that sell the personality (e.g. Veyrith → Exceptional Conductivity, Weak Hardness; Thornwake → Exceptional Conductivity, Poor Heat Resistance).
- **Recommendation:** `recommended: true` only on Veyrith Copper **or** a top-level `recommendedResourceId: 'veyrith_copper'` — UI can highlight without blocking other choices.
- **No exact stat integers** on first survey (bands only); exact values come after claim / crafting preview.
- **Deterministic:** no `Date.now()`, no RNG, no DB.

Optional later: `surveyClarityLevel` input when the scanner module exists; first session uses `0` or `'basic_scanner_mk_0'`.

</details>

---

## 4. Target module shape

Suggested files under `packages/domain/src/survey/`:

```text
packages/domain/src/survey/
  types.ts                      # SurveySignal, RedMesaSurveyResult, StatBand (if not lesson 05.5)
  statBand.ts                   # getStatBand(value) — optional if you skipped lesson 05 next exercise
  redMesaSurvey.ts              # surveyRedMesaFirstSession()
  redMesaSurvey.test.ts         # three documentation tests
```

If `StatBand` / `getStatBand` do not exist yet, this lesson may include a minimal band mapper (Decision 010 table) **or** hardcode band labels in the three teaching signals only. Prefer the small `getStatBand` helper if you want reuse in lesson 07+.

### Function sketch

```typescript
/** First-session onboarding survey — deterministic, Decision 011. */
export function surveyRedMesaFirstSession(): RedMesaSurveyResult {
  // compose from getRedMesaResource(...) + band hints + teaching notes
}
```

Export from `packages/domain/src/index.ts`.

---

## 5. TDD — three documentation tests

Write these in `redMesaSurvey.test.ts` first.

### Test 1 — exact starter comparison set

```typescript
it('returns exactly the first-session starter comparison set', () => {
  const result = surveyRedMesaFirstSession();

  expect(result.signals).toHaveLength(3);
  expect(result.signals.map((s) => s.resourceId)).toEqual([
    'keth_iron',
    'veyrith_copper',
    'thornwake_crystal'
  ]);
});
```

Proves Decision 011’s three-signal teaching set — not six, not random.

### Test 2 — Veyrith Copper recommended

```typescript
it('recommends Veyrith Copper without removing other signals', () => {
  const result = surveyRedMesaFirstSession();

  expect(result.recommendedResourceId).toBe('veyrith_copper');
  const veyrith = result.signals.find((s) => s.resourceId === 'veyrith_copper');
  expect(veyrith?.recommended).toBe(true);
  expect(result.signals.filter((s) => s.recommended)).toHaveLength(1);
});
```

Proves highlight ≠ sole option — other signals remain choosable in UI later.

### Test 3 — beginner comparison display info

```typescript
it('includes enough display info for a beginner to compare signals', () => {
  const result = surveyRedMesaFirstSession();

  for (const signal of result.signals) {
    expect(signal.displayName.length).toBeGreaterThan(0);
    expect(signal.family).toBeTruthy();
    expect(signal.teachingNote.length).toBeGreaterThan(10);
    expect(signal.statHints.length).toBeGreaterThanOrEqual(2);
    for (const hint of signal.statHints) {
      expect(hint.band).toBeTruthy();
    }
  }
});
```

Proves each signal is self-explanatory on a text-first survey screen — name, family, teaching line, multiple band hints.

Optional stretch test:

```typescript
it('does not expose exact internal stat values on first survey', () => {
  const result = surveyRedMesaFirstSession();
  for (const signal of result.signals) {
    expect(signal).not.toHaveProperty('stats');
  }
});
```

---

## 6. Teaching notes to embed (Decision 011)

Use these as `teachingNote` copy (paraphrase ok):

| Resource | Note direction |
|----------|----------------|
| Keth Iron | Reliable structural baseline; safe default |
| Veyrith Copper | Strong Conductivity; great first craft target for Survey Scanner Mk I |
| Thornwake Crystal | High Conductivity but harsh tradeoffs — tempting, risky |

Band hints should match Lesson 05 stats via `getStatBand(resource.stats.conductivity)` etc., not duplicate magic numbers in the survey file.

---

## 7. Predict which files change

Before editing, list every file you expect to touch.

Hints:

- Does survey import from `resources/redMesaBloom.ts`?
- New `survey/` folder vs extending `resources/`?
- Does `shared` or `web` change in this lesson?
- Do thumper tests change?

Reply in chat. Coach confirms → failing tests → implementation → green.

---

## 8. Apply + verify (coach step)

After your output-shape answer and file prediction:

1. Add survey types (+ optional `getStatBand`).
2. Add failing `redMesaSurvey.test.ts`.
3. Implement `surveyRedMesaFirstSession()`.
4. Export from `packages/domain/src/index.ts`.
5. Run:

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

---

## Recap checklist

- [ ] `surveyRedMesaFirstSession()` returns 3 deterministic signals
- [ ] Roster: Keth Iron, Veyrith Copper, Thornwake Crystal
- [ ] Veyrith Copper marked recommended (Decision 011)
- [ ] Each signal has display name, family, teaching note, band hints
- [ ] No DB, no RNG, no full survey UI
- [ ] Domain tests + `pnpm check` pass

**Next exercise:** Wire `surveyRedMesaFirstSession()` into a minimal SvelteKit `load` on the home or survey route — display text-only signal list, still no deploy action changes.
