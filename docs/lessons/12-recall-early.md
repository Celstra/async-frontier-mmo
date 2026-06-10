# Lesson 12 — Recall Early (universal safety choice)

> **Exercise:** Add **Recall Early** as a safety valve at every event window: end the run before the next complication, keep secured recovery, forfeit remaining projected extraction, and record `resolution_type` for audit — without extra penalties in MVP.

**Prerequisite:** Lessons 10–11 complete (stored choices, frame resolution, full complication table, `getEventWindowResponseOptions`).

**Out of scope:** Component wear math on windows (pass-through `appliedWear` only), Recall on seeded non-tutorial claim resolution, inventory grants, jobs, WebSockets.

**Learning goal:** Understand **loss-aversion design** — a visible, neutral exit increases willingness to take thumper risk.

---

## 1. Loss aversion and the safety valve

Players feel losses roughly twice as strongly as equivalent gains. A thumper run with no exit reads as “all or nothing” — so players avoid deploying, push only on safe signals, or rage-quit when Pump Strain appears.

**Recall Early** (Decision 004/005) is not a failure state. It is a **risk-control valve**:

```text
Keep what you secured  +  forfeit what was still projected  +  no new complications
```

Neutral copy matters: “Recall Early: secured progress kept; remaining projected recovery was not extracted.” Not “you failed” or “run aborted.”

A visible exit **increases** willingness to engage with window 2 — because window 1 progress is not hostage to window 2 outcome.

---

## 2. What Recall Early does (MVP)

| Rule | Behavior |
|------|----------|
| **Availability** | Every event window, every run (including tutorial) |
| **On recall** | Run ends immediately; later windows skipped (no hold penalties) |
| **Secured recovery** | Windows **before** recall resolve normally (waste + frame bonuses) |
| **Forfeited** | Proportional share of `projectedRecovery` for skipped windows |
| **Wear/damage** | `appliedWear` pass-through — recall never erases wear already taken |
| **Penalties** | Forfeiture only — no extra recall tax in MVP |
| **Audit** | `thumper_run_results.resolution_type` = `'completed'` \| `'recalled'` |

Recall is stored as `chosen_response = 'recall_early'` on the window where the player chose it.

---

## 3. Domain resolution

```typescript
resolveThumperRunResult({
  runConfig: {
    targetResourceId: 'veyrith_copper',
    projectedRecovery: 60,
    recoveryFloor: 40,      // completed runs only
    appliedWear: 12         // unchanged on recall
  },
  eventWindows: [ /* frozen DB rows */ ],
  responses: [
    { windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
    { windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
  ],
  pilotFrame: 'recon'
})
// → resolutionType: 'recalled', recoveredQuantity: 35, forfeitedRecovery: 30, appliedWear: 12
```

Tutorial first session: window 1 recon + `signal_tune` → 30 base + 5 bonus = **35 secured**. Window 2 share **30 forfeited**.

---

## 4. Claim readiness

| Run state | Claim allowed when |
|-----------|-------------------|
| **Completed** | Timer claimable + all windows answered |
| **Recalled** | Immediately after recall (no wait for timer) + windows before recall answered |

`assertVeyrithTutorialWindowsReady` accepts recall: windows before recall answered; windows after recall must stay `null`.

---

## 5. UI and server gates

- **`getEventWindowResponseOptions`** — lists `recall_early` as `safety_choice` (always enabled)
- **Sequential order** — `validateEventWindowRespondOrder` rejects recall (or any response) on window N until all lower-index windows are answered; UI only shows buttons on the active window
- **`assertRecallResponseAudit`** — resolver throws on multiple recalls or any response after recall (invalid audit data is not silently dropped)
- **`validateEventWindowResponse`** — accepts `recall_early`; rejects disabled `field_repair`
- **Respond** — blocks further responses after recall recorded

---

## 6. DB audit columns

Migration `0008_thumper_run_results_recall.sql`:

| Column | Purpose |
|--------|---------|
| `resolution_type` | `'completed'` \| `'recalled'` |
| `forfeited_recovery` | Projected amount not extracted due to recall |
| `applied_wear` | Wear snapshot at resolution (pass-through until wear lesson) |

---

## 7. TDD checklist

| Test | Proves |
|------|--------|
| Recall after window 1 | Secured w1 recovery; w2 skipped; `forfeitedRecovery` > 0 |
| Wear pass-through | `appliedWear` unchanged on recall |
| Completed vs recalled | Full run still `completed`; recalled runs claimable via same path |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter @async-frontier-mmo/db db:smoke
```

---

## Recap checklist

- [x] `recall_early` on every window menu (UI + validation)
- [x] `resolveThumperRunResult` recall branch with neutral explanation
- [x] `resolution_type`, `forfeited_recovery`, `applied_wear` on result row
- [x] Recalled runs claimable immediately (no timer wait)
- [x] Tutorial assert accepts recall path
- [x] No extra recall penalty beyond forfeiture

**Next exercise:** Grant `recovered_quantity` into `resource_stacks` with ledger row citing `thumper_run_result_id` (Lesson 4.1), or seeded-run claim resolution for all four complications.
