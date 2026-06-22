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

## Rollout status (2026-06-22)

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Pure domain `thumperCommandQueueRun` + tests | **Done** |
| Phase 2 | Persistence, claim replay, command log | **Done** |
| Phase 3 | FIELD 2-slot (q2) UI + smoke play-to-claim | **Done** |
| Phase 3b | Medium 3-slot (q3) FIELD UI | **Done** (`f9c27aa`) |
| Phase 3c | Real medium deploy → FIELD → claim → WORKSHOP payoff | **In validation** (this slice) |
| Phase 4 | 4-slot / large queue | **Blocked** until q3 passes real-session playtest |

Medium q3 is allowed only as a gated playtest path: deploy requires a
**Reinforced Hull Plate** equipped (workshop payoff). Worn starter hull stays on
q2. Large/4-slot is not wired in deploy or UI.

## Source Of Truth

- Simulation: `design-docs/thumper_command_queue_sim.py`
- Rollout plan: `docs/plan/2026-06-21-feat-thumper-command-queue-pivot-plan.md`
- Domain queue: `packages/domain/src/thumper/thumperCommandQueueRun.ts`
- Deploy path: `packages/db/src/queries/projectLedFieldDeploy.ts`
- FIELD UI: `apps/web/src/lib/field/CommandQueuePanel.svelte`

## Real deploy path

Server-authoritative deploy for project-led command-queue runs:

```text
deployProjectLedCommandQueueRun()
  → deployThumperRunWithEventWindows()
  → insertThumperRun({ runMode: project_led_command_queue, commandQueueLength })
```

Callers must provide the run seed. Smoke helpers can pass a fixed smoke seed,
but the canonical deploy path must not silently default real runs to shared test
texture.

Queue length mapping (domain `commandQueueDeploy.ts`):

| Equipped hull | Frame tier | `command_queue_length` |
|---|---|---|
| Worn / starter parts | small | 2 |
| `reinforced_hull_plate` | medium (gated) | 3 |
| large | — | **blocked** |

Smoke and DB tests should prefer `seedCommandQueuePilotViaDeploy()` over direct
`insertThumperRun()` when proving deploy integration.

## Domain Constants

Use tuned Phase 0 values:

```text
STARTER_QUEUE_LENGTH = 2
MEDIUM_QUEUE_LENGTH = 3
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
queued command → field event → heat surge check → queue shift
```

Critical rule:

```text
Bank before Cargo +3 secures only current loose cargo.
The Cargo +3 arrives loose after Bank resolves.
```

## Validation

Run targeted validation:

```bash
pnpm check
pnpm --filter @async-frontier-mmo/domain test -- commandQueueDeploy thumperCommandQueueRun commandQueueLengthTuning
pnpm --filter @async-frontier-mmo/db test -- projectLedFieldDeploy thumperCommandQueue
DATABASE_URL=... pnpm --filter web test:e2e -- field-command-queue.smoke.spec.ts
```

Sim gate (unchanged):

```bash
python3 design-docs/thumper_command_queue_sim.py --runs 5000 --seed 20260621
```

## Stop Conditions

Stop and ask Ryan before:

- starting 4-slot UI or large deploy wiring;
- reintroducing recommendations or old defense word-button UI;
- adding timed beat pressure;
- tuning command math unless a test exposes a real bug.

## Done (this slice)

- `deployProjectLedCommandQueueRun` persists correct `command_queue_length` for small/medium.
- DB tests prove q2/q3 deploy, q3 claim replay, 4-slot blocked, workshop readiness after claim.
- FIELD smoke includes at least one medium run seeded via real deploy path.
- q2 smokes still pass with deploy-based seeding.

## Next For Composer

If medium q3 passes real deploy → FIELD play → claim → WORKSHOP payoff validation,
the next step is a **human q3 playtest/readability review**. 4-slot remains blocked
until q3 feels strategically different from q2 in an actual session.
