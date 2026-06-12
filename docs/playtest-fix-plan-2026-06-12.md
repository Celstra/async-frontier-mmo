# Playtest fix plan — 2026-06-12 field test

Prompt for implementing agent. Each item is independently shippable; do them in order.
Repo: pnpm workspace. UI in `apps/web`, game rules in `packages/domain`, queries in
`packages/db`. Server-authoritative; domain logic must not import UI/DB.

Run `pnpm test` (domain + db unit tests) and `pnpm --filter web check` (svelte-check)
after each group. Do not paraphrase copy marked "locked" without logging the amendment
(see item 14).

---

## Group A — copy fixes (small, do first)

### A1. Prologue modal line breaks
`apps/web/src/lib/copy/prologue.ts` + `apps/web/src/lib/settlement/PrologueTakeover.svelte:18`.
`PROLOGUE_LINES` are joined with `\n` and rendered in a `pre-wrap` `<pre>`, so the modal
shows mid-sentence hard breaks ("No fabricator, no / thumpers") plus a second wrap from
the narrow panel. Fix: render as a normal `<p>` with the lines joined by a single space
(`PROLOGUE_LINES.join(' ')`), `white-space: normal`. Keep `PROLOGUE_LINES` itself
unchanged (locked copy — the words stay verbatim; only the rendering changes).

### A2. Foreman first-orders line
`apps/web/src/lib/copy/foreman.ts:12` — change
`'Pick a family from the foreman list…'` → `'Pick a resource family from the foreman list…'`
(rest of sentence unchanged).

### A3. Workshop "Phase 6" leakage
- `apps/web/src/lib/workshop/ChassisAssemblyPanel.svelte:75`:
  `Rig assembled — equip and deploy from RIG (Phase 6).` →
  `Rig assembled — equip it on RIG, then deploy from FIELD on a sampled deposit.`
  (Verify the actual flow first: if chassis assembly auto-equips, say
  `Rig assembled — head to FIELD and deploy on a sampled deposit.`)
- `apps/web/src/lib/workshop/WorkshopBench.svelte:335`:
  `Item crafted — equip it from RIG when that screen ships in Phase 6.` →
  `Item crafted — equip it from RIG.`

---

## Group B — field map UX

### B1. Visible map bounds
`apps/web/src/lib/field/FieldMap.svelte`. The 16×11 grid renders fully but undiscovered
cells are transparent spaces, so the player cannot tell the map edge from unexplored fog —
hitting the boundary feels like a bug. Fix: put a visible frame exactly around the grid:
give `.field-map__grid` (already `width: max-content`) a `1px solid var(--border-subtle)`
border + small padding, or render void cells as `·` at very low opacity
(`color: var(--text-muted); opacity: 0.15`). Either way the full 16×11 extent must read
as "the map" so edges are obvious. Do NOT change movement logic in
`packages/db/src/queries/fieldSession.ts` — bounds are correct (16×11, spawn 8,5).

### B2. "Cannot move off the map" flashes on the map, palette colors
`apps/web/src/routes/field/+page.server.ts:210-216` returns `fail(400, { message })`,
which renders as the red `flash--error` banner at the top of
`apps/web/src/routes/field/+page.svelte:65-69`. Fix:
- For the `out_of_bounds` case only, return success-shaped data with a new field
  `mapFlash: 'Cannot move off the map'` instead of `fail` (it is not an error state).
- In `+page.svelte`, render `form?.mapFlash` as a centered overlay on
  `.field-map__explore`: phosphor palette (`var(--phosphor)` text, `var(--bg-inset)`
  backing), never red. CSS animation: visible ~1.2s then fade out; `aria-live="polite"`.
  Key the animation so repeated bumps re-trigger (e.g. `{#key}` on a timestamp).

---

## Group C — sampling

### C1. Segmented sample progress bar with early first tick
`apps/web/src/routes/field/+page.svelte:227-237` shows a smooth fill driven only by the
3-second server poll, so the first visible movement arrives at ~3s/30%.
- Create `apps/web/src/lib/field/SegmentedBar.svelte`: outer 1px phosphor border, inner
  row of N small boxes (default 10) filled left→right with a gap between boxes
  (`▓ ▓ ▓ ▓` look — use CSS blocks, not text glyphs, for crisp rendering). Props:
  `progressPercent`, `segments`, optional `direction: 'fill' | 'drain'`, optional
  `blinkActive` (active segment blinks via CSS animation).
- Drive progress client-side: `data.pendingSampleProgress.completesAt` is already an ISO
  string; the sample duration is 10s (`SAMPLE_DURATION_SECONDS`,
  `packages/domain/src/tuning.ts:4`). Compute percent locally with a ~250ms
  `setInterval` in a `$effect` from `startedAt`/`completesAt` (add `startedAt` to
  `pendingSampleProgress` in `apps/web/src/lib/server/fieldLoad.ts:270-284` if needed)
  so the first segment fills within the first second. Keep the 3s poll for server truth.

### C2. Exhausted surface pool — stop the silent nothing
Each spot allows 5 hand samples (`SPOT_SAMPLE_POOL`, `packages/domain/src/tuning.ts:5`).
Two fixes:
1. **Pre-check at start**: in the `sample` action
   (`apps/web/src/routes/field/+page.server.ts:222-248`), before
   `startPilotFieldSample`, call `samplesTakenOnSpot` (exported from
   `packages/db/src/queries/prospecting.ts` — export it if not already) and if
   `>= SPOT_SAMPLE_POOL` return immediately with an informational message instead of
   making the player wait 10s for nothing.
2. **Handle completion statuses**: `loadFieldScreen`
   (`apps/web/src/lib/server/fieldLoad.ts:151-153`) only handles
   `insufficient_energy` and `ok`. Add handling for `spot_pool_exhausted` and
   `spot_already_sampled` → set `sampleFlash` to:
   `Surface remnants exhausted here — nothing left to hand-sample. Deploy a thumper to tap the deposit.`
3. **Render below the Sample button**, not as the red top-of-page banner: in
   `+page.svelte`, move/duplicate the sample-related flash directly under the
   `Sample here` form (around line 221) styled as an informational hint
   (`var(--text-secondary)` / phosphor), not `flash--error`.
4. **Units clarity**: in the deploy panel hint (line 277-280), `~300u in deposit` is the
   thumper-extractable pool which hand sampling never reduces. Change copy to
   `~300u in deposit (thumper extraction)` and show hand-sample pool state next to the
   sample button when known: `Hand samples left here: 3/5`.

### C3. Order-complete notice on sample (anti-overshoot)
After a pending sample completes, `loadFieldScreen` calls `maybeAdvanceHuntingToTurnIn`
(`apps/web/src/lib/server/fieldLoad.ts:156`). The player gets no signal that the order is
filled and keeps burning energy. Fix:
- In `loadFieldScreen`, after a successful sample completion, load the active order
  progress (reuse the logic behind `loadSettlementMissionTicker` /
  `boundStackProgress` in `apps/web/src/lib/server/settlementLoad.ts`) and add to
  `lastSampleResult` a field like
  `orderStatusLine: 'ORDER FILLED — Conductive Metal stack complete. Return to SETTLEMENT to turn in.' | 'Order progress: 38/50u' | null`.
- Render it prominently in `apps/web/src/lib/field/SampleResultPanel.svelte` — bright
  phosphor when filled. This matters most during the tutorial hunting step.

---

## Group D — thumper run: timer, choices, consequences, claim

### D1. Thumper countdown timer + draining segmented bar
The deployed rig view (`apps/web/src/routes/field/+page.svelte:92-124`) shows no time
information, but the server already computes it: `rigView.thumperDemo.secondsRemaining`
(`packages/domain/src/thumper/resolveThumperState.ts`) — it's just never rendered.
- Under the thumper ASCII art, render `SegmentedBar` in `drain` mode: starts full,
  segments empty as time passes (each segment = totalDuration/segments), the segment
  currently draining blinks, with `mm:ss` remaining underneath.
- Tick client-side from `rigView.loadedAt` + `secondsRemaining` (~1s interval); the 3s
  poll corrects drift. When it hits 0 the poll flips the run claimable.

### D2. Event windows must show stakes per option
`apps/web/src/routes/field/+page.svelte:104-122` renders only `option.label`. The domain
already computes everything needed (`mapEventWindowsForUi`,
`apps/web/src/lib/server/fieldRunState.ts:142-322`): per-option `effectLine`,
`projected` meter deltas, `disabledReason`, plus window `severity`,
`matchingActionLabel`. Render:
- Window header: complication name + severity tag (`minor`/`serious`).
- Each option button: label on the first line, `effectLine` underneath in smaller
  secondary text (this is the consequence preview — the core of choice/consequence).
- Disabled options: show `disabledReason` (e.g. Field Repair needs a kit).
Keep it one screen — no modal.

### D3. Event window outcome must persist after choosing
Responded windows are filtered out entirely (`{#if !window.quiet && !window.responded}`),
so the computed `outcomeLine` (before→after meters,
`formatEventWindowOutcomeLine`) is never shown — the window just vanishes. Fix: render
responded windows in a compact "resolved" state inside the rig view: complication,
chosen response label, and `outcomeLine`. Most recent first or in window order —
a small run log the player can read during the rest of the run.

### D4. Claim flow lives with the thumper, ends with an acknowledgment
Currently `Claim yield` and the result panel render at the very top of the FIELD page
(`+page.svelte:71-90`), detached from the thumper, and the result silently disappears on
next navigation. Restructure:
- While a run is claimable or has an unacknowledged result, keep showing the rig view
  (thumper art + timer at 0): extend `showRigView` logic in
  `apps/web/src/lib/server/fieldLoad.ts:455-459` to include
  `claimView.mode === 'claimable' || claimView.mode === 'result'` (for the run's
  context, including async runs).
- Move the `Claim yield` button and the result panel inside the rig view, next to the
  thumper: banner line, `explanation.summary`, recovered units, and (D3) the resolved
  event log.
- Add a `Send to storage` button under the result that acknowledges it and returns the
  player to the normal field/over-map view. Persistence: add nullable
  `acknowledged_at` to the thumper run results table
  (`packages/db/src/schema/` + Drizzle migration), a small query
  `acknowledgeThumperRunResult`, and a `?/acknowledgeClaim` action. `loadClaimScreen`
  (`apps/web/src/lib/server/fieldClaimState.ts`) returns `mode: 'none'` for
  acknowledged results.

### D5. Hull integrity vs condition — kill the surprise
Root cause of the "hull was at top marks, now he says it's broken" confusion: the
scavenged hull has `integrity = 5` (`SCAVENGED_HULL_INTEGRITY`,
`packages/domain/src/tuning.ts:45`) but high *condition*; the UI shows condition bars
only, and the fail-safe trips on integrity. Fixes:
- Wherever the hull is listed (RIG `EquipSlotPanel`, workshop assembly result, deploy
  preview), show integrity alongside condition for hulls:
  `Integrity 5% — scavenged. Fail-safe will recall this run early.` Use
  `hullTierFromIntegrity` for the tier word.
- Deploy preview for a scavenged/patched hull gets one warning line before the player
  commits: `Scavenged hull: the rig will secure itself early and recover partial yield.`
- Claim banner copy (`packages/domain/src/tutorial/tutorialClaimCopy.ts`) leaks dev
  jargon: `…(scripted floor — never empty-handed).` → reword player-facing:
  `RIG SECURED — fail-safe nominal. Hull integrity spent. Partial yield recovered: {n}u — the fail-safe never comes home empty-handed.`
  **This string is marked verbatim slice-spec copy** — change it AND log the amendment
  (see item 14 / repo convention below).

---

## Group E — deferred (do NOT implement now)

- **Comms "what to build next" + pinnable resource requirements**: design work first.
  Add an entry to `design-docs/LAYERED_FEATURE_BACKLOG.md`: foreman/comms nudge
  suggesting the next schematic, tap → requirements view, "pin" tracked resources shown
  on FIELD. No code.

---

## Conventions & verification

- Locked-copy amendments: previous review passes logged wording changes in
  `design-docs/` (see commit `e21f94d` "docs: log review-pass amendments"). Add a short
  amendment note for A1 (render-only) and D5 (banner reword) in the same place.
- After each group: `pnpm test` and `pnpm --filter web check`.
- Manual verification path (tutorial flow): prologue modal wraps cleanly → pick family →
  walk to map edge (flash on map, not red) → sample (segmented bar ticks within 1s;
  5th repeat sample on one spot shows the exhausted notice immediately, no 10s wait) →
  fill the order by sampling (ORDER FILLED line appears in sample result) → assemble rig
  (no "Phase 6") → deploy (scavenged-hull warning visible) → event window shows effect
  lines per option; after choosing, resolved line stays visible → timer counts down on
  the thumper → claim next to thumper → `Send to storage` returns to over-map and the
  result does not reappear.
