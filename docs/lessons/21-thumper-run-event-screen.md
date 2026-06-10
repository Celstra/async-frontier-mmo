# Lesson 21 — Thumper Run / Event Window screen

> **Exercise:** Split the thumper **active run** UI off Pilot Home into `/run` — Decision 008 screen #4. Show the five run-state meters, present Signal Drift and Pump Strain windows with frame-flavored actions, hold, and Recall Early. Field Repair shows kit count and disables with a reason when none are owned.

**Prerequisite:** Lessons 18–20 (Pilot Home, Survey, Signal Detail / Deploy), domain event-window lessons 09–12.

**Out of scope:** WebSockets, jobs/workers for absent-player auto-resolution, realtime combat, Claim Results screen (Lesson 22 / 7.5).

**Learning goal:** Understand **event windows as short attention moments** inside an async run — and how **absent-player fallback** will work later without surprise-deleting runs.

---

## 1. Event windows = attention moments, not babysitting

```text
Async shell (minutes):   deploy ───────── timer + extraction tail ───────── claim
Attention (seconds):              ↑ window 1          ↑ window 2
```

| Layer | Player experience | This lesson |
|-------|-------------------|-------------|
| **Async shell** | Deploy, leave, return | `deployed_at` + `duration_seconds` → `resolveThumperState()` |
| **Event window** | One complication, a few buttons | `/run` — respond via server action |
| **Claim** | Final quantity + explanation | Still on Pilot Home for now |

The run can take real-world time. **Choices should not.** Each window is: read complication → pick matching action, hold, or Recall Early → done. That keeps the frontier MMO playable between meetings.

---

## 2. Projected vs live run meters (Decision 005)

| Meter | Player-facing meaning | Source on `/run` |
|-------|----------------------|------------------|
| **Projected Recovery** | Target yield before complications fully resolve | `buildActiveRunMeters()` — same concentration/tail math as deploy |
| **Signal Lock** | How stable the named-resource lock feels | Concentration + survey clarity |
| **Pump Flow** | Extraction efficiency / strain risk | Pump part condition at deploy snapshot |
| **Threat Pressure** | Hull/safety stress (higher on push runs) | Push flag |
| **Hull Condition** | Live run hull durability | `thumper_runs.run_hull_condition` (updates after Field Repair) |

These are **estimates** for trust and teaching — claim replay is authoritative.

---

## 3. Window response menu (server-authoritative)

Each window offers exactly three enabled choices (plus Field Repair listed but gated):

| Choice | Kind | Notes |
|--------|------|-------|
| **Matching action** | Frame-flavored when specialized | Recon → Signal Tune copy; Engineer → pump/repair copy |
| **Hold / ignore** | Passive accept penalty | Bounded waste/forfeit at claim |
| **Recall Early** | Safety choice (not a 5th event action) | Ends run; secured progress kept |

**Field Repair:** always listed on Hull Damage windows; **disabled** with `FIELD_REPAIR_REQUIRES_KIT_REASON` when `fieldRepairKitCount === 0`. Button label shows kit count when repair is the matching action.

Validation chain (unchanged from Lesson 10):

```text
POST ?/respond
  → validateEventWindowRespondOrder
  → validateEventWindowResponse (kit gate)
  → recordThumperEventWindowResponseForPilot (transaction)
  → reload run state + meters
```

No client-side choice math — the UI only renders `getEventWindowResponseOptions()`.

---

## 4. Absent-player fallback (Decision 005 — deferred implementation)

Design lock (not fully wired in MVP UI yet):

- No repair kits spent automatically  
- No high-risk push choices made for you  
- Unresolved complications get **conservative bounded penalties** at claim  
- Thumper is **not surprise-deleted**

This lesson uses **light refresh only**: a 1s client countdown calls `invalidateAll()` when the timer hits zero so the page re-reads server timestamps. Jobs/workers apply conservative defaults at claim when windows were never answered — that is a later package.

Copy on `/run` teaches the contract so players know silence ≠ free optimal outcome.

---

## 5. Route layout

```text
Pilot Home (/)
  summary + link → /run
  claim action stays here (until Claim Results lesson)

Thumper Run (/run)
  five meters + event windows + ?/respond
  redirect → / if no open run
```

Shared loaders live in `apps/web/src/lib/server/runLoad.ts`.

---

## 6. Domain additions

| Symbol | Role |
|--------|------|
| `buildActiveRunMeters` | Five Decision 005 meters during active run |
| `frameFlavoredActionLabel` | Frame verb on matching-action button |
| `complicationDisplayName` | Signal Drift / Pump Strain labels |

Tests: `eventActionLabels.test.ts`, existing `deployPreview` tests.

---

## 7. Files touched

| File | Role |
|------|------|
| `packages/domain/src/thumper/eventActionLabels.ts` | Frame-flavored copy |
| `packages/domain/src/thumper/deployPreview.ts` | `buildActiveRunMeters` |
| `apps/web/src/lib/server/runLoad.ts` | Shared open-run load + window mapping |
| `apps/web/src/lib/server/targetResource.ts` | Display name helper |
| `apps/web/src/routes/run/+page.server.ts` | Load + respond action |
| `apps/web/src/routes/run/+page.svelte` | Thumper Run UI |
| `apps/web/src/routes/+page.svelte` | Summary + link (event UI removed) |
| `apps/web/src/lib/pilotHome.ts` | Suggested action → `/run` |

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test eventActionLabels
pnpm check
pnpm --filter web build
```

Manual: deploy tutorial run → Pilot Home links to `/run` → respond Window 1 (Signal Tune) → Window 2 (Clear Pump Problem) → return home → claim.

---

## 9. Recap

**Learned:** Event windows are brief server-authoritative choices inside a longer async run. Run meters are player-facing previews; claim is truth. Absent players will get conservative defaults later — not auto-optimal play.

**Next exercise:** Lesson 22 — Claim Results screen (`docs/lessons/22-claim-results-screen.md`): explanation chain so testers can answer “why did I get this amount?”

---

## Commit

```bash
git add packages/domain apps/web docs/lessons/21-thumper-run-event-screen.md
git commit -m "feat: add thumper run event window screen"
```
