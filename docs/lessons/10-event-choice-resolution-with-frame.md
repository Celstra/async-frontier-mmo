# Lesson 10 — Store event choices and resolve run result (with frame input)

> **Exercise:** Persist tutorial event-window responses, resolve a deterministic **Thumper Run Result** at claim with the pilot's **frame** as a resolution input, and prove the payout is explainable — without resource stacks, ledger grants, or jobs yet.

**Prerequisite:** Lesson 09 complete (`generateFirstSessionEventWindows`, complication/action pair map). Lesson 10 (pre-frame) DB path may already exist; this lesson **extends** resolution with `FrameId` and a `pilots` row.

**Out of scope:** `resource_stacks`, economy ledger mutations, item wear on claim, random complications, Hull Damage / Threat Surge in the tutorial resolver, jobs/workers, frame selection UI (Lesson 7.1), full six-screen Thumper Run UI.

**Learning goal:** Understand **auditability** (server-stored choices explain payouts) and why **frame is resolution input**, not UI decoration.

---

## 1. Auditability — why the server must explain payouts

Decision 012 asks eight audit questions. The thumper-relevant one:

> What thumper run produced which resources, waste, wear, damage, and salvage?

If claim only flips `claimed_at` with no record of event choices, you cannot answer that. A player who receives Veyrith Copper must be able to trace:

```text
deploy on veyrith_copper (recon frame)
→ window 1 Signal Drift: chose Signal Tune
→ window 2 Pump Strain: chose Clear Pump Problem
→ recovered 65, waste 0, stats unchanged
```

**Auditability** means: given a `thumper_run_id`, reload window rows + pilot frame + run result and reproduce the explanation. No guessing from browser memory.

---

## 2. Why choices are stored, not hidden in UI state

| Approach | Problem |
|----------|---------|
| **UI-only state** | Refresh loses choices; two tabs disagree; claim cannot be authoritative |
| **Server-stored responses** | Claim reads DB; idempotent respond; future ledger cites run result |

The browser shows buttons. The **database** owns what the player chose. Same pattern as idempotent claim (Lesson 03): the server is the source of truth.

```text
respond action  →  UPDATE thumper_event_windows SET chosen_response = …
claim action    →  read windows + pilot.frame_id  →  domain resolve  →  INSERT thumper_run_results  →  claimed_at
```

---

## 3. Why frame is a resolution input, not UI decoration

Decision 004 locks frame verbs: Recon → Signal Tune, Engineer → Field Repair (+ pump-clear bonus), Vanguard → Suppress Threat.

A frame badge on the HUD does nothing for gameplay. Frame only matters when it **changes math** at resolution time:

```text
same complication + same chosen action + different frame  →  different recovered quantity
```

That is why `resolveThumperRunResult` accepts `pilotFrame` alongside run config, event windows, and responses. Lesson 7.1 will add frame **selection** UI; this lesson wires the **parameter** so Phases 5–7 do not force a rewrite.

Frame bonuses are **data-driven** in `frameActionEffects.ts` — a lookup table, not `if (frame === 'recon')` branches scattered through the resolver.

| Frame | Specialized action | MVP bonus (tutorial-visible) |
|-------|-------------------|------------------------------|
| **recon** | Signal Tune | +5 recovery on matching Signal Drift response |
| **engineer** | Field Repair; Clear Pump Problem | +6 recovery on matching Pump Strain response (+ Field Repair when Hull Damage arrives in Lesson 11) |
| **vanguard** | Suppress Threat | +5 recovery when Threat Surge windows exist (Lesson 11) |

**Immutable stats rule (Decision 005):** Bad choices change **quantity / waste**, never spawn a worse-stat stack of Veyrith Copper.

---

## 4. What to record

### Per event window (`thumper_event_windows`)

| Field | Purpose |
|-------|---------|
| `thumper_run_id` | Parent run |
| `window_index` | Order (1, 2, …) |
| `complication` | e.g. `signal_drift` (frozen at deploy) |
| `matching_action` | Correct response at deploy time (frozen) |
| `chosen_response` | Matching action id, or `hold` |
| `responded_at` | When the server recorded the choice |

### Per pilot (`pilots`)

| Field | Purpose |
|-------|---------|
| `id` | Pilot id (`demo-pilot` for scaffold) |
| `frame_id` | `recon` \| `engineer` \| `vanguard` — default `recon` until Lesson 7.1; validated at read time via `parseFrameId()` |

### Per run (`thumper_runs`)

| Field | Purpose |
|-------|---------|
| `pilot_frame_id` | Frame **snapshotted at deploy** — part of run config; claim replays this value, not the pilot's current frame |

### Thumper Run Result (written at claim)

| Field | Purpose |
|-------|---------|
| `thumper_run_id` | One result per run (unique) |
| `target_resource_id` | Named resource — stats from domain catalog, not this row |
| `projected_recovery` | Base extraction before penalties/bonuses |
| `recovered_quantity` | Claimable units |
| `waste_quantity` | Lost to drift/strain penalties |
| `explanation` | Human-readable chain (includes frame bonuses) |
| `resolved_at` | Server timestamp |

---

## 5. Domain first — `resolveThumperRunResult`

Pure function in `packages/domain/src/thumper/resolveThumperRunResult.ts`:

Resolution uses each window's **stored** `matchingAction` (frozen at deploy), not `getMatchingAction(complication)` from current code — so old runs replay identically if the pair map changes later.

```typescript
resolveThumperRunResult({
  runConfig: {
    targetResourceId: 'veyrith_copper',
    projectedRecovery: 60,
    recoveryFloor: 40,
    runSeed: 'tutorial-veyrith'
  },
  eventWindows: [
    { windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' }, // from DB row
    { windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
  ],
  responses: [
    { windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
    { windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
  ],
  pilotFrame: 'recon'
})
// → { projectedRecovery: 60, recoveredQuantity: 65, wasteQuantity: 0, explanation: '…' }
```

`resolveFirstSessionThumperRunResult` is a thin wrapper that supplies the Decision 011 tutorial windows and constants.

### TDD tests (`resolveThumperRunResult.test.ts`)

1. **Frame specialty** — same window + same response resolves better for the matching frame than a non-matching frame.
2. **Hold penalty** — holding/ignoring a complication applies bounded, predictable waste (`signal_drift` 10, `pump_strain` 15).
3. **Determinism** — same `runSeed` + choices + frame → identical result object.

---

## 6. Shared type — `FrameId`

```typescript
// packages/shared/src/index.ts
export type FrameId = 'recon' | 'engineer' | 'vanguard';
```

Shared so web, db, and domain all agree on the literal union without circular imports.

---

## 7. DB second — `pilots` + existing window/result tables

Migration: `0005_pilots_frame.sql` — seeds `demo-pilot` with `frame_id = 'recon'`.

| Function | Role |
|----------|------|
| `ensureDemoPilot` | Idempotent scaffold seed |
| `getPilotFrame` | Read frame for claim resolution |
| `insertThumperEventWindows` | Seed rows from domain plan (deploy) |
| `recordThumperEventWindowResponse` | Idempotent: only if `chosen_response IS NULL` |
| `insertThumperRunResult` | Store resolved payout |
| `claimOpenThumperRunForPilot` | Winner-gated claim transaction |

---

## 8. Web flow (minimal)

```text
load            →  ensureDemoPilot  →  pilotFrame: 'recon' (current pilot row)
deploy (veyrith)  →  snapshot pilot_frame_id on run + 2 window rows (each with matching_action)
respond         →  POST windowIndex + chosenResponse
claim           →  read run.pilot_frame_id + window rows  →  resolve  →  result row  →  claimed_at
```

No frame picker yet — `pilotFrame` is exposed on load for dev visibility; selection UI is Lesson 7.1.

---

## 9. What we defer

| Deferred | Lesson |
|----------|--------|
| Frame selection UI | Lesson 7.1 |
| Resource stacks + ledger grant | Lesson 4.1 |
| Hull Damage / Threat Surge windows | Lesson 11 |
| Component wear on result | Later durability lesson |
| Recall Early resolution path | Separate exercise |
| Jobs / absent-player auto-hold | Later |

---

## Recap checklist

- [x] `FrameId` in `packages/shared`
- [x] `pilots` table with demo pilot default `recon` + `parseFrameId()` guard
- [x] `thumper_runs.pilot_frame_id` snapshotted at deploy
- [x] Resolution uses stored `matching_action` per window row
- [x] `resolveThumperRunResult({ runConfig, eventWindows, responses, pilotFrame })`
- [x] Data-driven frame bonuses in `frameActionEffects.ts`
- [x] TDD: frame specialty, hold penalty, determinism
- [x] Claim reads pilot frame and passes it to domain
- [x] No stat mutation; quantity/waste only
- [x] No inventory stacks or jobs

**Verification:**

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate   # if needed
pnpm --filter @async-frontier-mmo/db db:smoke
```

**Next exercise:** Claim grants `recovered_quantity` into `resource_stacks` with an `economy_ledger` row citing `thumper_run_result_id` — or Lesson 11 for full complication table and seeded run generation.

---

## 10. Transaction / idempotency boundaries

| Operation | Boundary |
|-----------|----------|
| **Deploy** | `deployThumperRunWithEventWindows()` — run + windows in one transaction |
| **Claim** | `claimOpenThumperRunForPilot()` — validate windows → conditional `claimed_at` update wins → only winner inserts `thumper_run_result` |
| **Duplicate claim** | No open run + latest already claimed → return `{ claimed: true, claimResult: existing }` |
| **Veyrith tutorial** | `assertVeyrithTutorialWindowsReady()` — exactly 2 windows, drift then strain, all answered |

Winner gate SQL shape:

```sql
UPDATE thumper_runs
SET claimed_at = now()
WHERE id = $1 AND claimed_at IS NULL
RETURNING *;
```
