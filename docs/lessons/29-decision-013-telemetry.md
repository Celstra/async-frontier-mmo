# Lesson 29 — Decision 013 playtest telemetry

> **Phase 8 / Lesson 8.1** — Instrument the MVP slice so a local playtest produces auditable evidence: first-session funnel completion, crafting comprehension signals, and post-test answers. Not growth analytics.

**Prerequisite:** Lessons 17–23 (full first-session loop playable).

**Out of scope:** Third-party analytics, dashboards, retention funnels, cross-pilot tracking beyond the session pilot id.

**Learning goal:** Understand **evidence vs over-instrumentation** — each event name answers one review question from Decision 013, stored server-side in Postgres for the pilot only.

---

## 1. Why telemetry is separate from the economy ledger

Decision 012's `economy_ledger` answers ownership truth:

```text
Where did this copper come from? What craft consumed it?
```

Decision 013's `playtest_events` answers comprehension and behavior:

```text
Did the tester reach craft? Did they compare resources? Can they explain tuning?
```

Never mix them. Telemetry can be wrong or incomplete without breaking economy trust.

---

## 2. First-session funnel — what each event gates

Prototype target (Decision 013):

> A new tester should reach the second survey without outside explanation.

| Event | Gate it answers | When we record it |
|-------|-----------------|-------------------|
| `frame_chosen` | Onboarding entry — did they pick a frame? | `chooseFrame` action |
| `first_survey_started` | Did they begin prospecting? | First successful family scan |
| `first_survey_completed` | Did the first scan finish? | Same action (scan is one step today) |
| `signal_compared` | Did they see multiple resources to compare? | Family scan with ≥2 resources |
| `veyrith_copper_recommended` | Was the tutorial recommendation shown? | Scan while bloom #1 tutorial recommends Veyrith |
| `target_signal_selected` | Did they commit to a deposit target? | Deploy screen load (resource + spot) |
| `thumper_deployed` | Did the thumper loop start? | Successful deploy action |
| `event_window_1_resolved` | Event-action readability (window 1) | Response recorded for DB `window_index = 1` |
| `event_window_2_resolved` | Event-action readability (window 2) | Response recorded for DB `window_index = 2` |
| `thumper_claimed` | Did they finish extraction? | Successful claim action |
| `resource_claimed` | Did named resource land in inventory? | Claim when quantity granted |
| `schematic_opened` | Did they reach thinking-craft? | First `/craft` load |
| `resource_slots_filled` | Did they engage slot allocation? | Successful craft (all slots required) or craft preview with all slots in URL |
| `tuning_points_spent` | Did they commit tuning? | Successful craft |
| `craft_mode_chosen` | Safe vs Experiment choice | Successful craft |
| `item_crafted` | Core craft loop proof | Successful craft |
| `item_equipped` | Did gear feed back into survey? | Equip scanner or thumper part |
| `second_survey_completed` | Voluntary repeat / loop closure | Second family **scan action** (same family rescan counts) |

Funnel events use **once per pilot** (`recordPlaytestEventOnce`) so the checklist is a set, not a spam log.

---

## 3. Comprehension signals — what each event gates

Key question (Decision 013):

> Did the player understand that Veyrith Copper was good because of its stats and schematic fit, not because the tutorial magically said so?

| Event | Gate it answers |
|-------|-----------------|
| `resource_stats_inspected` | Looked at revealed stats (sample stat reveal) |
| `two_resources_compared` | Saw allocation comparison table (≥2 resources) |
| `slot_selection_changed` | Changed a schematic slot from the default |
| `tuning_allocation_changed` | Moved tuning off the suggested allocation |
| `repair_previewed` | Craft screen showed repairable gear while kits owned |
| `spots_sampled_before_deploy` | Sampled at least one deposit spot before deploy |
| `extraction_tail_chosen` | Picked a non-default extraction tail |
| `first_stat_reveal_viewed` | First time stats revealed on sample |

Comprehension events **may repeat** (`recordPlaytestEvent`) — they measure depth, not a checklist.

---

## 4. Post-test comprehension (manual)

The four locked questions live in `docs/playtests/post-test-comprehension-template.md`. Copy that file per session; fill answers after the tester finishes unaided.

Success signal:

```text
Player can explain: resource stats → schematic weights → property preview → tuning expression.
```

Failure signal:

```text
"I just clicked the highlighted thing."
```

---

## 5. Schema (minimal)

```sql
playtest_events (
  id uuid,
  pilot_id text → pilots.id,
  event_name text,   -- exact Decision 013 vocabulary
  payload jsonb,     -- compact context only
  created_at timestamptz
)
```

Migration: `packages/db/drizzle/0022_playtest_events.sql`

Vocabulary source of truth: `packages/db/src/playtest/eventNames.ts`

---

## 6. Code map

| Layer | File | Role |
|-------|------|------|
| DB schema | `packages/db/src/schema/playtestEvents.ts` | Table definition |
| DB queries | `packages/db/src/queries/playtestTelemetry.ts` | `recordPlaytestEvent`, `recordPlaytestEventOnce`, `listPlaytestEventsForPilot` |
| Web wiring | `apps/web/src/lib/server/playtestTelemetry.ts` | `track*` helpers called from server actions |
| Server routes | `+page.server.ts` on `/`, `/survey`, `/deploy`, `/run`, `/claim`, `/craft` | Emit at the moment the gate passes |

---

## 7. Read evidence after a playtest

Apply migration if needed:

```bash
pnpm --filter @async-frontier-mmo/db migrate
```

Query funnel for a pilot (psql or any SQL client):

```sql
SELECT event_name, payload, created_at
FROM playtest_events
WHERE pilot_id = 'your-pilot-id'
ORDER BY created_at;
```

Or from TypeScript:

```typescript
import { createDb, listPlaytestEventsForPilot } from '@async-frontier-mmo/db';

const events = await listPlaytestEventsForPilot(db, pilotId);
```

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/db migrate
pnpm check
pnpm --filter @async-frontier-mmo/db test playtestTelemetry
pnpm --filter web build
```

Walk the first-session loop once; confirm funnel rows appear in `playtest_events` for your pilot id.

Commit message: `feat: decision 013 playtest telemetry`

---

## 9. Recap

**Learned:** Decision 013 measurement is local, server-side, and vocabulary-locked — each event answers one review question without touching economy truth.

**Files touched:** `playtest_events` schema + migration, `playtestTelemetry` queries, `playtestTelemetry.ts` web helpers, server route hooks, `docs/playtests/` template.

**Next exercise:** Lesson 8.2 — Production Point review package (`docs/production-point/README.md`): compare implementation to Decisions 001–021 and ask whether mediocre-bloom sessions still feel worth playing.
