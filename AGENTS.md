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
