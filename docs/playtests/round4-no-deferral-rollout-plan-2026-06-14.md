# Round 4 No-Deferral Rollout Plan - 2026-06-14

## Status

No further human tunnel playtest starts until this entire rollout is implemented,
verified, and checked against deterministic simulations plus browser smoke. The
Cloudflare tunnel is the real test surface:

`https://performer-friends-herbs-beaches.trycloudflare.com`

Do not confuse that with a local Vite dev server. Automated checks can run during
implementation. Human tunnel testing resumes only after the final gate in this
document passes.

Reference evidence:

- Findings: `docs/playtests/round4-tunnel-telemetry-findings-2026-06-14.md`
- Playtest pilot: `35df847b-27e7-44f7-bef6-f36e0306c518`
- Current hard-stop proof: patched hull at 30 condition / 30 integrity, 96u
  Conductive Metal, 24u Reactive Crystal, 1u Structural Alloy, and no legal
  deploy tail after the one-time async waiver was consumed.

## Goal

Fix the complete first-session flow end to end:

1. Incoming brief.
2. First hand-filled order.
3. Second hand-filled order.
4. Workshop rig assembly.
5. First tutorial thump.
6. Fail-safe recall and settlement patch.
7. Second tutorial thump.
8. First real 15-minute async thump.
9. RIG-based active run monitoring and event response.
10. Recovery path that cannot dead-end before Reinforced Hull Plate.
11. Workshop fabricator/hull-plate path that remains legible and craftable.

No item in this rollout is optional. If an implementation choice is uncertain,
choose the option that protects the first-session path and document the exact
tradeoff in the code review summary.

## Non-Negotiable Done Criteria

1. After the incoming brief, the highlighted next action is FIELD, not
   SETTLEMENT.
2. Foreman copy never tells the player to pick a resource on SETTLEMENT when no
   such control exists.
3. FIELD opens on the correct tutorial family and recommended resource for the
   active order.
4. Free tutorial samples either update order progress immediately or explicitly
   explain why they do not. For this rollout, tutorial samples should update
   progress immediately when they match the pinned order.
5. When an order fills, navigation highlights SETTLEMENT immediately.
6. First and second tutorial thumper deploys cannot target Sorrel, Veyrith,
   Glimmerfall, Pale Ember, or any non-Keth resource.
7. The player cannot change the tutorial thumper target in a way that breaks the
   first-hull path.
8. First-hull materials are mathematically guaranteed before the game expects a
   Reinforced Hull Plate.
9. No pre-Reinforced-Hull state can have zero legal deploy options unless there
   is an immediate, visible, affordable repair or patch action.
10. Active thumper runs live on RIG: timer, event choices, live bars, claim, and
    result acknowledgement.
11. FIELD is not the only active-thumper surface. During an open run, FIELD
    points the player to RIG.
12. Equipment stays locked during open runs and claimed-but-unacknowledged
    results.
13. A 5-minute deploy does not start at 6 minutes. A 15-minute deploy does not
    start at 16 minutes.
14. Fail-safe and secure-at lines use formatted `mm:ss`, never raw fractional
    seconds.
15. Workshop thumper and fabricator stations have no horizontal scrollbar.
16. Fabricator art appears above the schematic list when Fabricator is selected.
17. Missing-material copy wraps under schematic names and never overlaps.
18. Telemetry captures repeated samples, deploy attempts, nav resolution, active
    run panel state, event response, and workshop station state.
19. Automated DB/domain/web checks pass.
20. First-hull simulation passes and states explicitly that Reinforced Hull
    Plate is craftable.
21. Browser smoke covers the first-session path and the no-dead-end case.

## Workstream Order

Implement in this order. Later visual polish must not start before the economy
and no-dead-end fixes are in place.

1. Tutorial routing, copy, and order-family defaults.
2. Free sample progress and order binding.
3. Tutorial thumper target lock.
4. First-hull material guarantee.
5. Patched-hull no-dead-end rule.
6. RIG as canonical active deployment screen.
7. Timer/duration consistency.
8. Workshop layout and schematic readability.
9. Telemetry expansion.
10. Automated simulation and browser smoke gates.
11. Final tunnel reset and human playtest release.

## Workstream 1 - Tutorial Routing, Copy, And Defaults

### Problems

- After confirming the incoming brief, the user lands in SETTLEMENT.
- Foreman says to pick a resource family from the foreman list, but no such
  picker exists there.
- One family is already selected, so the copy and highlighted nav contradict the
  UI.
- The orange highlight remains on SETTLEMENT when the next real action is FIELD.

### Files

- `packages/domain/src/tutorial/tutorialSteps.ts`
- `packages/domain/src/tutorial/resolveNextActionScreen.ts`
- `packages/domain/src/tutorial/resolveNextActionScreen.test.ts`
- `apps/web/src/lib/copy/foreman.ts`
- `apps/web/src/lib/server/nextActionLoad.ts`
- `apps/web/src/lib/server/settlementLoad.ts`
- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/routes/settlement/+page.svelte`
- `apps/web/src/routes/field/+page.svelte`

### Implementation

1. Change first post-briefing tutorial next action to FIELD.
   - `first_orders` should resolve to `field`.
   - Keep `prologue` / incoming brief on SETTLEMENT.
   - Add a reason field if the next-action resolver supports it:
     `tutorial_first_order_field`.

2. Replace the first-order Foreman copy.
   - Remove copy that says to pick from a foreman list.
   - Use direct copy tied to the active order:
     `First order: Structural Alloy. FIELD is tuned for Keth Iron - scan the recommended signal.`
   - If the order is dynamic, render family/resource names from the pinned order.

3. FIELD default family must match the pinned mission order.
   - For `first_orders`, default selected family to Structural Alloy.
   - For the second hand-fill order, default selected family to Conductive Metal.
   - Do not let a static `DEFAULT_FIELD_FAMILY` override tutorial state.

4. Make nav updates action-safe.
   - After briefing confirmation, sample completion, order fill, turn-in, deploy,
     claim, and acknowledgement actions, return or invalidate the resolved next
     action.
   - The layout should not show stale orange highlights after a server action.

5. Tests.
   - `resolveNextActionScreen(first_orders)` returns FIELD.
   - After briefing confirm, nav highlight is FIELD.
   - Fresh FIELD load during first order has Structural Alloy selected.
   - Fresh FIELD load marks Keth Iron as recommended.
   - Settlement copy names the FIELD action and does not tell the user to pick a
     resource on SETTLEMENT.

### Acceptance

- Incoming brief confirm sends the player to a state where FIELD is highlighted.
- Settlement copy mentions the already-pinned order and the need to go FIELD.
- FIELD opens on Structural Alloy with Keth Iron recommended.

## Workstream 2 - Free Sample Progress And Order Binding

### Problems

- First sample is free and grants inventory.
- Order progress remains at 0 after the free sample.
- The next paid sample makes progress jump, which reads as broken.
- The issue repeats for Structural Alloy and Conductive Metal.

### Files

- `packages/db/src/queries/prospecting.ts`
- `packages/db/src/queries/prospecting.test.ts`
- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/lib/field/SampleResultPanel.svelte` if present
- `apps/web/src/lib/field/OrderProgress.svelte` if present

### Implementation

1. Bind tutorial hand-fill orders on the first free sample when the sample
   matches the pinned order.
   - Keth Iron free sample during the first Structural Alloy order should bind
     and update progress.
   - Sorrel Vein Copper free sample during the Conductive Metal order should
     bind and update progress.
   - Do not bind an unrelated order if the sampled family does not match.

2. Update progress display from the post-sample inventory/order state.
   - The sample result panel must show the updated order progress immediately.
   - If the sample filled the order, show the return-to-SETTLEMENT state and
     force the nav highlight to SETTLEMENT.

3. Preserve or explicitly define non-tutorial behavior.
   - If free scout samples outside tutorial remain non-binding, show explicit
     copy:
     `Scout sample banked. Foreman orders bind on a paid sample.`
   - Do not show that copy in the tutorial hand-fill path after the binding fix.

4. Telemetry hook.
   - Emit a sample event for every sample, not just milestones:
     resource, family, concentration, quantity, energy cost, free-sample flag,
     order id, progress before, progress after, order-filled flag, energy after.

5. Tests.
   - Free Keth tutorial sample changes order progress from 0 to the sampled
     quantity.
   - Free Sorrel tutorial sample changes order progress from 0 to the sampled
     quantity.
   - Free sample inventory and order progress agree.
   - Wrong-family free sample does not bind the pinned tutorial order.
   - When progress fills the order, resolved next action is SETTLEMENT.

### Acceptance

- No tutorial panel can show `+4u` while the active order still reads `0`.
- Energy, inventory, and order progress agree after every sample.
- Order-filled state immediately points to SETTLEMENT.

## Workstream 3 - Tutorial Thumper Target Lock

### Problems

- The player deployed the first and second tutorial thumps on Sorrel Copper.
- Same-waypoint enforcement then reinforced the wrong resource.
- The result was 96u Conductive Metal and only 1u Structural Alloy.
- The player could change target/resource during a phase where the tutorial path
  needed a locked Keth Iron haul.

### Files

- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/lib/server/fieldDeployLoad.ts`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/lib/server/tutorialOrchestration.ts`
- `packages/db/src/queries/prospecting.ts`
- `packages/db/src/queries/settlement.ts`
- `packages/db/src/queries/thumperRunWorkflow.ts`
- `packages/domain/src/tutorial/tutorialSteps.ts`
- `packages/domain/src/thumper/tutorialDeploy.ts` or an equivalent new helper
- `packages/domain/src/thumper/tutorialDeploy.test.ts`

### Implementation

1. Define the locked target for tutorial deploys.
   - Family: Structural Alloy.
   - Resource: Keth Iron.
   - Waypoint: the Keth waypoint sampled during the first Structural Alloy
     hand-fill order.

2. Persist or deterministically derive the locked waypoint.
   - Preferred: derive from the first bound Structural Alloy order and the
     associated Keth sampled spot.
   - If derivation is fragile, persist a tutorial waypoint pointer in tutorial
     state when the first Keth sample binds.

3. Server-side deploy validation.
   - `first_deploy` rejects anything except the locked Keth waypoint.
   - `second_deploy` also rejects anything except the locked Keth waypoint.
   - The check must run in the server action, not only in UI disabling.

4. UI restrictions.
   - During locked tutorial deploy steps, hide or disable other deploy target
     choices.
   - The deploy panel should say:
     `Tutorial deploy locked: Keth Iron structural haul.`
   - If the player is viewing another resource, show a single action to return
     to the locked Keth waypoint.

5. Copy.
   - Explain the reason in-world:
     `The first rig trials need structural stock. Run this Keth Iron waypoint before changing targets.`
   - For the second tutorial deploy, do not say "same as first run" if the first
     run could ever have been wrong in previous saves. Say:
     `Second tutorial deploy must use the locked Keth Iron waypoint.`

6. Tests.
   - First deploy rejects Sorrel, Veyrith, Glimmerfall, Pale Ember, and any
     non-Keth target.
   - First deploy accepts the locked Keth waypoint.
   - Second deploy rejects all non-Keth waypoints, even sampled ones.
   - Second deploy accepts the same locked Keth waypoint.
   - Old bad save state with first run on Sorrel is routed to a recovery/correction
     path, not allowed to continue starving Structural Alloy.

### Acceptance

- A fresh tutorial player cannot thump Conductive Metal or Reactive Crystal for
  the first two tutorial deploys.
- Both tutorial thumper rewards are Structural Alloy.
- The UI names Keth Iron explicitly and does not let the player break the path.

## Workstream 4 - First-Hull Material Guarantee

### Problems

- The current path can consume the exact resources needed for hull crafting into
  settlement orders.
- Even after locking tutorial thumps to Keth, the first-hull Structural Alloy
  floor must be proven, not assumed.
- Reactive Crystal needed for Bonding Matrix can be diverted into `next_need`
  orders before the player crafts the hull.

### Files

- `design-docs/first_hull_path_sim.py`
- `packages/domain/src/crafting/schematics/thumperPartSchematics.ts`
- `packages/domain/src/tuning.ts`
- `packages/domain/src/thumper/deployPreview.ts`
- `packages/domain/src/thumper/tutorialDeploy.ts`
- `packages/db/src/queries/thumperRunWorkflow.ts`
- `packages/db/src/queries/crafting.ts`
- `packages/db/src/queries/crafting.test.ts`
- `packages/db/src/queries/claimReward.test.ts`
- `packages/db/src/queries/settlement.ts`

### Implementation

1. Update `design-docs/first_hull_path_sim.py` to mirror the exact server path.
   - Incoming brief.
   - Keth Iron hand-fill order with free-sample binding.
   - Sorrel Copper hand-fill order with free-sample binding.
   - Rig assembly.
   - First tutorial Keth thump.
   - Fail-safe recall.
   - Settlement patch.
   - Second tutorial Keth thump.
   - First async choice.
   - Reactive Crystal acquisition.
   - Craft Reinforced Hull Plate.
   - Include settlement order turn-in consumption.
   - Include inventory stacks as single-stack requirements.

2. Protect hull-critical materials.
   - Before Reinforced Hull Plate is crafted, settlement `next_need` orders must
     not consume the exact first-hull Reactive Crystal or Structural Alloy needed
     for the craft.
   - Options, in preferred order:
     - Pin first-hull craft as the current mission until hull is crafted.
     - Mark the first 20u Reactive Crystal and 100u Structural Alloy as
       craft-reserved in mission logic.
     - Delay non-hull settlement orders until the hull craft is complete.
   - The UI should make this clear:
     `Hull plate first: keep 20u Reactive Crystal for the Bonding Matrix.`

3. Set a guaranteed Structural Alloy floor.
   - The sim must prove that following the recommended tutorial path reaches the
     Reinforced Hull Plate Structural Alloy requirement.
   - If current yields fall short, choose one concrete fix:
     - Increase scripted tutorial Keth yield floors.
     - Add an explicit, visible structural salvage award after second Keth run.
     - Reduce the first Reinforced Hull Plate SA bill for the tutorial tier.
     - Require one guided extra Keth run only after Workstream 5 guarantees that
       patched hull can run and the UI points to that action.
   - Do not add silent hidden freebies.

4. Preserve single-stack rules.
   - If the schematic requires one stack, the sim and UI must use one stack.
   - Avoid misleading "total family amount" checks if the craft requires a single
     resource instance stack.

5. Tests.
   - DB integration test for the exact first-hull path.
   - Craft test proves Reinforced Hull Plate can be crafted from the resulting
     inventory.
   - Test that pre-hull settlement orders cannot consume the protected RC/SA
     required for the hull craft.
   - Sim exits non-zero if the first hull is impossible.

### Acceptance

- Deterministic first-session path reaches craftable Reinforced Hull Plate.
- The player is not further from hull craft after following the tutorial.
- Reactive Crystal gathered for the hull is not stolen by a settlement order.

## Workstream 5 - Patched Hull No-Dead-End Rule

### Problems

- After the first 15-minute async thump, patched hull at 30/30 has no legal
  deploy tail.
- The UI says the hull may recall at about 7:04 and also says integrity is too
  low for any run duration.
- The player reasonably sees 30 condition and 30 integrity and expects a short
  run or a visible repair path.
- Current result is a complete stop before Reinforced Hull Plate.

### Files

- `packages/domain/src/thumper/hullRunCeiling.ts`
- `packages/domain/src/thumper/hullTier.ts`
- `packages/domain/src/thumper/hullTier.test.ts`
- `packages/domain/src/thumper/hullRunCeiling.test.ts`
- `apps/web/src/lib/server/fieldDeployLoad.ts`
- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/routes/settlement/+page.server.ts`
- `apps/web/src/lib/copy/foreman.ts`
- `packages/db/src/queries/thumperRunWorkflow.ts`

### Implementation

1. Add an explicit first-hull emergency run rule.
   - If Reinforced Hull Plate is not crafted/equipped/owned and the player has a
     patched/scavenged 30/30 hull, expose at least one legal short run.
   - Minimum acceptable behavior: repeatable 5-minute patched-hull recovery run
     until the first hull can be crafted.

2. Keep this rule explicit.
   - Do not piggyback on the one-time first-async waiver.
   - Add an option such as `allowFirstHullEmergencyRun`.
   - Server load and server action validation must use the same rule.

3. Make repair/patch alternative visible if chosen.
   - If the design chooses repair instead of emergency run, it must be immediate,
     visible, and affordable in the hard-stop state.
   - The player cannot be required to infer that sampling small amounts is the
     recovery path.

4. Fix conflicting copy.
   - Replace mixed messages with:
     `Patched hull can limp through one short recovery run. Craft Reinforced Hull Plate to unlock real tails.`
   - Show the actual short tail option beside that copy.

5. Tests.
   - Domain: patched 30/30, first hull pending -> at least one legal tail.
   - Domain: patched 30/30, first hull complete -> normal rules apply.
   - Server: the known hard-stop state offers a legal next action.
   - Server: deploy action accepts the emergency run when shown.
   - Browser smoke: after first async run, no zero-option deploy state exists.

### Acceptance

- The reported 30/30 patched hull state cannot strand the player.
- If a warning says a run can secure around a time, a corresponding run option is
  actually available.

## Workstream 6 - RIG Is Canonical Active Deployment

### Problems

- Starting the 15-minute thump opens a transient thumper view.
- Clicking an event closes the thumper window.
- Navigating to WORKSHOP leaves no reliable way to view the active thump.
- The player expects RIG to be the home for timer, events, and live component
  stats.
- This is first-session UX, not later polish.

### Files

- `apps/web/src/lib/rig/ActiveRunPanel.svelte`
- `apps/web/src/lib/rig/activeRunPanelTypes.ts`
- `apps/web/src/lib/server/rigLoad.ts`
- `apps/web/src/routes/rig/+page.svelte`
- `apps/web/src/routes/rig/+page.server.ts`
- `apps/web/src/lib/server/fieldLoad.ts`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/lib/server/nextActionLoad.ts`
- `apps/web/src/lib/server/rigEquipmentLock.ts`
- `packages/domain/src/tutorial/resolveNextActionScreen.ts`
- `packages/domain/src/tutorial/resolveNextActionScreen.test.ts`

### Implementation

1. Move the active run lifecycle to RIG.
   - RIG shows active target, timer, fail-safe countdown, signal lock, pump flow,
     hull condition, hull integrity, drill condition, pump condition, threat,
     event choices, run log, claim, and acknowledgement.
   - Use the existing bar styling from the live dashboard.

2. FIELD during open run.
   - Hide deploy controls while a run is open.
   - Show a clear action:
     `Rig deployed - monitor events on RIG.`
   - FIELD may still show map/survey context, but it is not the event/claim home.

3. Navigation.
   - Open run -> RIG highlighted.
   - Event available -> RIG highlighted.
   - Claim available -> RIG highlighted.
   - Claim result unacknowledged -> RIG highlighted unless a settlement-specific
     acknowledgement is explicitly required.
   - After RIG acknowledgement that triggers a Foreman briefing, then SETTLEMENT
     may highlight.

4. Actions.
   - `respondEventWindow`, `claim`, and result acknowledgement exist on RIG.
   - Old FIELD event/claim actions should redirect to RIG or return a clear
     blocked response. Do not silently lose the panel.

5. Equipment lock.
   - Keep `rigEquipmentLock.ts`.
   - Lock equipment during open runs and claimed-but-unacknowledged result mode.
   - Apply lock to equip scanner, equip thumper parts, and repair actions.

6. Polling.
   - RIG active panel polls on the existing interval.
   - Avoid duplicate active-run polling in FIELD if FIELD no longer owns the
     panel.

7. Tests.
   - `resolveNextActionScreen(openRun)` returns RIG.
   - RIG event response keeps active panel visible.
   - RIG claim renders result acknowledgement.
   - FIELD while open run renders monitor-on-RIG state.
   - Equipment actions reject while open/result state is locked.

### Acceptance

- After deploy, orange highlight moves to RIG.
- Clicking an event does not make the thumper disappear.
- Navigating away and back to `/rig` always shows the current active run until it
  is acknowledged.

## Workstream 7 - Timer And Duration Consistency

### Problems

- 5-minute deploy starts at 6 minutes.
- 15-minute deploy starts at 16 minutes.
- Stored durations include an extra 60-second active phase.
- Earlier fail-safe copy printed raw fractional seconds; keep the shared
  formatter fix intact.

### Files

- `packages/domain/src/thumper/deployPreview.ts`
- `packages/domain/src/thumper/deployPreview.test.ts`
- `packages/domain/src/thumper/resolveThumperState.ts`
- `packages/domain/src/time/formatMmSs.ts` or existing shared formatter
- `apps/web/src/lib/rig/ActiveRunPanel.svelte`
- `apps/web/src/routes/field/+page.svelte`
- `apps/web/src/lib/server/fieldLoad.ts`

### Implementation

1. Make button label and countdown agree.
   - Preferred model: player-facing duration equals `tailMinutes * 60`.
   - A 15-minute choice stores/displays 900 seconds.
   - A 5-minute choice stores/displays 300 seconds.

2. Keep event scheduling inside the displayed duration.
   - If an internal active phase remains, it must not add one minute to the
     visible timer.
   - If the extra minute is retained for design reasons, label the button
     explicitly as `15 min extraction + 1 min setup`. This is not preferred for
     first-session clarity.

3. Use shared time formatting everywhere.
   - FIELD countdown.
   - RIG countdown.
   - Fail-safe tripped line.
   - Hull deploy warning line.
   - No raw fractional seconds.

4. Tests.
   - 5-minute deploy preview stores/displays 300 seconds.
   - 15-minute deploy preview stores/displays 900 seconds.
   - `formatMmSs()` floors fractional seconds.
   - Fail-safe copy uses formatted time.

### Acceptance

- No 5-minute button starts a 6-minute countdown.
- No 15-minute button starts a 16-minute countdown.
- No raw `2:3.588...` style time appears.

## Workstream 8 - Workshop Layout And Schematic Readability

### Problems

- Thumper station has a horizontal scrollbar.
- Fabricator station also has horizontal scroll.
- Fabricator art appears in the wrong place; user wants it above schematics like
  the thumper art.
- Missing-material messaging overlaps item names and jumbles letters.
- Workshop initially dumped the player to Survey Scanner after assembly in an
  earlier pass; keep the Thumper/Fabricator station picker behavior intact.

### Files

- `apps/web/src/routes/workshop/+page.svelte`
- `apps/web/src/lib/rig/ThumperAsciiPre.svelte`
- `apps/web/src/lib/workshop/SchematicList.svelte`
- `apps/web/src/lib/workshop/WorkshopBench.svelte`
- `apps/web/src/lib/workshop/SlotSelector.svelte`
- `apps/web/src/lib/workshop/ChassisAssemblyPanel.svelte`
- `apps/web/src/lib/theme.css`

### Implementation

1. Remove horizontal ASCII scrolling.
   - Replace `overflow-x: auto` with responsive no-overflow layout.
   - Use a smaller monospace font at narrow widths.
   - Add shorter ASCII variants if necessary.
   - Do not hide important content behind clipping.

2. Place fabricator art above schematics.
   - When Fabricator is selected, render Fabricator art at the top of that
     station panel.
   - The schematic list follows under the art.
   - Keep Thumper first and Fabricator second in the station picker.

3. Fix schematic row layout.
   - Name on first line.
   - Status/missing material text on a second line underneath.
   - Avoid `justify-content: space-between` for long missing-material copy.
   - Missing-material details wrap naturally within the container.

4. Fix blocker copy.
   - Hull Plate blockers should be readable as separate lines:
     - Structural Alloy requirement.
     - Bonding Matrix / Reactive Crystal requirement.
     - Suggested next action.
   - Do not overlap item names or other requirement text.

5. Visual checks.
   - Desktop WORKSHOP, Thumper station.
   - Desktop WORKSHOP, Fabricator station.
   - Mobile/narrow WORKSHOP, Thumper station.
   - Mobile/narrow WORKSHOP, Fabricator station.
   - Hull Plate missing-material state.

### Acceptance

- No body-level horizontal scroll caused by WORKSHOP.
- No visible horizontal scrollbar in thumper or fabricator ASCII.
- Fabricator art appears above the schematic list.
- Missing-material text is readable and non-overlapping.

## Workstream 9 - Telemetry Expansion

### Problems

- Current telemetry is mostly one-shot funnel events.
- We had to reconstruct the failure from inventory, orders, ledger, and thumper
  rows.
- Future reports need to be diagnosable without custom multi-table SQL.

### Files

- `packages/db/src/playtest/eventNames.ts`
- `packages/db/src/queries/playtestTelemetry.ts`
- `apps/web/src/lib/server/playtestTelemetry.ts`
- `apps/web/src/routes/field/+page.server.ts`
- `apps/web/src/routes/rig/+page.server.ts`
- `apps/web/src/routes/settlement/+page.server.ts`
- `apps/web/src/routes/workshop/+page.server.ts`

### Implementation

Add repeatable telemetry for:

1. `field_sample_completed`
   - pilot id
   - resource id / slug / display name
   - family
   - concentration
   - quantity
   - energy cost
   - energy before / after
   - free sample boolean
   - order id
   - order progress before / after
   - order filled boolean

2. `next_action_resolved`
   - route
   - tutorial step
   - resolved screen
   - reason
   - active order id if any
   - open run id if any

3. `deploy_attempted`
   - target resource
   - family
   - waypoint / spot id
   - tutorial deploy phase
   - tail minutes
   - allowed boolean
   - blocked reason

4. `active_run_panel_rendered`
   - route
   - run id
   - mode: active, event, claimable, result, idle
   - seconds remaining
   - current event id/window if any

5. `rig_event_response_submitted`
   - route
   - run id
   - window index
   - complication
   - selected response
   - accepted boolean
   - resulting mode

6. `workshop_station_viewed`
   - station
   - selected schematic
   - blockers count
   - craftable boolean

7. `tutorial_recovery_state`
   - emitted when the server detects first-hull pending plus low hull condition
     or low hull integrity.
   - include available tails and visible repair/patch actions.

### Acceptance

- The next playtest failure, if any, can be diagnosed from telemetry rows alone
  plus one focused DB query.
- Sample/deploy/nav events are not one-shot-only.

## Workstream 10 - Automated Simulation And Browser Smoke

### Problems

- Manual tunnel testing found issues that unit tests did not catch.
- We need deterministic coverage before another human test.

### Files

- `design-docs/first_hull_path_sim.py`
- `apps/web/package.json`
- `apps/web/tests/` or the existing Playwright/smoke location
- `packages/domain/src/**/*.test.ts`
- `packages/db/src/**/*.test.ts`

### Implementation

1. First-hull sim.
   - Must run the exact expected first-session path.
   - Must fail if first hull is not craftable.
   - Must print final inventory and requirements.
   - Must explicitly print `Reinforced Hull Plate craftable: yes`.

2. Browser smoke path.
   - Fresh account.
   - Confirm incoming brief.
   - Assert FIELD highlighted.
   - Assert Structural Alloy / Keth recommended.
   - Sample Keth and assert progress updates on first sample.
   - Fill/turn in first order.
   - Assert Conductive Metal / Sorrel recommended.
   - Sample Sorrel and assert progress updates on first sample.
   - Fill/turn in second order.
   - Assemble rig.
   - Assert no WORKSHOP horizontal scroll.
   - Assert tutorial deploy target is locked to Keth.
   - Try wrong resource deploy and assert server rejects.
   - Deploy first Keth run.
   - Assert RIG highlighted and active panel visible.
   - Respond to event on RIG.
   - Claim/acknowledge through RIG/Settlement as designed.
   - Patch.
   - Deploy second Keth run.
   - Pick 15-minute run.
   - Assert timer starts at 15:00 or lower, not 16:00.
   - Navigate away and back to RIG; assert active run visible.
   - Complete/claim.
   - Assert no zero-option deploy state.
   - Assert hull craft path remains possible.

3. Workshop visual smoke.
   - Desktop and mobile/narrow screenshot.
   - Assert body scroll width equals viewport width.
   - Assert ASCII containers do not expose horizontal scrollbars.
   - Assert missing-material copy bounding boxes do not overlap schematic names.

4. No-dead-end smoke.
   - Recreate the reported hard-stop state:
     - patched hull 30/30
     - first hull pending
     - first async waiver consumed
   - Assert visible legal short run or immediate visible affordable patch/repair.

### Required Verification Commands

Run these before any human tunnel playtest:

```bash
rtk pnpm --filter @async-frontier-mmo/domain check
rtk pnpm --filter @async-frontier-mmo/domain test
rtk pnpm --filter @async-frontier-mmo/db check
rtk pnpm --filter @async-frontier-mmo/db test
rtk pnpm --filter web check
rtk python design-docs/first_hull_path_sim.py
rtk python design-docs/energy_regime_sim.py
rtk python design-docs/sampling_ratio_sim.py
rtk pnpm --filter web smoke:browser
```

If DB tests hit the known sandbox `tsx` pipe issue, rerun them unsandboxed with
the already-approved `rtk pnpm exec tsx` or package test prefix.

### Acceptance

- All commands pass.
- Browser smoke proves the active run remains visible on RIG after navigation and
  event response.
- Sim proves first hull craftability.

## Workstream 11 - Final Tunnel Reset And Release To Human Test

This happens only after Workstreams 1-10 pass.

### Reset Procedure

1. Preserve the current failing evidence until implementation is complete.
2. Reset the dev database backing the tunnel:
   - Drop `public`.
   - Drop `drizzle` if that schema exists.
   - Recreate `public`.
   - Rerun Drizzle migrations.
3. Verify the tunnel route returns 200:
   `https://performer-friends-herbs-beaches.trycloudflare.com/settlement`
4. Start the human test with a truly fresh browser state:
   - Incognito/private window, or
   - clear the `pilot_id` cookie for the tunnel domain.

### Release Gate

Only call the rollout ready when all are true:

- No workstream acceptance criteria are open.
- First-hull sim passes.
- Browser smoke passes.
- Domain, DB, and web checks pass.
- Known hard-stop state has a legal next action.
- RIG owns active deployment through acknowledgement.
- Tutorial deploys cannot target non-Keth resources.
- Workshop has no horizontal overflow or overlapping schematic text.
- Telemetry can explain sample, deploy, nav, active panel, event, and workshop
  states.

## Agent Handoff Notes

- Keep changes scoped to the first-session loop. Do not expand game scope.
- Preserve already-fixed Round 4 items:
  - shared `formatMmSs()` time formatting
  - ASCII footer trimmed to `HULL nn%`
  - live rig dashboard bars
  - Fabricator/Thumper station picker
  - settlement acknowledgement lines
  - pinned mission order stability
  - overdrive scrap debit DB test
  - equipment lock for open or claimed-but-unacknowledged runs
- Do not reset the database until the final gate.
- Do not ask for another human playtest while any acceptance criterion is red.
- Include a final implementation summary listing the exact tests/sims/smoke runs
  and their results.
