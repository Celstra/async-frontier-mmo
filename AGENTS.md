# Agent guide — Async Frontier MMO

Design-first learning project for a web/PWA async frontier MMO. **Not Godot.**

## Before you build

Read these when making architecture or gameplay decisions:

- `design-docs/TECH_STACK_AND_INFRA_COST_PLAN.md` — stack and infra
- `design-docs/DESIGN_BIBLE.md` — game design and economy
- `design-docs/MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md` — MVP scope and production-point gate

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
