# Round-4 Tunnel Playtest Telemetry Findings - 2026-06-14

## Scope

This document cross-checks Ryan's latest tunnel playtest report against the local dev database backing:

`https://performer-friends-herbs-beaches.trycloudflare.com`

Primary pilot identified from telemetry:

- Pilot: `35df847b-27e7-44f7-bef6-f36e0306c518`
- Tutorial step at inspection: `done`
- Telemetry events: 180
- Thumper runs: 3
- Inventory stacks: 3

Important limitation: `playtest_events` currently logs mostly one-shot funnel events. It does not log every sample, nav highlight transition, active panel visibility change, selected waypoint, or failed deploy attempt. Where telemetry is too coarse, this review uses current DB rows, economy ledger rows, thumper run rows, and code paths.

## Current End State

Inventory:

- `Sorrel Vein Copper` - 96u Conductive Metal
- `Glimmerfall Shard` - 24u Reactive Crystal
- `Keth Iron` - 1u Structural Alloy

Open settlement orders:

- `next_need` Reactive Crystal - 12u, open, unbound
- `next_need` Conductive Metal - 18u, open, unbound

Equipped gear:

- Worn Basic Drill - condition 31, integrity 70
- Worn Basic Pump - condition 28, integrity 70
- Worn Basic Hull - condition 30, integrity 30

Deploy availability check:

- `availableTails(patched, 30, { unlockFirstAsyncTail: false })` returns `[]`
- `availableTails(patched, 30, { unlockFirstAsyncTail: true })` returns `[15 min]`

So the reported hard stop is real: after the one-time first async waiver is consumed, a 30% patched hull has no legal tail options.

## Reconstructed Timeline

Telemetry milestones:

- 12:27:36 - `prologue_done`
- 12:29:31 - `first_family_chosen`, family `structural_alloy`
- 12:30:27 - `first_scan`
- 12:30:58 - `first_move`
- 12:31:39 - `first_sample`
- 12:31:52 - `first_stat_reveal`, `keth_iron`
- 12:35:26 - first settlement turn-in completed, 15u Keth Iron
- 12:36:15 - `second_family_started`, family `conductive_metal`
- 12:40:48 - `fabricator_online_seen`
- 12:41:03 - rig assembled
- Later - three thumper runs completed/claimed

Sample rows:

- Keth Iron, 85%, 4 samples, 16u total granted by hand sampling
- Sorrel Vein Copper, 69%, 4 samples, 12u total granted by hand sampling
- Glimmerfall Shard, 68%, 1 sample, 3u total granted by hand sampling

Resource ledger summary:

- Keth Iron: +16u from samples, -15u settlement turn-in, final 1u
- Sorrel Vein Copper: +12u samples, -12u settlement turn-in, +96u net from thumper rewards, final 96u
- Glimmerfall Shard: +3u sample, +21u thumper reward, final 24u

Thumper runs:

1. Sorrel Vein Copper, 69%, 2m tutorial tail, stored duration 180s, hull 55/5, recovered 36u, recalled by hull fail-safe.
2. Sorrel Vein Copper, 69%, 5m tutorial tail, stored duration 360s, hull 30/30, recovered 60u, completed.
3. Glimmerfall Shard, 68%, 15m tail, stored duration 960s, hull 30/30, recovered 21u, completed.

Ryan reported 24u RC recovered. DB explains the number: 21u from the thumper plus 3u from the free Glimmerfall sample equals the 24u final stack.

## Findings

### 1. Post-briefing settlement copy and nav are wrong

Report:

- Briefing confirm returns to settlement.
- Foreman says to pick a resource family from the foreman list.
- Player cannot pick a family there.
- Settlement remains orange/highlighted.

Evidence:

- `foremanLine(first_orders)` says: "Pick resource family foreman list hunt it on FIELD..."
- `tutorialNextActionScreen('first_orders')` returns `settlement`.
- The actual family selector is on FIELD and has a default selected family.

Root cause:

The first post-briefing step is split between SETTLEMENT copy and FIELD controls, but navigation still points at SETTLEMENT.

Fix:

- Change first-orders next action to FIELD, or add an actual settlement action that chooses/locks the first family.
- Preferred for this flow: keep family choice on FIELD and update copy to:
  - "First order is Structural Alloy. FIELD is ready on that family - scan for Keth Iron."
- Do not say "pick" if the UI default already picked.
- Add a regression test for `resolveNextActionScreen({ tutorialStep: 'first_orders' }) === 'field'` if we choose that path.

### 2. Free first sample grants units but order progress stays at zero

Report:

- First Keth sample at 85% grants +4u and costs no energy, but order progress still shows 0.
- Second Keth sample grants +4u and order jumps to 8/12 or 8/15.
- Same pattern repeats for Sorrel.

Evidence:

- Sample rows show 4 Keth samples and 4 Sorrel samples.
- Economy ledger shows the first free sample grants resource units.
- `sampleSpotForPilot()` only calls `bindSettlementOrdersOnSample()` when `sampleResult.energyCost > 0`.
- Result: the free reveal sample is real inventory, but the order is not bound/progressed until the first paid sample. When it binds, it sees the existing free sample units and jumps.

Root cause:

The mechanic is internally consistent but not legible. "Sample complete +4u" reads like order progress should move immediately.

Fix options:

1. Bind tutorial orders on the first free sample when the sampled resource matches the current pinned order/recommended target.
2. Keep free samples non-binding, but display explicit copy:
   - "Scout sample banked +4u. Foreman order binds on the next paid sample."
   - Show projected progress if the player continues with that same resource.

Preferred for the tutorial: option 1. The player is following a recommended target, so treating the first sample as part of the order is less surprising.

### 3. Nav highlight remains misleading around order turn-ins

Report:

- After order complete / "return to settlement", FIELD remains orange in at least one case.
- Later settlement correctly highlights after the second order.

Evidence:

- Telemetry does not log nav highlight state, so this cannot be proven from telemetry.
- The code now has live overlays via `loadNextActionScreen()`, but enhanced form submissions may still show stale layout data if the layout is not invalidated at the right time.

Root cause candidates:

- Layout next-action state may not be invalidating consistently after sample actions.
- `first_orders` / `hunting` / `turn_in` transitions depend on order binding, and free samples delay binding.
- Existing telemetry is too coarse to confirm the exact highlight state.

Fix:

- After sample and turn-in actions that change order readiness, explicitly invalidate the layout or return next-action state through action data.
- Add telemetry for `next_action_screen_changed` or record the resolved next-action screen on key actions during playtest builds.
- Add a browser smoke assertion: when sample panel says `ORDER FILLED`, nav highlights SETTLEMENT.

### 4. Tutorial thumper target is not constrained, causing the material dead-end

Report:

- After rig assembly, player deployed on copper because FIELD highlighted and copper was still available.
- Later second deploy remained on copper.
- Player ended with 96u Conductive Metal and only 1u Structural Alloy.

Evidence:

- Thumper run 1: Sorrel Vein Copper, recovered 36u.
- Thumper run 2: Sorrel Vein Copper, recovered 60u.
- Final inventory: 96u Sorrel, 1u Keth.
- First hull bill still requires 100 Structural Alloy and 20 Reactive Crystal.

Root cause:

The tutorial says "deploy on the deposit you sampled," but the player had sampled multiple resources. The code preserves tutorial waypoint constraints, but the first tutorial run target was allowed to be the wrong resource. Once run 1 is copper, the same-waypoint rule for run 2 reinforces the wrong target.

Fix:

- Hard-lock first and second tutorial thumper runs to the Structural Alloy tutorial target, not merely "last sampled deposit."
- After rig assembly, FIELD should auto-select the Keth Iron waypoint used for the first Structural Alloy order.
- During `first_deploy` and `second_deploy`, hide or disable deploy controls for non-tutorial targets.
- Copy should say:
  - "Tutorial deploy locked: Keth Iron structural haul."
- Add a regression test or server action test:
  - `first_deploy` rejects any non-Keth/non-first-structural waypoint.
  - `second_deploy` uses the same locked Keth waypoint.

### 5. First-hull path still lacks a guaranteed Structural Alloy floor

Even if the tutorial deploy target is fixed, we should not rely on the player stumbling into enough SA.

Current actual path:

- Keth after first hand order: 1u left.
- Tutorial thumps went to CM, so first-hull SA is impossible without more thumping.

Intended fixed path needs validation:

- Hand-fill first order consumes 15u Keth.
- If two tutorial Keth thumps grant roughly 36u + 60u, player has about 97u Keth.
- That is still short of the 100u Structural Alloy bill unless more Keth is granted or the player gets an additional SA top-up.

Fix:

- Run a first-hull path sim with forced Keth tutorial deploys and current constants.
- Choose one of:
  - raise scripted Keth tutorial recovery enough that the first hull SA bill is reachable;
  - reduce first Reinforced Hull Plate SA requirement slightly for the tutorial bill;
  - require one explicit post-async SA thump before RC, with deploy still available;
  - grant a small tutorial SA make-up after the second Keth thump.

Acceptance criterion:

- A fresh tutorial player who follows recommendations and never samples/thumps extras must be able to craft Reinforced Hull Plate after the scripted first-hull lesson path.

### 6. Active thumper experience must live on RIG now, not later

Report:

- After starting the 15m run and clicking an event, the thumper view closed.
- Player went to WORKSHOP because they could not view the thumper.
- Player explicitly wants active thumping, event choices, and live component bars moved to RIG as the persistent home.

Evidence:

- Current working tree has a shared `ActiveRunPanel`, and FIELD currently attempts to render it for open runs.
- Ryan's report shows that this is still not reliable or not conceptually right for the first-session experience.
- RIG already has equipment lock state and active run data now.

Root cause:

The UI still treats active deployment as a FIELD overlay in practice. The player needs a stable "machine is running" surface, not a transient deploy panel in the survey screen.

Fix:

- Make RIG the canonical active deployment screen.
- During an open run:
  - nav highlight should be RIG, not FIELD;
  - FIELD should show survey/deposit context only, with a clear "Rig deployed - monitor on RIG" action;
  - all event responses, live meters, claim, and acknowledgement should be on RIG.
- Keep FIELD deploy controls disabled while a run is open.
- Add browser smoke:
  - deploy 15m;
  - navigate away/back;
  - `/rig` still shows active timer/meters/event or idle state;
  - responding to an event keeps `/rig` on the active run panel.

### 7. "15 min" run starts at 16 minutes

Report:

- Choosing 15m starts at 16m.
- Earlier 5m tutorial starts at 6m.

Evidence:

- Third thumper run has `extraction_tail_minutes = 15` and `duration_seconds = 960`.
- 960 seconds = 16 minutes.
- Domain deploy preview has `ACTIVE_PHASE_SECONDS = 60` and total duration = active phase + tail.

Root cause:

The label says tail length, but the timer shows total run duration including a 60-second active phase.

Fix:

Choose one:

- Change labels to "15 min extraction + 1 min setup/event window."
- Or make countdown display the tail label and separately display active phase.
- Or remove the extra minute from player-facing total duration for tutorial readability.

For first-session playtest, the least confusing choice is to make the button and timer agree.

### 8. Patched hull creates a hard stop after the first async run

Report:

- After 15m RC thump, player cannot deploy again.
- FIELD says patched hull may recall at ~7:04, then says hull integrity too low for any run duration.
- Player has hull condition 30 and hull integrity 30 and reasonably expects another short run.

Evidence:

- Current equipped hull: condition 30, integrity 30.
- Domain available tails at patched 30 without first-async waiver: `[]`.
- FIELD blocked reason is therefore correct according to domain rules, but wrong for tutorial playability.

Root cause:

The first-async 15m waiver is one-time, and patched hull has no legal repeat run after that. The tutorial still expects the player to gather enough materials to craft first hull, so this is a structural dead-end.

Fix:

- Until Reinforced Hull Plate is crafted, patched hull must always allow at least one short recovery run.
- Options:
  - allow repeat 5m patched-hull limp runs at 30 integrity;
  - allow free repeat patch before first hull;
  - keep a 15m first-hull catch-up run while hull bill is incomplete;
  - add an emergency "tow rig home / salvage" action that restores enough integrity for one more run.

Acceptance criterion:

- No state before first Reinforced Hull Plate can produce `availableTails = []` unless the UI offers an immediate repair/patch action that the player can afford.

### 9. Workshop layout and ASCII overflow are confirmed UI problems

Report:

- Thumper has a horizontal scrollbar.
- Fabricator image should be above schematics like thumper.
- Fabricator also has horizontal scroll.
- Missing material messaging overlaps/jumbles under item names.

Evidence:

- `ThumperAsciiPre.svelte` uses `white-space: pre; overflow-x: auto`.
- `workshop/+page.svelte` uses `.fabricator-art { white-space: pre; overflow-x: auto; }`.
- Fabricator art is rendered beside the bench in `.fabricator-bench`, not above the schematic list.

Fix:

- Replace scrolling ASCII blocks with responsive, no-overflow presentation:
  - shrink font at narrow widths;
  - cap width with `max-width: 100%`;
  - use `overflow: hidden` only if art remains readable;
  - or use shorter ASCII variants for mobile/narrow panels.
- Move fabricator art above the schematic list in the fabricator station.
- Make schematic row layout wrap:
  - item name full-width first line;
  - missing material/status line below;
  - no `space-between` layout when text is long.

## Required Fix Order

1. Fix the first-session dead-end:
   - tutorial thumps locked to Structural Alloy/Keth;
   - patched hull can still run before first hull craft;
   - first-hull material path simulated and proven.
2. Move active deployment to RIG as canonical:
   - RIG nav highlight during open run;
   - events, timer, bars, claim live there;
   - FIELD does not become the only active-run surface.
3. Fix first-order copy/nav and sample progress confusion:
   - first_orders points FIELD or adds a real settlement action;
   - free sample/order progress behavior is explicit or changed.
4. Fix timer labels:
   - 15m button and countdown agree.
5. Fix workshop overflow/layout.
6. Add telemetry and browser smoke coverage for the exact failures.

## Telemetry Gaps To Add Before Next Playtest

Add playtest events for:

- every field sample: resource, family, concentration, quantity, energy cost, order progress before/after, whether free reveal
- every nav next-action resolution after server load/action: screen and reason
- deploy attempt: allowed/blocked, target resource, spot id, tail minutes, blocked reason
- active run panel rendered: route, run id, mode active/event/claim/result
- event response submit: route, window index, chosen response, resulting route/panel mode
- workshop station viewed and selected schematic

The current telemetry proved the high-level path, but not enough UI state. The DB filled the gaps this time; browser smoke and telemetry should catch these without manual reconstruction next time.

## Ready For Discussion

The main conclusion: this is not one bug. It is a chain:

1. First-order copy/nav starts the player in the wrong mental model.
2. Free sample progress looks broken because it grants inventory but does not bind the order.
3. Tutorial deploy allows the wrong resource, creating a huge CM surplus and SA starvation.
4. The one-time async waiver is consumed before the first hull is craftable.
5. Patched hull then has no legal run options, causing a hard stop.
6. Active deployment still does not feel anchored to RIG.

We should not run another full playtest until items 1, 3, 4, and 8 above are fixed and covered by at least one deterministic first-hull simulation plus one browser smoke.
