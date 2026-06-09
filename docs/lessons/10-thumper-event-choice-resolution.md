# Lesson 10 — Store event choices and resolve run result

> **Exercise:** Persist tutorial event-window responses, resolve a deterministic **Thumper Run Result** at claim, and prove the payout is explainable — without resource stacks, ledger grants, or jobs yet.

**Prerequisite:** Lesson 09 complete (`generateFirstSessionEventWindows`, complication/action pair map).

**Out of scope:** `resource_stacks`, economy ledger mutations, item wear on claim, random complications, Hull Damage / Threat Surge in the tutorial resolver, jobs/workers, full six-screen Thumper Run UI.

**Learning goal:** Understand **auditability** — every claimable payout must be reconstructable from stored choices, not from browser memory.

---

## 1. Auditability — why the server must explain payouts

Decision 012 asks eight audit questions. The thumper-relevant one:

> What thumper run produced which resources, waste, wear, damage, and salvage?

If claim only flips `claimed_at` with no record of event choices, you cannot answer that. A player who receives Veyrith Copper must be able to trace:

```text
deploy on veyrith_copper
→ window 1 Signal Drift: chose Signal Tune
→ window 2 Pump Strain: chose Clear Pump Problem
→ recovered 60, waste 0, stats unchanged
```

**Auditability** means: given a `thumper_run_id`, reload window rows + run result and reproduce the explanation. No guessing from UI state.

---

## 2. Why choices are stored, not hidden in UI state

| Approach | Problem |
|----------|---------|
| **UI-only state** | Refresh loses choices; two tabs disagree; claim cannot be authoritative |
| **Server-stored responses** | Claim reads DB; idempotent respond; future ledger cites run result |

The browser shows buttons. The **database** owns what the player chose. Same pattern as idempotent claim (Lesson 03): the server is the source of truth.

```text
respond action  →  UPDATE thumper_event_windows SET chosen_response = …
claim action    →  read windows  →  domain resolve  →  INSERT thumper_run_results  →  claimed_at
```

---

## 3. What to record per event window

MVP **Thumper Event Window** audit row (minimal tutorial shape):

| Field | Purpose |
|-------|---------|
| `thumper_run_id` | Parent run |
| `window_index` | Order (1, 2, …) |
| `complication` | e.g. `signal_drift` |
| `matching_action` | Correct response at deploy time (frozen) |
| `chosen_response` | What the player picked: matching action id, or `hold` |
| `responded_at` | When the server recorded the choice |

**Not stored yet:** before/after run-state JSON, component wear deltas, absent-player auto-resolution timestamps.

**Thumper Run Result** row (written at claim):

| Field | Purpose |
|-------|---------|
| `thumper_run_id` | One result per run (unique) |
| `target_resource_id` | Named resource granted later — stats come from domain catalog, not this row |
| `projected_recovery` | Base extraction before penalties |
| `recovered_quantity` | Claimable units (quantity only — **not** stat mutation) |
| `waste_quantity` | Lost to drift/strain penalties |
| `explanation` | Human-readable why |
| `resolved_at` | Server timestamp |

**Immutable stats rule (Decision 005):** Bad choices change **quantity / waste**, never spawn a worse-stat stack of Veyrith Copper.

---

## 4. Domain first — `resolveFirstSessionThumperRunResult`

Pure function in `packages/domain`:

```typescript
resolveFirstSessionThumperRunResult({
  targetResourceId: 'veyrith_copper',
  responses: [
    { windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
    { windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
  ]
})
// → { projectedRecovery: 60, recoveredQuantity: 60, wasteQuantity: 0, explanation: '…' }
```

Tutorial constants (tunable):

- `FIRST_SESSION_PROJECTED_RECOVERY = 60`
- `FIRST_SESSION_SCANNER_MINIMUM = 40` — Decision 011 floor so first claim still crafts Survey Scanner Module Mk I
- Penalties: hold/wrong action adds waste per window; `recovered = max(SCANNER_MINIMUM, projected - waste)`

### TDD tests (`resolveFirstSessionThumperRunResult.test.ts`)

1. Both matching actions → full recovery, zero waste.
2. Hold on Pump Strain → waste > 0, lower recovery, still `targetResourceId: 'veyrith_copper'` (no stat fields).
3. First-session floor → even double-hold recovers at least `FIRST_SESSION_SCANNER_MINIMUM`.

---

## 5. DB second — tables and queries

### `thumper_event_windows`

Created on deploy when tutorial plan exists (Veyrith first session).

### `thumper_run_results`

Inserted inside claim transaction after domain resolve.

### Queries

| Function | Role |
|----------|------|
| `insertThumperEventWindows` | Seed rows from domain plan |
| `getThumperEventWindowsForRun` | Load for UI + claim |
| `recordThumperEventWindowResponse` | Idempotent: only if `chosen_response IS NULL` |
| `insertThumperRunResult` | Store resolved payout |
| `getThumperRunResultForRun` | Read after claim |

Migration: `0004_thumper_event_windows_and_results.sql`

---

## 6. Web flow (minimal)

```text
deploy (veyrith)  →  run + 2 window rows
load              →  windows + response status
respond           →  POST windowIndex + chosenResponse (validate server-side)
claim             →  require all windows responded → resolve → result row → claimed_at
```

UI: text-only complication labels + Match / Hold buttons per open window; dev note shows result after claim.

---

## 7. What we defer

| Deferred | Lesson |
|----------|--------|
| Resource stacks + ledger grant | Lesson 4.1 |
| Component wear on result | Later durability lesson |
| Recall Early resolution path | Safety choice ends run early — separate exercise |
| Absent-player auto-hold | Async default behavior — later |
| Non-Veyrith generators | After bloom/risk modes |

---

## Recap checklist

- [x] Domain resolver with tests for matching, hold penalty, scanner floor
- [x] `thumper_event_windows` + `thumper_run_results` tables
- [x] Deploy seeds windows; respond stores choice; claim writes result
- [x] No stat mutation; quantity/waste only
- [x] No inventory stacks yet
- [x] `pnpm --filter @async-frontier-mmo/domain test` + `pnpm check` + `db:smoke`

**Next exercise:** Claim grants `recovered_quantity` into `resource_stacks` with an `economy_ledger` row citing `thumper_run_result_id`.
