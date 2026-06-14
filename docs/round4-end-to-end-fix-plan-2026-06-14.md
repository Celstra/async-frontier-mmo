# Round-4 End-to-End Fix Plan Handoff - 2026-06-14

## Root Causes

1. Long active thumper runs disappeared because FIELD only rendered the rig view for short watched runs, tutorial runs, unresolved events, claim states, or claim-result states.
2. RIG did not show active deployment state, so players had no stable place to watch the timer, answer events, or see live meters.
3. The `next_need` Reactive Crystal order competed with the first Reinforced Hull Plate. Settlement turn-in could consume the same 20u RC stack required for the hull craft.
4. FIELD displayed the hull bill ticker alongside competing order goals while the first hull was still pending.

## Implemented Fixes

1. FIELD keeps the rig view visible for any open thumper run.
2. RIG now loads and renders active deployment state:
   - timer and fail-safe countdown
   - live rig meters
   - event choices and run log
   - claim and claim-result acknowledgement
3. RIG equipment actions are locked server-side and UI-side while a run or claimable result is active.
4. Domain first-hull reserve helper derives its requirement from `REINFORCED_HULL_PLATE`.
5. Settlement turn-in enforces the reserve transactionally:
   - before Reinforced Hull Plate is owned, the largest RC stack reserves up to 20u for the hull craft
   - `next_need` orders only consume spare RC above that reserve
6. Settlement board, mission ticker, and order-ready navigation use reserve-adjusted inventory, so protected RC no longer makes an order look ready.
7. FIELD shows the first hull bill as the sole headline while the first hull is pending and suppresses hand-sample recommendations for `next_need` before hull craft.
8. WORKSHOP defaults to Reinforced Hull Plate during `async_reveal` when the hull plate is not yet owned.

## Verification Already Run

- `rtk pnpm --filter @async-frontier-mmo/domain check`
- `rtk pnpm --filter @async-frontier-mmo/db check`
- `rtk pnpm --filter web check`
- `rtk pnpm --filter @async-frontier-mmo/domain test`
- `rtk pnpm --filter @async-frontier-mmo/db test`
- `rtk python design-docs/first_hull_path_sim.py`
- `rtk python design-docs/energy_regime_sim.py`
- `rtk python design-docs/sampling_ratio_sim.py`

No new balance simulation was required because no balance constants changed. The existing first-hull sim already identified the acquisition-mode dead end: reserve and framing, not order quantity.

## Composer Plan - Future Polish Items 1, 2, and 3

### 1. Extract FIELD and RIG active-run UI into one shared component

Goal: FIELD and RIG should render the same active thumper run surface, including timer, fail-safe text, live meters, event choices, claim/result handling, and run log. This removes the current duplicated FIELD implementation and prevents future fixes from landing in only one route.

Current relevant files:

- `apps/web/src/lib/rig/ActiveRunPanel.svelte`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/routes/rig/+page.svelte`
- `apps/web/src/lib/server/fieldRunState.ts`
- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/lib/server/rigLoad.ts`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/routes/rig/+page.server.ts`

Implementation steps:

1. Make `ActiveRunPanel.svelte` route-neutral.
   - Do not import `RigScreenData` directly into the component.
   - Add a small UI-facing type file such as `apps/web/src/lib/rig/activeRunPanelTypes.ts`, or export a route-neutral type from the shared load layer.
   - The type should describe only the serialized props the component actually needs: target display name, run duration seconds, effective duration seconds, loaded-at timestamp, fail-safe flags, hull condition/integrity, drill/pump condition, run meters, event windows, claim view, and claim/result ids.
   - Keep the component free of `$lib/server/*` runtime imports. Type-only imports are acceptable, but a UI-local structural type is safer.

2. Expand `ActiveRunPanel.svelte` props so FIELD and RIG can both use it.
   - Required props:
     - `run`
     - `claimView`
   - Optional props:
     - `variant?: 'field' | 'rig'`
     - `showAscii?: boolean`
     - `claimAction?: string`
     - `acknowledgeClaimAction?: string`
     - `respondEventWindowAction?: string`
     - `claimButtonLabel?: string`
     - `acknowledgeButtonLabel?: string`
   - Default the actions to the existing route action names:
     - `?/claim`
     - `?/acknowledgeClaim`
     - `?/respondEventWindow`
   - Keep these action names aligned in both `field/+page.server.ts` and `rig/+page.server.ts`.

3. Move the duplicated active-run behavior into `ActiveRunPanel.svelte`.
   - Keep the 3-second `invalidateAll()` polling in the shared component.
   - Keep the 1-second local countdown in the shared component.
   - Compute `localSecondsRemaining`, `localFailsafeSecondsRemaining`, `localDrainPercent`, and `failsafeTripped` inside the component.
   - Use the shared domain `formatMmSs()` for all timer/fail-safe display.
   - Preserve the current fail-safe wording:
     - `FAIL-SAFE TRIPPED - rig secured at {formatMmSs(...)}. Hull integrity spent.`
     - `fail-safe in {formatMmSs(...)}`
   - Keep unresolved event windows above the run log.
   - Keep resolved event windows in the run log.
   - Keep the "No current event window - rig is running." idle state when the run is active and no response is needed.

4. Preserve FIELD-specific thumper art without reintroducing duplication.
   - Preferred approach: let `ActiveRunPanel.svelte` accept `showAscii`.
   - If `showAscii` is true, render `ThumperAsciiPre` using `buildThumperAscii()` from the run data.
   - The generated art should match the current FIELD deployed view: target header, equipped hull, equipped drill, equipped pump, footer `HULL nn%`.
   - If this makes the component too wide, pass an optional `asciiArt` string from the page instead. The important part is that timer/meters/events/claim UI stay shared.

5. Replace FIELD's duplicated rig block.
   - In `apps/web/src/routes/field/+page.svelte`, remove FIELD-local active-run state that only exists for the rig panel:
     - `localSecondsRemaining`
     - `localDrainPercent`
     - `localFailsafeSecondsRemaining`
     - `failsafeTripped`
     - `resolvedEventWindows`
     - `deployedThumperAscii` if the component owns the ASCII build
   - Replace the existing `{#if data.showRigView && data.rigView}` body with:
     - `<ActiveRunPanel run={data.rigView} claimView={data.claimView} variant="field" showAscii />`
   - Keep FIELD-only survey UI unchanged when `showRigView` is false.
   - Keep sample progress using `SegmentedBar`; do not remove that import if sampling still needs it.

6. Keep RIG on the shared panel.
   - In `apps/web/src/routes/rig/+page.svelte`, continue rendering `ActiveRunPanel` when `data.activeRun` exists.
   - Pass `variant="rig"`.
   - Decide whether RIG should show deployed ASCII too. If yes, pass `showAscii`; if no, leave it off. The live meters and event controls must still match FIELD.

7. Move shared styles into `ActiveRunPanel.svelte`.
   - Move `.rig-timer`, `.rig-dashboard`, `.event-window`, `.event-log`, `.claim-*`, `.active-run-*`, and related option styles out of FIELD if they only style active-run UI.
   - Leave FIELD-specific styles in `field/+page.svelte`: field header, energy, resource family, map, sampling, waypoints, deploy controls.
   - After deletion, run `rtk pnpm --filter web check` to catch unused imports and class drift.

8. Acceptance criteria for item 1:
   - Starting a thumper run keeps FIELD on the active run panel instead of dropping back to the resource/deploy screen.
   - Navigating to RIG during the same run shows the same timer, meters, event choices, and run log.
   - Responding to an event works from FIELD and from RIG.
   - Claiming a finished run works from FIELD and from RIG.
   - No duplicated active-run timer/meter/event markup remains in `field/+page.svelte`.

### 2. Add explicit settlement copy for first-hull RC reserve

Goal: The player must understand that Reactive Crystal needed for the first Reinforced Hull Plate is protected. Settlement orders should communicate that they use only spare RC while the hull craft is still pending.

Current relevant files:

- `packages/domain/src/settlement/firstHullReserve.ts`
- `apps/web/src/lib/server/settlementLoad.ts`
- `apps/web/src/routes/settlement/+page.svelte`
- `apps/web/src/routes/settlement/+page.server.ts`
- `apps/web/src/lib/copy/foreman.ts`
- `packages/db/src/queries/settlement.ts`
- `packages/db/src/queries/settlement.test.ts`

Implementation steps:

1. Add a reserve notice to settlement load data.
   - In `settlementLoad.ts`, create a `FirstHullReserveNotice` type:
     - `familyLabel`
     - `resourceDisplayName`
     - `reservedUnits`
     - `requiredUnits`
     - `spareUnits`
     - `craftLabel`
     - `line`
   - Build it from `firstHullReserveMap()` using the unadjusted inventory and current milestone.
   - Return `null` once `ownsReinforcedHullPlate()` is true.
   - Return `null` if there is no RC stack yet, unless composer wants a softer pre-RC teaching line. If adding the softer line, keep it short and only show it while first hull is pending.

2. Use canonical copy in one place first.
   - Recommended line:
     - `First hull reserve: {reservedUnits}u {resourceDisplayName} protected for {craftLabel}. Foreman orders use spare Reactive Crystal only.`
   - Example after the player has 20u Glimmerfall Shard reserved:
     - `First hull reserve: 20u Glimmerfall Shard protected for Reinforced Hull Plate. Foreman orders use spare Reactive Crystal only.`
   - Keep the wording direct. Do not imply the player lost resources; the point is protection.

3. Render the notice near the current mission in settlement.
   - In `settlement/+page.svelte`, show the notice directly under `Current mission` or immediately above the order list.
   - Use the existing small ticker/panel style rather than a modal. This is persistent state, not a one-time interruption.
   - The notice should be visible while a `next_need` RC order exists and the first hull is still pending.

4. Add order-card level clarification if the active order is Reactive Crystal.
   - Extend `SettlementOrderCard` with an optional `reserveNoticeLine`.
   - For RC orders while the first hull is pending, set:
     - `Reactive Crystal reserved for first hull does not count here; this order uses spare units only.`
   - Render this line inside the relevant order card, near progress/eligible stack messaging.
   - Do not add this line to Conductive Metal or Structural Alloy cards.

5. Keep existing reserve behavior unchanged.
   - Do not change `deliverResourceStackToSettlementOrder()` rules unless a test proves copy and behavior disagree.
   - Do not reduce the hull reserve to satisfy an order.
   - Do not make the reserved stack selectable for RC order delivery unless it has spare units above the reserve.

6. Keep foreman copy optional and restrained.
   - If `foremanLine()` is changed, avoid making every settlement return verbose.
   - Preferred: leave foreman lines focused on the next action and put reserve clarity in the persistent mission/order UI.
   - If adding foreman reserve text, only do it during first-hull pending RC conflict states.

7. Acceptance criteria for item 2:
   - A fresh account that reaches the first RC reserve sees explicit settlement text explaining that RC is protected for Reinforced Hull Plate.
   - The `Current mission`/order progress still shows only spare RC for foreman orders.
   - Turning in a foreman RC order cannot consume the protected 20u hull reserve.
   - Once Reinforced Hull Plate is crafted/owned, the reserve copy disappears.

### 3. Add browser-level smoke coverage for RIG active deployment

Goal: Catch the exact regression from the playtest: after starting a 15m thumper run, the player should still have a visible active-run surface, and RIG should show the timer/meters/events instead of only equipment controls.

Preferred implementation if browser automation can be committed:

1. Add Playwright or the repo's chosen browser smoke harness.
   - The repo currently has no committed Playwright setup in `apps/web/package.json`.
   - If adding Playwright, add:
     - `apps/web/playwright.config.ts`
     - `apps/web/tests/rig-active-run.smoke.spec.ts`
     - `apps/web/package.json` script such as `smoke:browser`
   - Use the existing workspace style and keep the test scoped to this tutorial path.

2. Seed or reset to a deterministic fresh pilot before the smoke.
   - Reuse existing DB reset/seed helpers if present.
   - If no clean helper exists, add a narrow test setup script rather than clicking through unrelated setup every run.
   - The smoke should not depend on stale local pilot state.
   - Document the command required before the smoke, for example:
     - `rtk pnpm --filter @async-frontier-mmo/db db:migrate`
     - `rtk pnpm --filter web smoke:browser`

3. Drive the shortest path to an active thumper deployment.
   - Start from a fresh pilot.
   - Progress through settlement confirmation, initial hand-fill orders, workshop assembly, first watched/short run, patch, async reveal, and 15m deploy, or use a deterministic setup helper that places the pilot exactly at async reveal with a valid waypoint and thumper loadout.
   - Prefer a setup helper once the click path becomes fragile. The assertion target is active-run visibility, not every tutorial step.

4. Assert FIELD active-run behavior.
   - After clicking a 15m thumper option, assert FIELD still renders:
     - remaining timer
     - live rig meters
     - either an event choice or the idle "rig is running" state
     - no "You already have an open thumper run" as the primary experience
   - Assert at least one meter label is present:
     - `Signal lock`
     - `Pump flow`
     - `Hull condition`
     - `Hull integrity`

5. Assert RIG active-run behavior.
   - Navigate to `/rig` during the same open run.
   - Assert RIG renders:
     - active deployment target
     - remaining timer or fail-safe countdown
     - live meters
     - event choices or idle running state
   - Assert equipment controls are locked:
     - visible copy `Equipment locked while thumper deployed.`
     - equip/repair forms disabled or absent as intended

6. Assert event response and claim paths if the seeded run exposes them quickly.
   - If an event window is active, click one response and assert the run log updates.
   - If the run is claimable in the setup state, click claim and assert the claim result/acknowledgement renders.
   - Do not make the smoke wait real 15 minutes. Use a seeded short run, fixture time shift, or DB setup for claimable state.

7. Acceptance criteria for item 3:
   - The smoke fails if FIELD drops back to the deploy/resource screen immediately after a 15m deploy.
   - The smoke fails if `/rig` does not show active deployment state during an open run.
   - The smoke fails if equipment controls are usable while an open run or claimable result exists.
   - The smoke is runnable from a documented command and does not require a hand-prepared database.

Fallback if browser automation cannot be committed yet:

1. Add `docs/testing/rig-active-deployment-browser-smoke.md`.
2. Write the exact manual smoke steps from item 3 above.
3. Include expected visible strings and failure signs.
4. Keep the future automated Playwright work as a single TODO with the intended spec path.
5. Do not call this automated coverage; call it manual browser smoke until the harness exists.

## Recommended Verification After Composer Implements Polish

Run these commands:

- `rtk pnpm --filter web check`
- `rtk pnpm --filter @async-frontier-mmo/domain check`
- `rtk pnpm --filter @async-frontier-mmo/db check`
- `rtk pnpm --filter @async-frontier-mmo/db test`

Run these sims only if composer touches balance, reserve math, or first-loop progression:

- `rtk python design-docs/first_hull_path_sim.py`
- `rtk python design-docs/energy_regime_sim.py`
- `rtk python design-docs/sampling_ratio_sim.py`

Manual browser pass after restarting the dev server:

1. Reset to a fresh pilot/database state.
2. Confirm settlement prologue and finish the initial hand-fill orders.
3. Assemble the first thumper.
4. Run through first deployment, fail-safe recall, patch, and async reveal.
5. Start a 15m thumper.
6. Confirm FIELD still shows the active run panel.
7. Navigate to RIG and confirm the same active run state is visible there.
8. Confirm equipment is locked while the run is active.
9. Return to SETTLEMENT and confirm RC reserve copy appears before first hull craft, then disappears after Reinforced Hull Plate is crafted.
