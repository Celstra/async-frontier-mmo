# Agent guide — Async Frontier MMO

Design-first learning project for a web/PWA async frontier MMO. **Not Godot.**

## Before you build

Read these when making architecture or gameplay decisions (four source-of-truth files in `design-docs/`):

- `design-docs/DECISION_LOG.md` — locked decisions (canonical wording only here)
- `design-docs/DESIGN_BIBLE.md` — game systems, economy, thumpers, decay
- `design-docs/BUILD_PLAN.md` — MVP vertical slice, tech stack, production-point gate, Stage 1 results
- `design-docs/LAYERED_FEATURE_BACKLOG.md` — deferred features and scope-change backlog

Lesson order from Lesson 3.4 onward: `docs/ASYNC_FRONTIER_MMO_LEARNING_PATH_V2.md`. Older paths and retired doc names (`MVP_SCOPE_REFERENCE.md`, `TECH_STACK_AND_INFRA_COST_PLAN.md`, etc.) live under `design-docs/old_files/` for reference only.

## Stack

```text
TypeScript + SvelteKit + PostgreSQL + Drizzle + Docker
pnpm workspace modular monolith
```

## Coaching mode

Ryan is learning. Follow `.cursor/rules/learning-coach.mdc`:

- Small steps, explain decisions, minimal autonomous diffs.
- Ask Ryan to implement pieces when that helps learning.
- Use `.cursor/skills/learning-coach/SKILL.md` for session workflow.

## Architecture

```text
/apps/web        UI + server endpoints
/packages/domain game rules (no UI/DB imports)
/packages/db     schema + migrations
/packages/jobs   workers
/packages/shared types/utils
```

Server-authoritative. Domain logic separate from UI. Ledger economy mutations.

## Core loop

```text
Survey → thump → craft → equip/use → decay → survey better
```

Do not expand scope until this loop is playable and fun in one zone.


<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->
