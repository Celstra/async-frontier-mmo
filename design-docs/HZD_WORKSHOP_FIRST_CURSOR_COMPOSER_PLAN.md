# HZD Workshop-First Cursor Composer Plan

Status: ready for Cursor Composer implementation after Ryan review.

Source notes reviewed:
- `AGENTS.md`
- `design-docs/HZD_LEARN_BY_PLAYING_WORKSHOP_FIRST.md`
- `design-docs/WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md`
- `design-docs/WORKSHOP_FIRST_IMPLEMENTATION_PLAN.md`
- `design-docs/DECISION_LOG.md` Decision 024
- current workshop Svelte, server, domain, DB, telemetry, and smoke-test files

## 1. GPT-5.5 Review Verdict

The HZD note fits this repo as a UX/onboarding pass, not as a new system design. The useful transfer is "problem -> tool -> use -> consequence": make the WORKSHOP goal clear, make the next empty socket obvious, show qualitative slot-fit tradeoffs, then explain what helped, what limited, and what to try next after the craft.

What fits:
- Mission framing for the active workshop-only playtest.
- A five-step in-page strip that tells the player where they are without a long tutorial overlay.
- Stronger empty-socket CTA in the main work area.
- Resource-picker hints that call out slot-relevant stats qualitatively.
- Result notes that teach by comparing actual craft outcomes.
- Collapsing or delaying crates until the first craft, so crates do not look like the first objective.
- Nudging Safe Craft users toward the existing two-pulse Experiment path.

What conflicts or needs modification:
- HZD is only an onboarding analogy. Decision 024 and the current implementation remain source of truth.
- The note's "show three schematic cards only" is already mostly implemented; the useful change is to default/recommend Basic Drill Head first, not rebuild schematic selection.
- Any "Focus scan" style hint must not become exact formula disclosure, best-input labeling, or hidden weighted scoring in the UI.
- "First experiment uses two Standard pulses" should not replace or simplify the existing two-pulse Careful / Standard / Overdrive model. If Composer changes defaults, it must preserve both pulses and all push options.
- Crates should be delayed/collapsed in UI only. Do not disable the server anti-stuck loop or remove persistence.

Reject:
- Field, rig, settlement, survey, deployment, orders, vendors, or narrative prologue expansion.
- New currencies or workshop credits.
- High-end starter resources or 800+ bench-stock stats.
- Broad domain/schema refactors just to improve onboarding copy.

## 2. Active Constraints / Non-Negotiables

Decision 024:
- The next playtest starts in WORKSHOP.
- FIELD, RIG, and SETTLEMENT remain visible but inactive/in-development.
- Active schematics are only Basic Drill Head, Efficient Pump, and Reinforced Hull Plate.
- Starter stock is low-to-mid "bench stock"; no 800+ Excellent or 900+ Exceptional starter stats.
- Resource stats set the practical ceiling; tuning expresses priorities; experimentation varies within resource-derived potential.
- No exact formula weights, no "best input" recommendations, no global relationship dump before crafting.
- Reclaim returns lossy exact named resources. It never rerolls, upgrades, or converts resources.
- Supply crates are repeat-support and anti-stuck mechanics, not a reward shop.
- No workshop-credit currency.
- The success signal is: "I want to find better resources for another attempt."

Current implementation constraints:
- Svelte 5 runes/components are already in place under `apps/web/src/lib/workshop/`.
- The server route already rejects inactive install/assembly paths during the playtest.
- `WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS` and bench-stock constants already exist in `packages/domain/src/workshop/`.
- Reclaim, crates, favorites, craft history, starter grants, and core telemetry already exist.
- Browser smoke tests currently assert no `<select>` controls in the experiment UI.
- Keep the two-pulse Experiment UI in `ExperimentPulsePanel.svelte`.
- Prefer UI-only/copy-first changes. Do not change DB schema unless Ryan approves the optional telemetry phase.
- Cursor should explain the next small change before editing, keep diffs scoped, and stop at review boundaries.

## 3. Cursor Phases

### Phase 0 - Baseline And Teaching Setup

Goal:
- Confirm the current workshop state and explain the planned UI-first pass before editing.

Inspect:
- `AGENTS.md`
- `.cursor/rules/learning-coach.mdc`
- `.cursor/skills/learning-coach/SKILL.md`
- `design-docs/HZD_WORKSHOP_FIRST_CURSOR_COMPOSER_PLAN.md`
- `design-docs/HZD_LEARN_BY_PLAYING_WORKSHOP_FIRST.md`
- `design-docs/WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md`
- `design-docs/DECISION_LOG.md` Decision 024
- `apps/web/src/routes/workshop/+page.svelte`
- `apps/web/src/lib/workshop/WorkshopBench.svelte`
- `apps/web/src/lib/workshop/SchematicList.svelte`
- `apps/web/src/lib/workshop/CraftResultReveal.svelte`
- `apps/web/src/lib/workshop/SupplyCratesPanel.svelte`

Implementation details:
- Do not edit code in this phase.
- Summarize to Ryan: current slice already has persistence, two-pulse experimentation, result reveal, reclaim, crates, favorites, and telemetry. This pass is about first-contact clarity.
- State the learning goal: "Learn how to improve onboarding by changing UI state and copy before changing domain rules."

Checks:
```bash
rtk git status --short
rtk pnpm --filter web check
```

Acceptance criteria:
- Cursor identifies any pre-existing check failures before editing.
- Cursor names the first tiny edit it will make and why.

STOP FOR REVIEW.

### Phase 1 - Mission Panel, Step Strip, And Basic Drill Head Start

Goal:
- Put the workshop mission and current step in front of the player before they interact with the bench.

Inspect/modify/create:
- Modify `apps/web/src/routes/workshop/+page.svelte`
- Modify `apps/web/src/lib/workshop/SchematicList.svelte`
- Modify `apps/web/src/lib/workshop/WorkshopBench.svelte`
- Create `apps/web/src/lib/workshop/WorkshopStepStrip.svelte`
- Create `apps/web/src/lib/workshop/WorkshopMissionPanel.svelte` only if keeping the mission markup in `+page.svelte` becomes noisy.

Implementation details:
- Add a top mission panel above the workshop layout, not inside a modal.
- Use compact copy:
  ```text
  WORKSHOP TEST
  Field crews are grounded. Make the best thumper part you can from imperfect bench stock. Craft a few attempts, keep your strongest prototype, reclaim weak ones, then decide what better resource you wish you had.
  ```
- Add a five-step strip:
  ```text
  1 Pick schematic
  2 Load slots
  3 Tune
  4 Craft/Experiment
  5 Compare/Keep/Reclaim
  ```
- Active-step behavior:
  - No schematic selected: `Pick schematic`.
  - Schematic selected but incomplete slots: `Load slots`.
  - Slots filled but tuning incomplete: `Tune`.
  - Ready to submit: `Craft/Experiment`.
  - Result reveal visible: `Compare/Keep/Reclaim`.
- Keep this as visual orientation, not a blocking wizard.
- Make Basic Drill Head the first/recommended onboarding target:
  - Order `basic_drill_head` first in `SchematicList.svelte`.
  - Add small copy on that card:
    ```text
    Start here: build one Drill Head. It only needs three bench choices.
    ```
  - Do not hide Efficient Pump or Reinforced Hull Plate.

Checks:
```bash
rtk pnpm --filter web check
rtk git diff --check
```

Optional browser checks if `DATABASE_URL` and smoke setup are available:
```bash
rtk pnpm --filter web smoke:browser:craft-reveal
```

Acceptance criteria:
- `/workshop` shows the mission panel and step strip.
- Basic Drill Head is the first visible recommended schematic.
- FIELD/RIG/SETTLEMENT remain inactive.
- No long tutorial overlay is added.
- Existing smoke helpers still find three schematic links.

STOP FOR REVIEW.

### Phase 2 - Obvious Empty Socket CTA

Goal:
- Make the next required action obvious after a schematic is selected.

Inspect/modify:
- `apps/web/src/lib/workshop/WorkshopBench.svelte`
- `apps/web/src/lib/workshop/AssemblyBoard.svelte`
- `apps/web/src/lib/workshop/ResourceSlotPickerSheet.svelte`

Implementation details:
- Add a main-column empty socket CTA above tuning and craft mode.
- When the selected schematic has an unfilled slot, show a large button:
  ```text
  This socket is empty.
  Load one Structural Alloy to shape the drill edge.
  ```
- Use the actual slot display name and required family:
  - Example for Basic Drill Head / Cutting Bit:
    ```text
    Step 2/5 - Load Cutting Bit
    This slot wants Structural Alloy.
    ```
- Clicking the CTA should open the same resource picker as clicking the assembly board socket.
- Do not remove or weaken the assembly board interactions.
- If all slots are filled, replace the CTA with a short preview sentence:
  ```text
  Slots loaded. Tune the result you care about, then craft or experiment.
  ```

Checks:
```bash
rtk pnpm --filter web check
rtk git diff --check
```

Optional smoke check:
```bash
rtk pnpm --filter web smoke:browser:craft-reveal
```

Acceptance criteria:
- First interactive target after choosing Basic Drill Head is visually clear in the main column.
- CTA opens the existing resource picker.
- Keyboard/focus return still works after closing the picker.
- No new route/action is introduced.

STOP FOR REVIEW.

### Phase 3 - Slot-Fit Hints Without Formula Reveal

Goal:
- Help players compare named resources for the current slot without exposing exact formula weights or "best" labels.

Inspect/modify/create:
- Modify `apps/web/src/lib/workshop/ResourceSlotPickerSheet.svelte`
- Modify `apps/web/src/lib/workshop/SlotSelector.svelte`
- Create `apps/web/src/lib/workshop/slotFitHints.ts`
- Inspect, but do not modify unless needed: `packages/domain/src/crafting/types.ts`

Implementation details:
- Build a UI helper from the selected `schematic` and `slot`:
  - Collect unique `slot_stat` terms for that slot.
  - Collect the property display names that those stats affect.
  - Include `OQ` as general quality context only if the copy stays qualitative.
- Do not use `stackSlotFitScore`, `buildResourceAllocationHints().bestUse`, exact weights, or ranked scores in UI copy.
- Picker-level hint:
  ```text
  This slot rewards Hardness for Extraction Rate and Depth Access. No material here is perfect - pick the tradeoff you want to test.
  ```
- Per-resource hints:
  ```text
  Hardness: Strong - helps this slot's main work.
  Malleability: Fair - may limit fine adjustment.
  ```
- Show 1-2 slot-relevant stats first, then full stat pills below if already present.
- Do not label any material "best", "recommended", or "optimal".

Checks:
```bash
rtk pnpm --filter web check
rtk git diff --check
```

Optional browser checks:
```bash
rtk pnpm --filter web smoke:browser:craft-reveal
```

Acceptance criteria:
- Resource picker explains what the current slot cares about.
- Exact formula weights remain hidden.
- Full stat visibility is preserved.
- No material is called best or optimal.
- No `<select>` controls are introduced.

STOP FOR REVIEW.

### Phase 4 - Result Notes And Safe-Craft-To-Experiment Nudge

Goal:
- Make every craft result teach one concrete helped/limited/try-next lesson and nudge safe crafters toward experimentation.

Inspect/modify/create:
- Modify `apps/web/src/lib/workshop/CraftResultReveal.svelte`
- Modify `apps/web/src/lib/workshop/WorkshopBench.svelte`
- Create `apps/web/src/lib/workshop/resultLearningNotes.ts`
- Update `apps/web/tests/helpers/workshopCraftFlow.ts` only if role/text helpers need stable selectors.
- Inspect `packages/domain/src/crafting/buildCraftResultExplanation.ts` for available fields, but avoid domain changes unless UI cannot derive truthful notes.

Implementation details:
- Add a compact result note panel near the top of the reveal:
  ```text
  What helped
  Asterion Frame Alloy's Hardness helped Extraction Rate.

  What limited it
  Low Malleability limited Wear Control.

  Try next
  For a sharper Drill Head, test Structural Alloy with stronger Hardness without giving up too much flexibility.
  ```
- Derive notes from existing `explanation.properties`, `drivers`, `slotFillsSnapshot`, and `resourceProvenance`.
- Do not display driver weights or weighted contributions.
- If a note cannot be confidently derived, use a truthful fallback:
  ```text
  Compare this prototype against your next attempt to see which resource tradeoff moved the result.
  ```
- Add Safe Craft nudge when `explanation.craftMode === 'safe_craft'`:
  ```text
  Prototype logged. Now try the same schematic with Experiment (2 pulses) to see if you can beat it.
  ```
- Preferred behavior:
  - Add a "Try Experiment next" button that dismisses the reveal and returns to the same schematic with craft mode set to Experiment.
  - Keep the normal "Craft another" button.
  - Preserve Safe Craft as an available option.
- Do not simplify or remove the two-pulse Experiment controls.

Checks:
```bash
rtk pnpm --filter web check
rtk git diff --check
```

Optional browser checks:
```bash
rtk pnpm --filter web smoke:browser:craft-reveal
```

Acceptance criteria:
- Experiment result reveal still shows Pulse 1 and Pulse 2.
- Safe Craft result reveal shows a clear Experiment nudge.
- Helped/limited/try-next notes appear without weights or best-input labels.
- Existing keep, compare, craft another, and reclaim controls still work.

STOP FOR REVIEW.

### Phase 5 - Delay/Collapse Supply Crates Until After First Craft

Goal:
- Keep crates from competing with the first craft objective while preserving the anti-stuck system.

Inspect/modify:
- `apps/web/src/routes/workshop/+page.svelte`
- `apps/web/src/lib/workshop/SupplyCratesPanel.svelte`
- `apps/web/src/lib/workshop/CraftResultHistory.svelte`
- `apps/web/tests/first-session.smoke.spec.ts`
- `apps/web/tests/workshop-acceptance-path.smoke.spec.ts`

Implementation details:
- Derive `hasCraftedAnyWorkshopPrototype` in `+page.svelte` from existing `data.craftHistoryBySchematic`.
- Before the first craft:
  - Do not show the full crate panel.
  - If any placeholder is needed, keep it quiet:
    ```text
    Supply crates unlock after your first prototype.
    ```
- After the first craft:
  - Show `SupplyCratesPanel` collapsed by default.
  - Existing ready-crate and timer behavior can remain.
- Do not change crate creation, timer sync, emergency crates, DB state, or supply constants.
- The purpose is visual priority, not economy redesign.

Checks:
```bash
rtk pnpm --filter web check
rtk git diff --check
```

Optional browser checks if DB smoke setup is available:
```bash
rtk pnpm --filter web smoke:browser:workshop-db
rtk pnpm --filter web smoke:browser:craft-reveal
```

Acceptance criteria:
- First-load workshop screen does not make crates look like the main objective.
- After one craft, crates are reachable and collapsed.
- Existing crate open behavior and anti-stuck behavior are not changed.
- Smoke tests are updated only where their UI expectations need to follow the new delayed crate display.

STOP FOR REVIEW.

### Phase 6 - Optional Telemetry For HZD Comprehension Checks

Goal:
- Add only cheap comprehension telemetry if Ryan wants instrumentation after the UX pass.

Status:
- Optional. Skip if it would slow the UX pass or require unwanted schema/migration work.

Inspect/modify if approved:
- `packages/db/src/playtest/eventNames.ts`
- `packages/db/src/queries/playtestTelemetry.ts`
- `packages/db/src/queries/playtestTelemetry.test.ts`
- `apps/web/src/lib/server/playtestTelemetry.ts`
- `apps/web/src/lib/server/workshopTelemetry.ts`
- `apps/web/src/routes/workshop/+page.server.ts`
- UI component that emits the event, if needed

Recommended optional events:
- `mission_panel_seen`
- `first_socket_cta_clicked`
- `slot_hint_seen`
- `safe_to_experiment_nudge_seen`
- `experiment_after_safe_craft`
- `crate_panel_opened_before_first_craft`

Use existing events first when possible:
- `workshop_started`
- `starter_resources_viewed`
- `schematic_selected`
- `resource_slot_filled`
- `resource_slot_replaced`
- `tuning_changed`
- `experiment_pulse_configured`
- `craft_started`
- `craft_completed`
- `craft_result_reveal_seen`
- `craft_result_craft_another_clicked`
- `result_compared`
- `supply_crate_opened`

Implementation details:
- Do not add third-party analytics.
- Keep payloads compact.
- Do not record personal data beyond existing pilot/session identifiers.
- If event names are TypeScript allowlisted only, update tests.
- If DB schema/migration is required, stop and ask Ryan before proceeding.

Checks:
```bash
rtk pnpm --filter @async-frontier-mmo/db test -- playtestTelemetry workshopTelemetry
rtk pnpm --filter web check
rtk git diff --check
```

Acceptance criteria:
- Existing telemetry remains intact.
- New events, if added, compile and have focused tests.
- No schema migration happens without explicit Ryan approval.

STOP FOR REVIEW.

### Phase 7 - Final Verification Pass

Goal:
- Confirm the onboarding pass is still Decision 024 compliant and did not regress the workshop slice.

Checks:
```bash
rtk pnpm --filter web check
rtk pnpm --filter @async-frontier-mmo/domain test -- workshopSlice
rtk pnpm --filter @async-frontier-mmo/db test -- workshopSlice workshopTelemetry
rtk git diff --check
rtk git status --short
```

Optional browser checks if DB smoke setup is available:
```bash
rtk pnpm --filter web smoke:browser:craft-reveal
rtk pnpm --filter web smoke:browser:workshop-db
```

Manual acceptance path:
- Fresh pilot lands on `/workshop`.
- Mission panel explains WORKSHOP TEST.
- Basic Drill Head is the recommended start.
- Empty socket CTA opens the resource picker.
- Resource picker shows qualitative slot-fit hints and no best labels.
- Player can Safe Craft and then sees Experiment nudge.
- Player can Experiment and still sees two pulses.
- Result reveal includes helped/limited/try-next notes.
- Crates are delayed/collapsed until after first craft.
- FIELD/RIG/SETTLEMENT remain in development.
- No horizontal overflow on mobile.

STOP FOR FINAL REVIEW.

## 4. UI / Copy Details

Top mission panel:
```text
WORKSHOP TEST
Field crews are grounded. Make the best thumper part you can from imperfect bench stock. Craft a few attempts, keep your strongest prototype, reclaim weak ones, then decide what better resource you wish you had.
```

Five-step strip:
```text
Pick schematic -> Load slots -> Tune -> Craft/Experiment -> Compare/Keep/Reclaim
```

Basic Drill Head start copy:
```text
Start here: build one Drill Head. It only needs three bench choices.
```

Obvious empty socket CTA:
```text
Step 2/5 - Load Cutting Bit
This socket is empty. Load one Structural Alloy to shape the drill edge.
```

Slot-fit hint:
```text
This slot rewards Hardness for Extraction Rate and Depth Access. No material here is perfect - pick the tradeoff you want to test.
```

Per-resource hint:
```text
Hardness: Strong - helps this slot's main work.
Malleability: Fair - may limit fine adjustment.
```

Tuning hint:
```text
Tuning does not upgrade ore. It tells the bench which result to prioritize from the material you chose.
```

Experiment hint:
```text
Experiment runs two bench pulses. Careful protects the attempt. Standard chases a better band. Overdrive can jump higher, but may scrap material.
```

Helped/limited/try-next result notes:
```text
What helped
Asterion Frame Alloy's Hardness helped Extraction Rate.

What limited it
Low Malleability limited Wear Control.

Try next
For a sharper Drill Head, test Structural Alloy with stronger Hardness without giving up too much flexibility.
```

Safe Craft nudge:
```text
Prototype logged. Now try the same schematic with Experiment (2 pulses) to see if you can beat it.
```

Delayed crate copy:
```text
Supply crates unlock after your first prototype.
```

## 5. Cursor Guardrails

- No FIELD/RIG/SETTLEMENT activation.
- No survey, deployment, settlement orders, marketplace, vendors, combat, or multiplayer work.
- No new currencies.
- No formula-weight reveal.
- No best-input, optimal-input, or recommended-material labels.
- No simplification of the two-pulse experimentation model.
- No high-end starter resources.
- No crate/reclaim economy redesign in this UX pass.
- No broad refactor unrelated to onboarding clarity.
- No domain/schema change unless a phase explicitly calls for it and Ryan approves.
- Preserve server-authoritative crafting and existing DB persistence.
- Preserve current tests unless a visible-copy expectation changes; then update the narrow test expectation.

## 6. Pasteable Cursor Prompt

```text
You are Cursor Composer working in /home/ryanh/development/async-frontier-mmo.

Read first:
- AGENTS.md
- .cursor/rules/learning-coach.mdc
- .cursor/skills/learning-coach/SKILL.md
- design-docs/HZD_WORKSHOP_FIRST_CURSOR_COMPOSER_PLAN.md
- design-docs/WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md
- design-docs/DECISION_LOG.md Decision 024

Implement the plan one phase at a time. Start with Phase 0, then Phase 1 only unless I explicitly approve continuing.

Working rules:
- Explain the next small change before editing.
- Keep the diff scoped to the phase.
- Prefer UI/copy-only changes before domain/schema changes.
- Use rtk for shell commands.
- Do not activate FIELD/RIG/SETTLEMENT.
- Do not add currencies.
- Do not reveal formula weights or label a best input.
- Do not simplify the existing two-pulse Experiment model.
- Do not add high-end starter resources.
- Do not do broad refactors.
- Do not commit unless I ask.

After each phase, run the listed rtk checks, summarize changed files, and stop for review.
```
