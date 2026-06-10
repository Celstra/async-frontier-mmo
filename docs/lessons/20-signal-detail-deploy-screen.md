# Lesson 20 — Signal Detail / Deploy Thumper screen

> **Exercise:** Expand the minimal `/deploy` stub into Decision 008's third MVP screen: confirm the **sampled deposit spot**, preview Decision 005 run meters, choose a Decision 017 **extraction tail**, and deploy the Basic Personal Thumper with spot concentration wired into recovery math.

**Prerequisite:** Lessons 19 (Red Mesa Survey + sample flow), 22b (prospecting db helpers).

**Out of scope:** Multiple thumper types, group thumpers, extraction-tail jobs/workers (duration is stored on the run row; claim still uses timestamps).

**Learning goal:** Understand **projected values vs actual claim results** — and which deploy-preview fields are player-facing estimates.

---

## 1. Projected vs actual (Decision 005)

| Phase | What the player sees | What happens |
|-------|----------------------|--------------|
| **Deploy preview** | Deterministic estimates from spot concentration, tail, parts, push flag | Domain `buildDeployPreview()` — no RNG |
| **Active phase** | Event windows change waste, wear, forfeited recovery | Stored responses + frame bonuses |
| **Claim** | Recovered quantity, waste, explanation chain | `resolveThumperRunResult()` replays windows |

**Projected Recovery** on Signal Detail is a *target* before complications — not a guarantee. Signal Lock / Pump Flow / Threat Pressure / Hull Condition preview how the run *should* feel; claim may land lower after hold, Recall Early, or pump strain.

```text
sample spot → deploy preview (deterministic)
           → event windows (player choices)
           → claim result (auditable replay)
```

---

## 2. Player-facing preview fields (and why)

| Field | Source | Why show it |
|-------|--------|-------------|
| **Sampled spot + true concentration %** | `pilot_deposit_spot_samples` | Proves deploy uses an earned spot, not a menu pick (Decision 019) |
| **Equipped Drill / Pump / Hull + Condition** | `getEquippedThumperPartsForPilot` | Decision 005 — deploy includes personal parts; condition affects output |
| **Projected Recovery** | concentration × tail^0.5 × base × part performance + pump bonus | Primary reward expectation |
| **Signal Lock** | concentration + Survey Clarity | Recon/survey fantasy — drift complications hurt lock |
| **Pump Flow** | pump condition performance | Pump Strain / waste teaching |
| **Threat Pressure** | higher when push run | Vanguard / hull survival teaching |
| **Hull Condition** | hull part condition | Durability trust before damage complications |
| **Depth / condition risk** | derived from concentration + part state | Decision 005 "depth and condition risk" preview |
| **Extraction tail** | 15 m / 1 h / 4 h / 8 h (Decision 017) | Player time-budget statement; sublinear yield |

Push-run toggle is **hidden during tutorial** (Decision 011). Tail choice is always shown but tutorial floor protects scanner craft minimum.

---

## 3. Concentration + tail on the run row

Deploy now persists audit fields on `thumper_runs`:

| Column | Purpose |
|--------|---------|
| `deposit_spot_id` | Links run to sampled spot |
| `true_concentration_percent` | Extraction multiplier input |
| `extraction_tail_minutes` | Passive phase length |
| `resource_instance_id` | Named resource provenance |
| `duration_seconds` | active phase (60s) + tail |

Claim uses `projectedRecoveryForStoredRun()` so concentration and tail affect `resolveThumperRunResult` — not just the UI preview.

Migration: `0020_thumper_run_deposit_tail.sql`.

---

## 4. Domain API

| Symbol | Role |
|--------|------|
| `EXTRACTION_TAIL_OPTIONS` | 15m / 1h / 4h / 8h labels |
| `extractionTailYieldMultiplier` | `(minutes/60)^0.5` sublinear yield |
| `buildDeployPreview` | All Decision 005 meters + projected recovery |
| `projectedRecoveryForStoredRun` | Same math at claim from DB row |
| `totalRunDurationSeconds` | 60s active + tail |

Pure tests: `deployPreview.test.ts`.

---

## 5. Server flow

```text
GET /deploy?resourceInstanceId=&spotId=&tail=1h&push=true
  → verify pilot sampled spot
  → loadDeployPreviewForPilot (equipped parts + buildDeployPreview)

POST ?/deploy
  → require sampled spot
  → deployThumperRunWithEventWindows({ depositSpotId, trueConcentrationPercent, extractionTailMinutes, durationSeconds })
  → redirect Pilot Home
```

---

## 6. Files touched

| File | Role |
|------|------|
| `packages/domain/src/thumper/deployPreview.ts` | Preview + tail + claim recovery math |
| `packages/db/drizzle/0020_thumper_run_deposit_tail.sql` | Run columns |
| `apps/web/src/lib/server/deployLoad.ts` | Load equipped parts + preview |
| `apps/web/src/routes/deploy/+page.server.ts` | Full load + deploy action |
| `apps/web/src/routes/deploy/+page.svelte` | Signal Detail UI |
| `apps/web/src/routes/+page.server.ts` | Claim uses stored concentration/tail |

---

## 7. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test deployPreview
pnpm check
pnpm --filter web build
```

Manual: sample Veyrith spot → Deploy → compare preview Projected Recovery with claim after tutorial windows.

---

## 8. Recap

**Learned:** Deploy preview is deterministic and player-facing; claim is authoritative after events. Spot concentration and extraction tail persist on the run and feed recovery math.

**Next exercise:** Lesson 7.4 — Thumper Run / Event Window screen (`docs/lessons/26-run-event-screen.md`).

---

## Commit

```bash
git add packages/domain packages/db apps/web docs/lessons/20-signal-detail-deploy-screen.md
git commit -m "feat: add signal detail deploy screen with extraction tails"
```
