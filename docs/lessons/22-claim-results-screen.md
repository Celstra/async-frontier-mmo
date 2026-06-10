# Lesson 22 — Claim Results screen

> **Exercise:** Split thumper **claim + results** off Pilot Home into `/claim` — Decision 008 screen #5. Make the explanation chain explicit so a tester can answer “why did I get this amount?” without reading domain code (Decision 013 comprehension gate).

**Prerequisite:** Lessons 20–21 (Deploy, Thumper Run / Event Windows), domain claim resolution (Lessons 10–12, 14).

**Out of scope:** Marketplace/trade, separate Claim Results route per resource, external analytics.

**Learning goal:** Understand **result explanation and player trust** — what must be visible after a thumper claim to feel fair.

---

## 1. Why explanation matters (Decision 013)

Async MMO economies fail when payouts feel random. Decision 013 adds a **comprehension gate**: after the first-session claim, a tester must explain the recovered quantity from the UI alone.

| Trust requirement | What the player needs to see |
|-------------------|------------------------------|
| **Quantity is intentional** | Projected → adjustments → final recovered |
| **Choices mattered** | Each window: complication → response → consequence |
| **Stats did not lie** | Waste/scrap is quantity-only — Veyrith Copper stats unchanged |
| **Gear paid a cost** | Wear per thumper part (condition/integrity deltas) |
| **No double-dip** | Already-claimed state; server rejects duplicate grant |
| **Audit for devs** | Ledger rows tied to run/result (dev mode only) |

The Claim Results screen is not a victory popup — it is a **receipt**.

---

## 2. Explanation chain (explicit)

```text
Window → response/hold → consequence → waste per window
       → payout adjustments (floor, pump bonus, recall forfeit)
       → recovered quantity + waste + salvage note
       → wear per part
```

Domain builder: `buildThumperClaimResultExplanation()` in `packages/domain` — mirrors penalty math from `thumperWindowResolution.ts` without re-running claim.

Player-facing consequence copy uses complication display names; stored `thumper_run_results.explanation` keeps action ids for audit replay.

---

## 3. What must be visible to feel fair

| Panel | Player-facing |
|-------|----------------|
| **Summary line** | “Recovered N Veyrith Copper from M projected (completed/recalled)” |
| **Totals** | Projected, recovered, waste, forfeited, resolution type |
| **Window chain** | Signal Drift → Signal Tune → no waste; etc. |
| **Payout adjustments** | Recovery floor, recall forfeit, pump/part modifiers |
| **Part wear** | Drill / Pump / Hull condition & integrity before → after |
| **Salvage / scrap** | Waste quantity as scrap note (no rare salvage in tutorial) |
| **Next step** | Link to Crafting + Gear on Pilot Home (`/#crafting-workshop`) |

---

## 4. Server flow

```text
GET /claim
  → claimable open run? show Claim button
  → claimed latest run? show structured explanation (idempotent view)
  → pending? link to /run

POST ?/claim
  → claimOpenRun() (transaction: result row + ledger + inventory grant + wear)
  → redirect 303 /claim (duplicate POST → already_claimed → same redirect)
```

Shared workflow: `apps/web/src/lib/server/claimWorkflow.ts`  
Load helper: `apps/web/src/lib/server/claimLoad.ts`

---

## 5. Duplicate claim prevention

Two layers:

1. **DB:** `thumper_runs.claimed_at` + unique result per run; `claimOpenThumperRunForPilot` returns `already_claimed` with existing result.
2. **UI:** Results page shows “Already claimed”; Claim button hidden when result exists.

Inventory grant happens once inside the claim transaction (Lesson 14).

---

## 6. Dev audit panel

When `dev` is true, `/claim` lists economy ledger entries whose payload references the run id or result id (`thumper_claimed`, `resource_granted`, `item_condition_changed`). Production players never see this — it supports Decision 012/013 ledger audits during learning.

---

## 7. Files touched

| File | Role |
|------|------|
| `packages/domain/src/thumper/buildThumperClaimResultExplanation.ts` | Structured explanation chain |
| `packages/domain/src/thumper/thumperWindowResolution.ts` | Shared penalty + audit/player copy |
| `apps/web/src/lib/server/claimWorkflow.ts` | Claim transaction wiring |
| `apps/web/src/lib/server/claimLoad.ts` | Load claimable / result / audit |
| `apps/web/src/routes/claim/+page.server.ts` | Load + claim action |
| `apps/web/src/routes/claim/+page.svelte` | Claim Results UI |
| `apps/web/src/routes/+page.svelte` | Link to claim; `#crafting-workshop` anchor |
| `apps/web/src/lib/pilotHome.ts` | Suggested action → `/claim` |

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test buildThumperClaimResultExplanation
pnpm check
pnpm --filter web build
```

Manual: complete tutorial windows → `/claim` → claim → read chain → confirm “why 60 (or less if held)?” → follow Crafting link → claim again (no extra inventory).

---

## 9. Recap

**Learned:** Claim Results is a receipt, not a celebration. Structured explanation connects window choices to quantity, waste, and wear — that is how async frontier MMOs earn trust.

**Next exercise:** Lesson 23 — Crafting + Gear screen as Decision 008 comprehension gate home (`docs/lessons/23-crafting-gear-screen.md`).

---

## Commit

```bash
git add packages/domain apps/web docs/lessons/22-claim-results-screen.md
git commit -m "feat: add claim results screen with explanation chain"
```
