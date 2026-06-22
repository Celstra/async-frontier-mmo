---
title: feat: pivot thumper defense to command queue timeline
type: feat
date: 2026-06-21
---

# feat: pivot thumper defense to command queue timeline - Extensive

## Overview

Supersede the current recommendation-driven thumper defense UI with a committed
command queue and forecast timeline.

The current FIELD defense implementation proves the server can replay a seeded
defense run from a run seed and action log, apply wear on claim, and route
FIELD-earned resources back into WORKSHOP. It does not prove the thumping moment
is understandable or strategic.

The new production question is:

```text
Can a player plan a short thumper run by committing simple commands ahead of
time, reading a partial field forecast, and seeing clear cause/effect without a
recommendation engine?
```

This plan originally returned **WARN**, not PASS: the command-queue grammar was
promising, but greedy drilling and naive event matching were too strong under
the first numbers. Phase 0 tuning on 2026-06-21 now clears the starter 2-slot
gate. Medium/large queue depths remain future scope.

## Why This Pivot

Recent playtest notes exposed the failure mode:

- The FIELD defense UI reads as word buttons plus flashing words.
- The run still asks the player to parse too much while a timer is running.
- Recommendations turn the game into choosing the highlighted answer.
- Without recommendations, the verbs are too abstract to choose intentionally.
- Event-to-answer matching risks becoming the old prototype again: one prompt,
  one obvious response.

The next direction borrows one principle from Star Wars: Armada command dials:
commitment creates strategy. Armada has players stack ordered command dials,
preserve their order, and reveal the top dial later. The useful lesson is not
the exact rules, but the interaction pattern: plan ahead under uncertainty, then
live with the order you committed.

References:

- [Atomic Mass Games Armada rules page](https://www.atomicmassgames.com/swarmadadocs/)
- [Star Wars: Armada Rules Reference PDF](https://images-cdn.fantasyflightgames.com/filer_public/3a/13/3a13aa9c-7857-4b98-8a08-5ba9aaaedd89/swm_rules_reference_guide_150.pdf)

## Current Architecture Read

### What stays

- **WORKSHOP** owns project intent, material gaps, craft bench, result reveal,
  provenance, and install comparison.
- **FIELD** owns survey, sample, deploy, command-queue thumping, recall, claim,
  and remaining spot units.
- **RIG** owns loadout, repair, and inspection only.
- Resource stats remain fixed. Thumping changes quantity, loss, wear, recall,
  and component condition. It never changes named-resource quality.
- Server authority remains mandatory: claim result must derive from stored seed,
  queued commands, and replayable domain rules.

### What changes

- Retire `recommendedAction` from the FIELD thump surface.
- Replace immediate action buttons with a queue:

```text
starter/small thumper: 2 command slots
medium thumper:        3 command slots
large thumper:         4 command slots
```

- Implement only starter/small 2-slot play in the next slice. Medium/large queue
  depth stays modeled, but is not UI scope until the 2-slot version is fun.
- Move from real-time reading urgency to manual beat advancement for the
  prototype. The player fills the queue, presses to resolve the next beat, sees
  cause/effect, then fills the new back slot. Timer urgency can return only
  after comprehension passes.

### Workshop smoke test call

The old dedicated WORKSHOP smokes should be sorted by what they prove:

| Smoke type | Call |
|---|---|
| Craft bench, tuning, result reveal, provenance, install comparison | Keep |
| Project-led craft-ready state from FIELD-earned material | Keep and update |
| Supply crates, bench-stock renewal, workshop-only material faucet | Remove or rewrite |
| Tests assuming WORKSHOP is the start of the active funnel | Retire unless scoped to historical Decision 024 |

WORKSHOP still has a place, but not as the source of thumping material. In the
current direction, WORKSHOP answers "what am I trying to build?" and "what did
this material become?" FIELD answers "can I win the extraction?"

This is the working architecture for this slice, not a permanent 100% answer for
the eventual MMO.

## Player-Facing Model

### Beat loop

Use manual beats for the prototype:

```text
1. Before the run starts, fill the visible command queue.
2. Resolve the front command.
3. Resolve the field event.
4. Shift the queue left.
5. Fill only the new back slot.
6. Repeat until the run ends or the player recalls.
```

No hidden defaults:

- The first beat cannot start until the initial queue is full.
- A later beat cannot start until the new back slot is filled.
- Recall is immediate and never queued.

### Starter commands

Use one-word commands and numeric outcomes:

| Command | Compact read | Strategic read |
|---|---|---|
| `DRILL` | `Loose +3`, `Heat +2` | More material at risk, more heat |
| `BANK` | `Secure +Loose` | Protects current loose cargo, misses incoming cargo |
| `BRACE` | `Guard 2` | Blocks future damage/raid, wastes value if nothing hits |
| `VENT` | `Heat -3`, `Loose -1` | Buys safety, costs material/opportunity |

Use `Heat`, not `Pressure`, because `Heat +3` can be shown against a `0/10`
danger meter. Avoid abbreviations like `P +3`.

### Field events

Use one-word event tokens:

| Event | Compact read | Effect |
|---|---|---|
| `Cargo +N` | loose units arrive | Added after command resolution |
| `Hull -N` | hull damage | Can be blocked by guard |
| `Heat +N` | heat rises | Can trigger surge at the meter limit |
| `Raid -N` | loose cargo threatened | Can be blocked by guard; may spill to hull |
| `?` | bounded unknown | Scanner could not identify it yet |

Important timing rule:

```text
BANK before Cargo +3 banks current loose cargo only.
The +3 arrives loose after BANK resolves.
```

This single rule prevents "Cargo is coming, always Bank" from becoming the
obvious answer.

### Forecast rules

Scanner quality changes forecast precision, not yield:

- Poor scanner: more `?`, broad near-term hints.
- Basic scanner: reliable near-term event kind, partial severity.
- Good scanner: more precise kind and severity, still no recommendations.

No forecast can say "best move." It can only reveal event dimensions.

## Simulation Findings - 2026-06-21

Added:

```text
design-docs/thumper_command_queue_sim.py
```

Default command:

```bash
python3 design-docs/thumper_command_queue_sim.py
```

The sim models:

- queue lengths 2, 3, 4;
- commands `Drill`, `Bank`, `Brace`, `Vent`;
- events `Cargo`, `Hull`, `Heat`, `Raid`;
- command-before-event resolution;
- scanner forecast precision;
- random, greedy, event-matcher, cautious, planner, and oracle policies.

Initial default sample result:

| Gate | Result |
|---|---|
| 2-slot basic planner beats random | PASS: +5.3 score |
| 2-slot basic planner beats event matcher | PASS: +3.0 score |
| 2-slot good planner beats event matcher | PASS: +8.2 score |
| 2-slot poor planner beats event matcher | WARN: -0.3 score |
| Scanner readability gradient | PASS: poor `?` 41%, basic 22%, good 7% |
| Greedy drilling risk | WARN: greedy score +1.8 over planner, with worse hull and surges |

Interpretation:

- The command queue is worth pursuing as a shape.
- The first command math is not ready for product implementation.
- Larger queues are not ready. Poor scanner plus 4-slot event matching collapsed
  toward repeated `Drill` in the sim.
- The next slice must stay at 2 slots until the sim shows tradeoffs without
  recommendation support.

### Phase 0 tuning update - 2026-06-21

Tuning changes:

- fixed planner lookahead so newly chosen commands resolve after already queued
  commands, not too early;
- added repair-debt and repeated-sequence reporting;
- made `DRILL` hotter: `Loose +3`, `Heat +2`;
- made heat surges hurt: hull `-2`, loose cargo `-2`, heat resets to 5;
- made score include carry-forward repair debt.

Validated command:

```bash
python3 design-docs/thumper_command_queue_sim.py --runs 5000 --seed 20260621
```

5000-seed result:

| Gate | Result |
|---|---|
| 2-slot poor planner beats random | PASS: +4.9 score |
| 2-slot poor planner beats event matcher | PASS: +6.7 score |
| 2-slot basic planner beats random | PASS: +6.1 score |
| 2-slot basic planner beats event matcher | PASS: +5.0 score |
| 2-slot good planner beats random | PASS: +7.0 score |
| 2-slot good planner beats event matcher | PASS: +6.1 score |
| Starter top command concentration | PASS: planner `Bank` 42-45% |
| Starter top repeated sequence | PASS: 0.0% |
| Scanner readability gradient | PASS: poor `?` 41%, basic 22%, good 7% |
| Greedy drilling risk | PASS: greedy score -8.7 vs planner, debt 23.4 vs 7.8 |

Interpretation:

- The starter 2-slot queue is now clear enough to prototype in the domain layer.
- Greedy drilling still wins raw banked units, but loses hard on repair debt,
  hull condition, and heat surges.
- Naive event matching no longer beats planning at poor/basic/good scanner tiers.
- Larger queues still score worse with the starter scanner and should not ship in
  the first UI slice.

## Phase 0 - Simulation Gate

Goal: make the model fail or pass before UI work.

Status: **PASS for starter/small 2-slot queue as of 2026-06-21.**

Tasks:

- Tune command effects and event mix in `thumper_command_queue_sim.py`.
- Add sequence-diversity reporting, not only top-command reporting.
- Add wear/carry-forward penalty so greedy surplus has real future cost.
- Run at least 5,000 seeds for the final gate sample.
- Capture a short findings section in this plan or a follow-up decision note.

Pass gates:

- 2-slot planner/adaptive beats random by a clear margin.
- 2-slot planner/adaptive beats naive event matching for poor/basic/good scanners.
- Greedy can win surplus, but loses risk-adjusted score or produces visibly
  higher repair debt.
- No starter policy uses one command for more than 60% of choices.
- Top repeated sequence share stays below 5%.
- Poor scanner is worse than good scanner, but not pure random.
- Good scanner improves confidence without becoming a recommendation engine.

Exit: Ryan approves either "tune more" or "move to domain prototype." Current
recommendation: move to Phase 1 domain prototype, still scoped to 2-slot only.

## Phase 1 - Domain Prototype

Goal: replace immediate defense actions with deterministic command-queue replay
inside `packages/domain`.

Likely files:

- `packages/domain/src/thumper/thumperDefenseRun.ts`
- or a new sibling `packages/domain/src/thumper/thumperCommandQueueRun.ts`
- `packages/domain/src/thumper/thumperDefenseRun.test.ts`

Domain concepts:

- `CommandQueueRunConfig`
- `CommandQueueState`
- `QueuedCommand`
- `FieldEvent`
- `ForecastToken`
- `ScannerForecastProfile`
- `CommandQueueRunView`

Required tests:

- same seed + same queued commands = same result;
- command resolves before field event;
- `Bank` before `Cargo +3` does not secure the incoming cargo;
- only the newest back slot can be filled;
- elapsed beats cannot be edited;
- recall is immediate;
- scanner quality changes forecast reveal only, not true event deck or yield;
- 2-slot queue works independently from future 3/4-slot config.

## Phase 2 - Persistence And Server Actions

Goal: store future committed commands and beat progress transactionally.

Prefer an additive table over growing the current JSON action log:

```text
thumper_run_command_log
  id
  run_id
  beat_index
  command
  recorded_at
  resolved_at
```

The DB should enforce:

- one command per run/beat;
- no edits to resolved beats;
- only the current back slot can be filled;
- run row locked during command append and beat resolution;
- claim replays inside the claim transaction.

Server actions:

- deploy creates command-queue defense context;
- submit command fills the back slot only;
- advance beat resolves the next queued command and field event;
- recall ends the run immediately;
- claim replays from seed + command log + resolved beat count.

Keep the existing claim race fix: claim validation and replay must happen inside
the DB transaction.

## Phase 3 - FIELD UI Pivot

Goal: make the thumper readable without prose or recommendations.

Replace the current recommendation/action area in
`apps/web/src/lib/rig/ActiveRunPanel.svelte` with:

- compact meters: `Secured`, `Loose`, `Heat`, `Hull`;
- forecast timeline: `Now`, `Field`, `Later`;
- command queue slots with locked filled slots and one interactive back slot;
- command buttons with icon, one-word label, and numeric effect preview;
- compact beat log lines like `BANK +7 secured`, `CARGO +3 loose`,
  `HEAT +2`, `BRACE blocked 2`.

Do not include:

- "recommended";
- "best";
- long action descriptions;
- prompt-to-answer copy;
- buttons that sometimes do nothing without visible reason.

UI acceptance criteria:

- A player can tell which command fires next.
- A player can tell which slot they are currently choosing.
- A player can tell that `Bank` secures current loose cargo, not future cargo.
- A player can tell what `Heat +3` risks by looking at the meter.
- A player can recall at any time.
- The run never advances while the player is reading in the prototype.

## Phase 4 - WORKSHOP Integration

Goal: keep WORKSHOP as the reason and payoff for thumping.

Tasks:

- After claim, route FIELD-earned material back to the active project.
- Keep craftable-now state based on `thumper_run_result` inventory provenance.
- Update post-claim CTA to craft when enough material is secured.
- Keep provenance visible on crafted parts.
- Remove or rewrite old smoke coverage that assumes supply crates or bench stock
  are the active material source.

Workshop acceptance criteria:

- A player starts from a visible project need.
- FIELD thumping fills that need.
- WORKSHOP becomes actionable after claim.
- Craft result shows the named resource provenance.
- No test grants project material through a fake workshop-only faucet unless the
  test explicitly belongs to a historical/harness-only setup.

## Phase 5 - Telemetry And Smokes

Telemetry events:

- `thumper_command_queue_started`
- `thumper_command_queued`
- `thumper_beat_resolved`
- `thumper_run_recalled`
- `thumper_command_queue_completed`
- `thumper_command_queue_claimed`

Playtest evidence:

- Can the player explain what `Loose` and `Secured` mean?
- Can the player explain why `Bank` did or did not secure a cargo event?
- Does the player choose commands intentionally without recommendations?
- Does the player start a second run voluntarily?
- Does scanner improvement make them feel more informed, not instructed?
- Does WORKSHOP feel like the payoff after FIELD, not a disconnected screen?

Smoke tests:

- FIELD command queue renders no recommendation lane.
- Fill back slot, resolve beat, queue shifts.
- Recall then claim.
- Full FIELD claim enables WORKSHOP craft.
- Retired pressure-menu smokes are removed or replaced.

## Open Questions

1. Should manual beat advancement remain after the comprehension prototype, or
   should it become an optional timed mode?
2. Does `Heat` test clearly as the danger meter name, or does it need a rename?
3. Should `BRACE` say `Guard 2`, `Block 2`, or `Shield 2`?
4. What is the first acceptable run length: 8 beats, 12 beats, or 18 beats?
5. Do scanner upgrades reveal farther ahead, reveal severity, or reduce `?`?
   The sim currently tests all three together; product tuning should separate
   those knobs.

## Risks

- The queue can still become a script if command math is too clean.
- Larger queue depths can become spreadsheet play.
- Poor scanner can feel random if too many events are `?`.
- Good scanner can solve the game if it reveals too much.
- Manual beats reduce urgency; timed beats reduce comprehension.
- DB command logging is more complex than the existing current-tick action log.
- WORKSHOP tests may preserve obsolete bench-stock assumptions unless retired
  deliberately.

## Explicit Non-Goals

- No recommendation engine, even for tutorial.
- No realtime combat.
- No new resource quality mutation.
- No marketplace, factories, refining, group thumpers, or multiple thumper slots.
- No medium/large queue UI until the 2-slot version passes.
- No exact formula spreadsheet in player-facing copy.

## Rollout Decision

Phase 0 now passes for the starter 2-slot queue.

The next implementation should move to Phase 1 domain prototype before touching
`ActiveRunPanel.svelte`. Keep medium/large queue depth modeled but unshipped
until the 2-slot FIELD experience proves readable and fun.
