---
title: feat: thumper command queue composer implementation brief
type: feat
date: 2026-06-22
---

# feat: thumper command queue composer implementation brief

## Purpose

This is the implementation handoff for Composer/agent work on the thumper
command-queue pivot.

Use this brief with the rollout plan:

```text
docs/plan/2026-06-21-feat-thumper-command-queue-pivot-plan.md
```

The simulation gate has passed for the **starter/small 2-slot queue only**.
Do not implement medium/large queue UI or persistence yet.

## Source Of Truth

- Simulation: `design-docs/thumper_command_queue_sim.py`
- Rollout plan: `docs/plan/2026-06-21-feat-thumper-command-queue-pivot-plan.md`
- Existing domain seam: `packages/domain/src/thumper/thumperDefenseRun.ts`
- Existing defense tests: `packages/domain/src/thumper/thumperDefenseRun.test.ts`

## Phase 1 Scope

Implement a pure domain prototype only.

Create:

```text
packages/domain/src/thumper/thumperCommandQueueRun.ts
packages/domain/src/thumper/thumperCommandQueueRun.test.ts
```

Update only if needed:

```text
packages/domain/src/index.ts
```

Do not edit:

```text
apps/web/src/lib/rig/ActiveRunPanel.svelte
packages/db/src/queries/thumperDefenseRuns.ts
packages/db/src/schema/thumperRuns.ts
```

Those belong to later phases.

## Domain Constants

Use tuned Phase 0 values:

```text
STARTER_QUEUE_LENGTH = 2
RUN_BEATS = 18
STARTING_HULL = 55
STARTING_HEAT = 3
HEAT_LIMIT = 10
```

Commands:

| Command | Effect |
|---|---|
| `drill` | loose `+3`, heat `+2` |
| `bank` | secured `+= loose`, loose becomes `0` |
| `brace` | guard charges become `2`; overwriting active guard counts as waste |
| `vent` | heat `-3`, loose `-1` if available |

Events:

| Event | Effect |
|---|---|
| `cargo` | loose `+N` |
| `heat` | heat `+N` |
| `hull` | if guarded consume guard, else hull `-N` |
| `raid` | if guarded consume guard, else loose `-N`; spillover can damage hull |
| heat surge | when heat reaches `10+`, hull `-2`, loose `-2`, heat resets to `5` |

Resolution order:

```text
queued command -> field event -> heat surge check -> queue shift
```

Critical rule:

```text
Bank before Cargo +3 secures only current loose cargo.
The Cargo +3 arrives loose after Bank resolves.
```

## Suggested API

Use local naming if the existing domain style points somewhere better, but keep
these concepts explicit:

```ts
type ThumperCommand = 'drill' | 'bank' | 'brace' | 'vent';
type CommandQueueEventKind = 'cargo' | 'heat' | 'hull' | 'raid';
type ScannerForecastQuality = 'poor' | 'basic' | 'good';

type QueuedCommand = {
  beat: number;
  command: ThumperCommand;
};

type CommandQueueRunState = {
  currentBeat: number;
  totalBeats: number;
  queueLength: number;
  queue: ThumperCommand[];
  secured: number;
  loose: number;
  hull: number;
  heat: number;
  guard: number;
  lost: number;
  surgeCount: number;
  ended: boolean;
  recalled: boolean;
};
```

Suggested functions:

```text
createCommandQueueRunState
generateCommandQueueEvents
forecastCommandQueueEvents
queueCommand
canResolveNextBeat
resolveNextBeat
replayCommandQueueRun
resolveCommandQueueRunResult
```

Design preference:

- Make tests able to pass explicit event decks.
- Make seed-based event generation deterministic.
- Keep scanner forecasts deterministic for seed + beat + scanner quality.
- Keep the module pure: no DB, web, Svelte, or Date dependency unless passed in.

## Required Tests

Write tests first in:

```text
packages/domain/src/thumper/thumperCommandQueueRun.test.ts
```

Minimum tests:

1. Same seed and queued commands produce the same result.
2. Different seeds produce different event texture.
3. Starter run uses a 2-slot queue.
4. First beat cannot resolve until initial queue is full.
5. Later beat cannot resolve until the new back slot is filled.
6. Player can only fill the newest back slot.
7. Command resolves before field event.
8. `bank` before `cargo +3` does not secure incoming cargo.
9. `brace` blocks hull/raid events and consumes guard charges.
10. `vent` lowers heat and costs loose cargo when loose cargo exists.
11. Heat surge applies hull and loose-cargo loss, then resets heat.
12. `recall` ends immediately and is not queued.
13. Scanner quality changes forecast reveal, not the true event deck or yield.
14. 3/4-slot queue configs can exist in the domain, but starter config remains 2.

## Validation

Run targeted validation:

```bash
pnpm --filter @async-frontier-mmo/domain test -- thumperCommandQueueRun
pnpm --filter @async-frontier-mmo/domain check
```

Then run the sim gate again:

```bash
python3 design-docs/thumper_command_queue_sim.py --runs 5000 --seed 20260621
```

Do not run full web smokes for Phase 1 unless product code is touched.

## Stop Conditions

Stop and ask Ryan before moving past Phase 1 if any of these become necessary:

- adding DB tables or migrations;
- changing `ActiveRunPanel.svelte`;
- replacing existing `thumperDefenseRun.ts` in place;
- implementing medium/large UI behavior;
- reintroducing recommendations;
- adding timed beat pressure.

## Done

Phase 1 is done when:

- the new pure domain module exists;
- all required domain tests pass;
- the existing tuned sim still passes;
- the rollout plan remains accurate;
- no UI or DB behavior changes were slipped in.

