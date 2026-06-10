# Async Frontier MMO

Working-title home for the Farm RPG / Firefall / SWG-inspired async frontier MMO learning project.

## Contents

- `design-docs/` — four source-of-truth files (`DECISION_LOG.md`, `DESIGN_BIBLE.md`, `BUILD_PLAN.md`, `LAYERED_FEATURE_BACKLOG.md`) plus paper-test sims (`stage1_sim.py`, `bloom_variance_sim.py`, etc.). Retired pre-unification docs are in `design-docs/old_files/`.
- `docs/ASYNC_FRONTIER_MMO_LEARNING_PATH_V2.md` — current lesson path from Lesson 3.4 through production point.

## Current core toy

```text
Survey -> thump -> craft -> equip/use -> decay -> survey better
```

## Current design guardrail

Keep the first playable slice small. The public combat distress board is a later layer after the personal thumper loop works; helpers handle combat/threat verbs while the thumper owner keeps equipment-risk decisions.
