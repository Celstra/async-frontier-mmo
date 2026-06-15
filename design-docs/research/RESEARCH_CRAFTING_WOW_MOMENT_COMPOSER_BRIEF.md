# Crafting Wow Moment Research And Composer Brief

Status: ready for Composer implementation.

Date: 2026-06-15

Prompt source: Ryan playtest feedback after successfully crafting:

> Chose resources, allocated points, clicked experiment, and then clicked craft. Everything vanished all at once. It did craft an item, but I had no idea it did, I had no idea what experiments passed or failed, and I had no WOW this is cool moment.

Ryan AMA answers locked into this brief:

- Crafting should feel like the settlement moment when the final item was turned in and the fabricator came online.
- Do not auto-install thumper parts or modules.
- After crafting, the player should choose whether to equip/install the item.
- Before equipping, show what stats will change.
- Overdrive crit scrap should feel dramatic. The player accepted the risk.

## 1. Core Diagnosis

The crafting system is mechanically close to the intended SWG-inspired loop, but the UI does not make the result feel earned.

The domain already has:

- named-resource slot choice;
- weighted property preview;
- exactly 3 tuning points;
- two experiment pulses;
- Careful, Standard, and Overdrive push sizes;
- pulse outcomes such as success, wasted, band loss, and scrap;
- final explanation text;
- economy ledger consumption and item creation.

The current experience does not preserve the player's mental chain:

```text
resource hunt -> resource slot choice -> tuning bet -> experiment roll -> item identity -> next run impact
```

Instead, the screen refreshes into a small result panel, inventory updates, selected materials may disappear, and the bench feels cleared. That is the wrong emotional read for SWG-style crafting. A craft result should feel like the fabricator completing a prototype, not like a form submission.

## 2. Research Summary

### SWG principles worth preserving

External SWG references line up with the existing project direction:

- SWG schematics specified resource types and desired characteristics. Relevant resource stats, not every stat, determined how useful a resource was for a specific craft. Source: https://swg.fandom.com/wiki/Resource
- Resource characteristics were usually 1 to 1000, and higher values in schematic-relevant characteristics made that resource more valuable for that application. Source: https://swg.fandom.com/wiki/Resource
- Resources shifted over time, and despawned named resources did not return. Identical stacks of the same named resource stayed interchangeable, which made stockpiles and provenance matter. Source: https://swg.fandom.com/wiki/Resource
- Experimentation was visible as properties with point allocation. Spending more points increased risk and potential improvement; result tiers included successes and failures. Source: https://swg.fandom.com/wiki/Experimentation

The lesson is not to copy all SWG complexity. The lesson is to make the player see why this item exists, why these resources mattered, and what risk paid off or failed.

### Project decisions already support this

Locked local decisions already say the craft must show why the result happened:

```text
schematic -> fill slots -> preview -> spend exactly 3 tuning points
-> Safe Craft / Careful Experiment -> produce item -> show why result happened
```

Relevant local sources:

- `design-docs/DECISION_LOG.md`, Decision 007: MVP crafting interaction model.
- `design-docs/DECISION_LOG.md`, Decisions 009 and 010: resource quality sets ceiling, tuning expresses priorities.
- `design-docs/DECISION_LOG.md`, Decision 023 candidate: experimentation pulse model.
- `design-docs/DESIGN_BIBLE.md`, SWG research and MVP crafting loop.

### Simulation evidence

`rtk python3 design-docs/experimentation_sim.py` supports the current two-pulse model.

Default parameters:

```text
Careful:   +1 band, 90% success, 2% crit
Standard:  +2 bands, 65% success, 10% crit
Overdrive: +3 bands, 40% success, 25% crit, crit scraps material
```

Simulation verdict:

- Adjacent strategies have distinct outcome distributions.
- Careful/Careful cannot credibly reach top band from a mediocre assembly.
- Overdrive is the credible path to a top-band result from mediocre starting quality.
- Overdrive scrap overhead is about 30.1u against a 120u Reinforced Hull Plate recipe, or about 25%.

Conclusion: the balance model is not the immediate failure. The presentation is.

## 3. Current Implementation Diagnosis

Files checked:

- `packages/domain/src/crafting/experimentation.ts`
- `packages/domain/src/crafting/schematicEngine.ts`
- `packages/domain/src/crafting/buildCraftResultExplanation.ts`
- `packages/db/src/queries/crafting.ts`
- `apps/web/src/routes/workshop/+page.server.ts`
- `apps/web/src/lib/workshop/WorkshopBench.svelte`

Current behavior:

- Domain calculates `experimentPulseResults` and `experimentScrapUnits`.
- `buildCraftResultExplanation` compresses pulse results into one `modeContribution` text string.
- The workshop server action returns `{ craftOutcome: { status, item, explanation } }`.
- `WorkshopBench.svelte` shows a result panel only when `showResult && craftOutcome`.
- The result panel includes final item, summary, mode text, property scores, and top driver.
- Inputs changing hide the result.
- Inventory invalidation after craft can make consumed resources vanish from the bench immediately.

Failure mode:

- The player sees selected resources disappear before the craft result has emotional weight.
- Experiment results are text, not a visible sequence.
- Pulse-by-pulse pass/fail is not part of the main UI contract.
- The final item is not presented as a prototype card with provenance and next action.
- "Item crafted - equip it RIG" is too weak for the main reward beat.

## 4. Design Goal

After clicking Craft, the player must be able to answer five questions without opening inventory:

1. What did I make?
2. What did each experiment pulse do?
3. Which resource carried which property?
4. Was this item better, worse, flawed, or special?
5. What should I do next?

If the player cannot answer those, crafting still feels like "click, equip, done."

## 5. Composer Direction

The craft reveal should reuse the feeling of the fabricator coming online after the settlement turn-in:

- terminal/fabricator language;
- machine state changes;
- clear completion beat;
- visible output object;
- a sense that the settlement workshop physically produced something important.

Use that moment as the tone reference, not a generic inventory toast.

Do not build a marketing-style celebration. Keep it in-world, practical, and machine-like. The "wow" comes from the system making the player's choices visible.

## 6. Proposed UX: Craft Result Reveal

Replace the current inline result panel with a locked craft result reveal surface.

This can be a modal-like fabricator overlay or a full-width top-of-workshop result station. The important behavior is that it freezes the craft snapshot and does not clear itself until the player chooses a next action.

### Stage 0: Fabricator locks

Immediately after craft submit:

```text
FABRICATOR SEALED
Schematic: Survey Scanner Module Mk I
Resources loaded:
- Veyrith Copper, 30u, Conductive Metal
- Thornwake Crystal, 30u, Reactive Crystal
- Glimmerfall Shard, 30u, Reactive Crystal
```

Do not show resource cards as silently gone yet. Show them as "consumed into prototype."

### Stage 1: Assembly readout

Show resource fit before experiment results:

```text
ASSEMBLY READOUT
Survey Clarity: Strong base
Signal Focus: Solid base
Field Stability: Basic base
```

Callout:

```text
Veyrith Copper carried Survey Clarity through Conductivity.
Thornwake Crystal lifted Signal Focus but capped Field Stability.
```

### Stage 2: Tuning readout

Show the player's 3 tuning points as intentional priorities:

```text
TUNING APPLIED
Survey Clarity +2 points
Signal Focus +1 point
Field Stability +0 points
```

This reinforces that tuning expresses the chosen resource's potential. It does not upgrade the resource.

### Stage 3: Experiment pulses

Render each pulse as a visible roll with a status badge, not as a paragraph.

Example:

```text
PULSE 1 - STANDARD PUSH
Line: Survey Clarity
Result: Strong -> Excellent
Status: SUCCESS

PULSE 2 - OVERDRIVE PUSH
Line: Signal Focus
Result: Solid -> Solid
Status: CRIT SCRAP
Material loss: 30u consumed from largest socket
```

Each row should show:

- pulse index;
- property display name;
- push size;
- probability text from the selected push;
- band before;
- band after;
- outcome label;
- scrap units, if any.

Outcome labels:

```text
SUCCESS
WASTED
CRIT: BAND LOST
CRIT: MATERIAL SCRAPPED
```

### Stage 4: Dramatic overdrive crit scrap

Overdrive crit scrap should not be softened into bland copy. The player accepted the risk.

If Overdrive crit scrap occurs:

- pulse row gets warning styling;
- fabricator log shows a distinct alarm line;
- material loss is named in units;
- final item still appears if the domain produced it;
- result card marks the item as a mixed or scarred prototype if applicable.

Example copy:

```text
OVERDRIVE BACKLASH
The fabricator burned through 30u extra material stabilizing the prototype.
Signal Focus did not improve.
```

If an item also gained a strong result from another pulse, preserve both emotions:

```text
Pulse 1 landed clean: Survey Clarity reached Excellent.
Pulse 2 overdrifted: 30u material loss, no gain.
Prototype complete.
```

### Stage 5: Final prototype card

Show the final item as the reward object:

```text
SURVEY SCANNER MODULE MK I
Prototype complete

Condition 100
Integrity 100

Survey Clarity: 91 - Excellent
Signal Focus: 62 - Solid
Field Stability: 48 - Basic

Made from:
Veyrith Copper, Thornwake Crystal, Glimmerfall Shard
```

Add stronger result callouts:

- "New best scanner" if better than equipped scanner.
- "Exceptional line" if any property hits Exceptional.
- "Minor flaw" if band loss or scrap occurred.
- "Rare resource spent" if the consumed resource was scarce or high-quality.

### Stage 6: Equip decision, not auto-install

Do not auto-install thumper parts or modules.

The result reveal should offer a clear equip/install path, but the player must choose. If the crafted item is installable, the button should lead to an equip comparison state:

```text
[Compare for RIG]
[Craft another]
[View inventory]
```

The comparison state must show the currently installed part/module, the newly crafted item, and the stat changes before the player confirms:

```text
RIG INSTALL PREVIEW
Hull slot

Current: Scavenged Hull Plate
New: Reinforced Hull Plate

Condition ceiling: 30 -> 100
Integrity: 30 -> 96
Threat resistance: Basic -> Strong
Run safety: Low -> High

[Install Reinforced Hull Plate]
[Keep current]
```

For modules, use the same rule: preview the before/after effect first, then require an explicit equip/install click.

## 7. Result Copy Direction

Copy should sound like the settlement fabricator terminal, not a tutorial paragraph.

Use:

```text
Prototype complete.
Veyrith Copper carried the clarity line.
Pulse 1 landed clean: Strong -> Excellent.
Pulse 2 wasted: no change.
Compare it at the RIG before the next run.
```

Use for overdrive:

```text
OVERDRIVE BACKLASH
30u material loss.
No gain on Signal Focus.
Prototype stabilized.
```

Avoid:

```text
Item crafted - equip it RIG.
Experimentation resolved.
Craft mode applied final variance.
```

Those are technically true but emotionally flat.

## 8. FIELD Return Behavior Note

Ryan's related FIELD complaint is valid:

If the player returns to FIELD after a rig deployment and has not switched resources, they should land back on the active known spot or active resource context. A generic map with blocked sampling reads like the game forgot what they were doing.

Recommendation:

- Preserve the last active field target as the main state: resource instance, family, known sampled waypoint, and current target coordinates.
- If the same resource instance is still active and the waypoint is not exhausted, return to that target view.
- The map can remain visible only as context around the active target.
- If sampling is blocked because the family scan gate is missing, do not show a naked map. Show a pinned target state with one primary recovery action:

```text
Known Glimmerfall waypoint.
Scan Reactive Crystal to refresh field lock and resume sampling here.
```

Implementation rule: returning to FIELD should answer "where was I?" before it asks "what do you want to scan?"

## 9. Implementation Plan For Composer

### Step 1: Expose full craft outcome

Extend the server/UI craft outcome shape to include:

```ts
experimentPulseResults
experimentScrapUnits
slotFillsSnapshot
tuningSnapshot
craftMode
resourceProvenance
comparisonTarget
```

Candidate source:

- `CraftResultExplanation` in `packages/domain/src/crafting/buildCraftResultExplanation.ts`
- `CraftResolution` from `packages/domain/src/crafting/types.ts`
- workshop action in `apps/web/src/routes/workshop/+page.server.ts`

The result needs a snapshot because inventory refresh after craft is correct, but it should not erase the story of the consumed inputs.

### Step 2: Add `CraftResultReveal.svelte`

Create a dedicated component:

```text
apps/web/src/lib/workshop/CraftResultReveal.svelte
```

Props:

```ts
craftOutcome
schematic
onCraftAnother
onCompareInstall
```

Responsibilities:

- render fabricator sealed summary;
- render consumed resources snapshot;
- render tuning allocation;
- render experiment pulse rows;
- render overdrive crit scrap alarm state;
- render final item card;
- render next actions.

Keep the existing property result cards, but move them into the reveal sequence.

### Step 3: Freeze result state

In `WorkshopBench.svelte`:

- keep a `lastCraftSnapshot` client state captured before submit;
- after successful action, show `CraftResultReveal`;
- do not hide it because inventory changed;
- do not clear slot/tuning selections until player chooses `Craft another`;
- make `Craft another` the explicit reset boundary.

The result reveal should be the first focus target after submit.

### Step 4: Add equip comparison, not auto-install

If the crafted item maps to a thumper part or module slot:

- show "Compare for RIG" or equivalent;
- compare against currently equipped item if one exists;
- show "better on X, worse on Y" in plain terms;
- show exact slot affected;
- require an explicit install/equip button;
- if no equipped item exists, show "empty slot" or "first install for this slot."

Do not auto-install after craft. Do not auto-install after comparison. The player must confirm.

### Step 5: Add RIG install preview state

The RIG/workshop install state should show:

- current installed item;
- candidate crafted item;
- property deltas;
- expected run/sampling effect if already modeled;
- install button;
- cancel/keep-current button.

This is the place to teach that gear choice changes the next run.

### Step 6: Telemetry

Add playtest events:

```text
craft_result_reveal_seen
craft_result_pulse_viewed
craft_result_compare_clicked
craft_result_install_confirmed
craft_result_craft_another_clicked
craft_result_abandoned
overdrive_crit_scrap_seen
```

This tells us whether the result surface fixes comprehension or just adds a screen.

### Step 7: Tests

Minimum tests:

- Domain test: `CraftResultExplanation` includes pulse result details for experiment craft.
- Server action test or page smoke: craft response includes pulse results and resource snapshot.
- Svelte/UI smoke: after craft, text for `Pulse 1`, outcome label, item name, and at least one consumed resource is visible.
- Regression: after craft, inventory can refresh, but the result reveal still shows the consumed resources.
- UI smoke: installable crafted item shows comparison before install.
- UI smoke: no auto-install occurs after craft result reveal.
- UI smoke or unit test: overdrive crit scrap shows material loss and warning copy.

## 10. Acceptance Criteria

Crafting is fixed when:

- A player never says "everything vanished" after clicking craft.
- The result reveal names the item and consumed resources.
- Experiment mode shows both pulse outcomes.
- Overdrive crit scrap is visible, dramatic, and specific about material loss.
- At least one line explains which resource drove a final property.
- The player has an obvious next action: compare for RIG, craft another, view inventory, or return to field.
- Install/equip is never automatic.
- Before install/equip, the player sees the stat changes.
- A great result has a recognizable payoff moment.
- A bad or mixed result still feels legible, not broken.

## 11. Composer Build Order

Recommended implementation order:

1. Expand the craft outcome payload with pulse results and craft snapshot.
2. Build `CraftResultReveal.svelte` using real craft outcome data.
3. Freeze result state so consumed resources remain visible in the reveal.
4. Add overdrive crit scrap warning treatment.
5. Add compare-for-RIG path without auto-install.
6. Add telemetry.
7. Add smoke tests around craft reveal, overdrive scrap, and no auto-install.

No further AMA questions are blocking implementation.

