# Async Frontier MMO — MVP Final Review Package

Final review pass completed: 2026-06-09.

The root of this package contains the documents needed to design and implement around the locked MVP. Research and legacy/context documents have been moved out of the root so they do not read like current MVP scope.

## Source of truth

Use these in order:

1. `MVP_SCOPE_REFERENCE.md` — fastest locked-scope reference for design/build discussions.
2. `DESIGN_BIBLE.md` — canonical design source.
3. `DECISION_LOG.md` — locked decision history and change-control record.
4. `MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md` — build/test ladder for the MVP slice.
5. `TECH_STACK_AND_INFRA_COST_PLAN.md` — implementation and cost-shaping plan.
6. `LAYERED_FEATURE_BACKLOG.md` — parking lot / post-MVP candidate layer list.

## Folder structure

```text
/
  README.md
  MVP_SCOPE_REFERENCE.md
  DESIGN_BIBLE.md
  DECISION_LOG.md
  MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md
  TECH_STACK_AND_INFRA_COST_PLAN.md
  LAYERED_FEATURE_BACKLOG.md
  FINAL_REVIEW_NOTES.md
  /research
    RESEARCH_DURABILITY_AND_FRAME_MODULES.md
    RESEARCH_FIREFALL_FAILURE_AND_THUMPER_COMPONENTS.md
    RESEARCH_FIREFALL_GROUP_VS_PERSONAL_THUMPERS.md
    RESEARCH_SWG_CRAFTING_REPAIR_ACTIVE_EVENTS.md
    RESEARCH_SWG_RESOURCE_CRAFTING_FEEDBACK.md
  /legacy
    PLAYER_FACING_ROADMAP_LEGACY_ALIAS.md
```

## Final MVP rule

Decisions 001–014 define the MVP content. Decision 015 freezes scope and defines MVP completion/change control. Any new idea that does not satisfy the scope-change rule belongs in `LAYERED_FEATURE_BACKLOG.md`, not the MVP.

## Review result

The documents are now organized so the MVP build docs are at the root. Research docs are preserved with review notes and corrected where older candidate wording conflicted with the locked MVP. The old `PLAYER_FACING_ROADMAP.md` duplicate has been moved to `legacy/PLAYER_FACING_ROADMAP_LEGACY_ALIAS.md` because it is now an internal backlog alias, not a player-facing promise document.
