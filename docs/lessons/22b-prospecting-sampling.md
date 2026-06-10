# Lesson 22b — Prospecting, sampling, and survey energy

> **Phase 6 / Lesson 6.5** — Decision 019: turn survey from a menu read into a bounded hunt — family scan → deposit spots → sample → stat reveal → deploy on a spot.

**Prerequisite:** Lessons 17 (Survey Clarity), 22 (bloom generator + rotation).

**Out of scope:** Travel/movement simulation, maps, pathfinding, full Red Mesa Survey screen (Lesson 7.2), Postgres `survey_energy` column (domain first; persistence in a follow-up).

**Learning goal:** Understand why **the rotation's range is hinted but the ceiling is earned** — and implement the pure domain rules that make hunting bounded (energy, wear) and rewarding (concentration yield, stat reveal).

---

## 1. Why the ceiling is earned, not read

SWG's survey loop was iterative: the tool showed concentration *hints*, players moved and resampled, and the **peak spot** had to be found — never displayed as a single truth upfront. Ceilings varied widely by spawn (some peaked in the 90s, others never exceeded the 60s–70s).

Decision 019 locks the same split for MVP:

| What the UI may show early | What must be earned |
|----------------------------|---------------------|
| Resources in a **family** this bloom | Which resource is worth your time |
| Rolled **concentration range** for the rotation (e.g. "30–67% this cycle") | The **true** spot concentration inside that range |
| Rough **bands** per deposit spot (wider with a weak scanner) | Exact concentration after **sample** |
| Nothing about the five stats | Full stat sheet after **first sample** on that resource |

```text
Scan family     →  "two conductive metals exist; Slag peaks ~30–55%, Veyrith ~45–67%"
Pick resource   →  3–5 abstract deposit spots with rough bands
Sample spot     →  true concentration + micro-trickle + (first time) stat reveal
Keep sampling?  →  spends energy + scanner Condition — hunt or deploy mid-grade
Deploy on spot  →  concentration multiplies extraction (~0.5×–1.5×); spot has finite units
```

**No maps.** Spots are abstract choices — the gameplay is *where to dig*, not *how to walk there*.

---

## 2. Survey energy (Farm RPG explore pattern)

Infinite rescans would collapse the hunt into a spreadsheet. Scans and samples spend a **regenerating survey-energy pool**:

```text
pilot.survey_energy (cap 100)
  family scan  → −8
  sample spot  → −12
  regen        → +2 per minute offline/online (tuning knob)
```

Better **Survey Clarity** does not grant free energy — it **reduces waste** by narrowing unsampled concentration bands so fewer samples are needed to find a good spot.

---

## 3. Scanner wear

Sampling and scanning call `applyRoutineUse` on the equipped Survey Scanner's **Condition** (Lesson 19). Hunting is paid in the repair economy:

| Action | Condition loss (MVP knob) |
|--------|---------------------------|
| Family scan | 2 |
| Sample spot | 3 |

---

## 4. Pure domain API

| Symbol | Role |
|--------|------|
| `generateDepositSpots` | 3–5 seeded spots per resource; true concentration inside bloom range |
| `unsampledSpotConcentrationBand` | Display band; narrows with Survey Clarity |
| `concentrationPercentToExtractionMultiplier` | Maps % → ~0.5×–1.5× (67% ≈ 1.0× SWG baseline) |
| `projectedRecoveryWithConcentration` | Base run recovery × spot multiplier |
| `resolveSurveyEnergy` | Regen + cap before spend |
| `scanFamilyProspect` | Lists family resources; stats hidden until sampled |
| `sampleDepositSpot` | Reveals spot, grants trickle once, first-sample stat reveal |
| `presentResourceStatsForPilot` | Per-pilot stat visibility gate |

```text
packages/domain/src/survey/
  prospectingSampling.ts
  prospectingSampling.test.ts
```

Deposit spots are deterministic from `bloomGenerationSeed + resourceSlug` — same bloom, same topology, auditable replay.

---

## 5. Concentration → extraction

SWG treated ~66–67% as base rate. MVP uses a simple ratio clamp:

```typescript
multiplier = clamp(concentrationPercent / 67, 0.5, 1.5)
```

Examples:

| Spot concentration | Multiplier |
|--------------------|------------|
| ~40% | ~0.6× |
| 67% | 1.0× |
| ~94% | ~1.4× |

Deploy stores the **sampled** spot's true concentration on the run; projected recovery uses `projectedRecoveryWithConcentration(base, spotPercent)`.

---

## 6. Pause — read the four tests before implementing

### Test 1 — Stats hidden until first sample (per pilot)

```typescript
it('hides resource stats until the pilot samples that resource once', () => {
  const resource = makeTestResource();
  const spots = generateDepositSpots({ ... });
  const progress = emptyPilotProgress();

  const before = presentResourceStatsForPilot({ resource, pilotProgress: progress });
  expect(before.statsVisible).toBe(false);
  expect(before.stats).toBeNull();

  const after = sampleDepositSpot({ resource, spot: spots[0]!, pilotProgress: progress, nowMs: 0 });
  const revealed = presentResourceStatsForPilot({
    resource,
    pilotProgress: after.pilotProgress
  });
  expect(revealed.statsVisible).toBe(true);
  expect(revealed.stats).toEqual(resource.stats);
});
```

Proves Decision 019's "surveying tells you what exists; sampling tells you what it's made of."

### Test 2 — Sample drains energy and grants trickle once

```typescript
it('spends survey energy and grants exactly one trickle grant per sample action', () => {
  const result = sampleDepositSpot({ ... pilotProgress with full energy ... });
  expect(result.energyCost).toBe(SAMPLE_ENERGY_COST);
  expect(result.pilotProgress.surveyEnergy).toBe(startEnergy - SAMPLE_ENERGY_COST);
  expect(result.trickleGrant).toEqual({ resourceSlug: resource.resourceSlug, quantity: SAMPLE_TRICKLE_UNITS });
});
```

### Test 3 — Survey Clarity narrows bands

```typescript
it('narrows unsampled spot concentration bands as Survey Clarity improves', () => {
  const spot = { trueConcentrationPercent: 55, ... };
  const low = unsampledSpotConcentrationBand({ ..., surveyClarityScore: 20 });
  const high = unsampledSpotConcentrationBand({ ..., surveyClarityScore: 85 });
  expect(high.maxPercent - high.minPercent).toBeLessThan(low.maxPercent - low.minPercent);
});
```

### Test 4 — Better spot out-yields worse spot

```typescript
it('deploying on a ~1.4× spot out-yields the same run on a ~0.6× spot', () => {
  const base = DEFAULT_PROJECTED_RECOVERY;
  const poor = projectedRecoveryWithConcentration(base, 40);
  const rich = projectedRecoveryWithConcentration(base, 94);
  expect(rich).toBeGreaterThan(poor);
});
```

**Your turn:** run the tests red, then implement `prospectingSampling.ts`. Say "apply it" if you want the coach to paste the module.

---

## 7. Server flow (next wiring — not this lesson's TDD)

```text
POST ?/scanFamily     → resolveSurveyEnergy → scanFamilyProspect → ledger survey_scan
POST ?/sampleSpot     → sampleDepositSpot → trickle stack + ledger sample_grant
POST ?/deployThumper  → require sampled spot → store spot_id + concentration on run
```

Load merges `pilotSurveyProgress` from DB (future column or `pilot_survey_progress` JSON).

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test prospectingSampling
pnpm check
```

---

## 9. Recap

**Learned:** Concentration range is a spawn hint; peak spot and stats are earned through bounded sampling. Survey Clarity improves reads, not world stats. Extraction scales with sampled concentration.

**Files:** `prospectingSampling.ts`, `prospectingSampling.test.ts`.

**Next exercise:** Lesson 7.1 — Pilot Home with frame choice (`docs/lessons/23-pilot-home-frame-choice.md`), then Lesson 7.2 Survey screen wiring family scan + sample flow.
