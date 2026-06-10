# Lesson 11 — Full complication table and seeded run generation

> **Exercise:** Extend the domain thumper model with all four Decision 005 complications, deterministic seeded window generation for repeat play, push-run third windows, and Field Repair kit gating — without realtime combat, jobs, or WebSockets.

**Prerequisite:** Lessons 09–10 complete (event window types, stored choices, frame-aware resolution).

**Out of scope:** Recall Early resolution math (next lesson), inventory/Field Repair Kit stacks (Lesson 6.2), full Thumper Run UI, jobs/workers, WebSockets, Hull Damage on the tutorial first session (Decision 011).

**Learning goal:** Understand **seeded determinism** (auditable replay) vs hidden server randomness, and why **Field Repair is kit-gated** instead of free.

---

## 1. Seeded determinism vs hidden server randomness

| Approach | Audit question it fails |
|----------|-------------------------|
| `Math.random()` at deploy, seed not stored | “Why did *this* run get Hull Damage window 2?” — unanswerable after the fact |
| Server picks complications in memory, never persists | Claim/replay cannot reproduce the same windows |
| **Stored `run_seed` + pure domain generator** | Reload `run_seed` + `is_push_run` → `generateSeededThumperEventWindows()` → identical windows |

```text
deploy  →  server stores run_seed on thumper_runs
         →  domain.generateSeededThumperEventWindows({ runSeed, isPushRun })
         →  insert frozen window rows (complication + matching_action)
claim   →  resolution reads stored rows, not a fresh roll
```

The server may **generate** a new UUID seed at deploy time. What matters is that the seed is **stored** and generation is a **pure function** — same inputs, same windows, every time.

Tutorial first session is the exception: Decision 011 scripts Signal Drift → Pump Strain with seed `first-session-scripted` and no push option.

---

## 2. Why Field Repair is gated on kit ownership

Decision 004: **Field Repair spends a crafted Field Repair Kit** — it restores Condition and reduces Integrity risk during a run. It is not a free verb.

If Hull Damage appears and Field Repair were always enabled:

- Repair kits would have no economy value before Lesson 6.2.
- Absent players could not be given a conservative default (“no kits spent automatically” — Decision 005).

Until kits exist in inventory, the UI still **lists** Field Repair on Hull Damage windows so players learn the verb exists, but marks it **disabled** with a clear reason. **Hold** and **Recall Early** stay available.

```typescript
getEventWindowResponseOptions({
  complication: 'hull_damage',
  matchingAction: 'field_repair', // frozen from DB row
  fieldRepairKitCount: 0
})
// → field_repair disabled, hold + recall_early enabled
```

---

## 3. Full complication table (Decision 005)

| Complication | Matching response | Frame specialty |
|--------------|-------------------|-----------------|
| Signal Drift | Signal Tune | Recon |
| Hull Damage | Field Repair | Engineer (requires kit) |
| Threat Surge | Suppress Threat | Vanguard |
| Pump Strain | Clear Pump Problem | Engineer pump bonus |

Each window offers exactly **three** choices: matching action, **hold**, **Recall Early** (resolution deferred to next lesson).

---

## 4. Run shapes

| Mode | Windows | Projected recovery (MVP constants) | When |
|------|---------|--------------------------------------|------|
| **Tutorial** | 2 — scripted Drift → Strain | 60 | First Veyrith Copper run only |
| **Default** | 2 — seeded from 4 complications | 60 | Non-tutorial deploy |
| **Push** | 3 — seeded, no repeat complications | 80 | `is_push_run` at deploy (non-tutorial) |

Push runs trade **higher risk** (extra complication window) for **higher projected recovery**. Tutorial rejects push mode.

---

## 5. Domain layout

```text
packages/domain/src/thumper/
  complicationTable.ts              ← all four complications + pair rows
  seededRng.ts                      ← hash seed string → deterministic PRNG
  generateSeededThumperEventWindows.ts
  generateThumperEventWindows.ts      ← tutorial vs seeded router
  getEventWindowResponseOptions.ts  ← kit gate + hold + Recall Early menu
```

### Seeded generation

```typescript
generateSeededThumperEventWindows({
  runSeed: 'red-mesa-bloom-42',
  targetResourceId: 'keth_iron',
  isPushRun: false
})
// → { windows: [...], runSeed, isPushRun, windowCount: 2, projectedRecovery: 60, ... }
```

### Tutorial router

```typescript
generateThumperEventWindows({
  targetResourceId: 'veyrith_copper',
  runSeed: TUTORIAL_RUN_SEED,
  isPushRun: false,
  isTutorialRun: true
})
// → Drift then Strain; throws if isPushRun is true
```

---

## 6. DB — store seed and push flag on the run

Migration `0007_thumper_runs_seed_push.sql`:

| Column | Purpose |
|--------|---------|
| `run_seed` | Replay input for window generation |
| `is_push_run` | Whether deploy requested a third window |

Deploy writes seed + windows in one transaction (same pattern as Lesson 10).

---

## 7. TDD checklist

| Test | Proves |
|------|--------|
| Same seed → same windows | Deterministic generation |
| Push vs default window count | 3 vs 2 windows; push has higher `projectedRecovery` |
| Each complication → matching + hold + recall | Decision 005 menu shape; Field Repair disabled without kit |
| Tutorial Drift → Strain | Decision 011 unchanged |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

---

## 8. Server and UI enforcement

| Concern | Implementation |
|---------|----------------|
| Field Repair kit gate | `validateEventWindowResponse()` on respond; UI renders `responseOptions` (disabled buttons + reason) |
| Tutorial vs seeded deploy | `isTutorialThumperDeploy({ targetResourceId, hasCompletedTutorial })` — only first unclaimed-tutorial Veyrith run is scripted |
| Non-tutorial claim | `claimOpenThumperRunForPilot` returns `not_resolvable` unless `run_seed === TUTORIAL_RUN_SEED` — no `claimed_at` without a result row |
| Push at deploy | Checkbox on deploy form after first tutorial claim; server ignores push on tutorial deploy |

---

## 9. What we defer

| Deferred | Lesson |
|----------|--------|
| Recall Early resolution | Next lesson |
| Field Repair Kit inventory (`fieldRepairKitCount > 0`) | Lesson 6.2 |
| Seeded run claim resolution (all four complications) | After repeat-play resolver lesson |
| Polished push / deploy UI | Lesson 7.3 |

---

## Recap checklist

- [x] Four complications in `THUMPER_COMPLICATION_TABLE`
- [x] `generateSeededThumperEventWindows` — pure, seed-driven
- [x] Push runs → 3 windows; default → 2
- [x] Tutorial scripted Drift → Strain; no push
- [x] `getEventWindowResponseOptions` + `validateEventWindowResponse` — Field Repair disabled without kit (UI + server)
- [x] `hasPilotCompletedTutorialThumper` + `isTutorialThumperDeploy` — first Veyrith only is scripted
- [x] Non-tutorial runs cannot claim until resolver exists (`not_resolvable`)
- [x] Push checkbox on deploy after tutorial complete
- [x] `thumper_runs.run_seed` + `is_push_run` stored at deploy
- [x] No jobs, WebSockets, or realtime combat

**Next exercise:** Recall Early resolution path, or wire non-tutorial claim resolution using stored seed + all four complication penalties.
