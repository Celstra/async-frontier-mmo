# Manual browser smoke — RIG active deployment

This is the manual fallback for polish item 3 in
`docs/round4-end-to-end-fix-plan-2026-06-14.md`. Automated Playwright coverage is
not committed yet; use this checklist until `apps/web/tests/rig-active-run.smoke.spec.ts`
exists.

## Prerequisites

```bash
pnpm --filter @async-frontier-mmo/db db:migrate
# start Postgres + app dev server
pnpm --filter web dev
```

Reset to a **fresh pilot/database state** before each run. Do not reuse a hand-tuned
local pilot — stale state hides the regression this smoke targets.

## Shortest path to an active 15m deploy

1. Prologue → SETTLEMENT → confirm foreman briefing.
2. FIELD → hand-fill both foreman orders → turn in at SETTLEMENT.
3. WORKSHOP → assemble thumper chassis.
4. FIELD → first tutorial deploy → recall → SETTLEMENT patch.
5. SETTLEMENT → async reveal → choose **15 min** deploy.
6. FIELD → deploy thumper on a valid waypoint.

## FIELD assertions (after 15m deploy)

The page must **stay on the active run panel**, not drop back to resource family /
deploy controls as the primary experience.

Expect visible:

- Remaining timer (e.g. `14:59 remaining` or similar)
- Live rig meters with labels:
  - `Signal lock`
  - `Pump flow`
  - `Hull condition`
  - `Hull integrity`
- Either an event choice **or** `No current event window — rig is running.`

Failure signs:

- Primary screen is resource family / deploy with only a flash error
- `You already have an open thumper run` as the main experience
- No meter labels after deploy

## RIG assertions (same open run)

Navigate to `/rig` without claiming.

Expect visible:

- `Active deployment` header with target resource name
- Same remaining timer / fail-safe countdown as FIELD
- Same live meter labels
- Event choices or idle running state
- `Equipment locked while thumper deployed.`

Failure signs:

- RIG shows only equip/swap panels with no active deployment block
- Equip/repair forms are enabled during an open run
- Timer or meters differ materially from FIELD for the same run

## Event + claim (optional, if setup exposes them quickly)

Do **not** wait real 15 minutes. Use a short seeded run or a claimable fixture if
available in your test DB.

- Respond to an event from FIELD → run log updates; repeat from RIG if another window
  is active.
- When claimable: claim from FIELD or RIG → result/acknowledgement renders.

## Settlement RC reserve (first hull pending)

After `next_need` orders post and before Reinforced Hull Plate is crafted:

- SETTLEMENT shows:
  `First hull reserve: … protected for Reinforced Hull Plate. Foreman orders use spare Reactive Crystal only.`
- Reactive Crystal order card includes:
  `Reactive Crystal reserved for first hull does not count here; this order uses spare units only.`
- Turning in RC cannot consume the protected hull reserve stack.

After hull plate is owned, reserve copy disappears.

## Future automation TODO

- Add `apps/web/playwright.config.ts`
- Add `apps/web/tests/rig-active-run.smoke.spec.ts`
- Add `smoke:browser` script to `apps/web/package.json`
- Seed pilot at async-reveal with valid waypoint instead of clicking the full tutorial
