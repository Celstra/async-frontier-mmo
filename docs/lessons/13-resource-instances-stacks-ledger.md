# Lesson 13 — Resource instances, stacks, and economy ledger

> **Exercise:** Persist the economy's audit spine — immutable resource instances in bloom #1, pilot-owned stacks that combine by instance, and an append-only ledger that records every grant — without marketplace, trade, refining, or the bloom generator.

**Prerequisite:** Lessons 05–12 complete (domain resource catalog, thumper claim path, recall early).

**Out of scope:** Bloom generator (Lesson 6.4), claim → grant wiring (Lesson 14), crafting consumption, items, marketplace, player trade, factories, batch crafting.

**Learning goal:** Understand **instance vs stack vs ledger**, and why **immutable stats + provenance** are the trust foundation for every future economy feature.

---

## 1. Instance vs stack vs ledger

Three layers answer three different questions:

| Layer | Question it answers | Mutable? |
|-------|---------------------|----------|
| **Resource instance** | What named resources exist in the current bloom, with what stats, concentration range, and lifespan? | Stats **never** after insert; only `extinct_at` may change |
| **Resource stack** | How much of *this exact instance* does *this pilot* own right now? | `quantity` changes on grant/consume |
| **Economy ledger** | *Why* did that quantity change — what action caused it? | **Append-only** — no updates or deletes |

```text
bloom #1 spawns "Veyrith Copper" instance (stats frozen at spawn)
        ↓
pilot claims thumper → grant 35 units → stack row (pilot + instance) quantity += 35
        ↓
ledger row: event_type = resource_granted, source = thumper_run_result, quantity_delta = 35
```

**Instance** is world truth: "this Veyrith Copper in bloom #1 has Conductivity 930."

**Stack** is ownership truth: "demo-pilot holds 35 units of that instance."

**Ledger** is audit truth: "those 35 came from claim X at time T."

Domain constants in `packages/domain` remain the **design catalog**. DB `resource_instances` rows are **spawned copies** — required because Decision 018/020 means future blooms generate new names and lifetimes at runtime.

---

## 2. Why immutability + provenance matter

Decisions 005, 009, and 012 lock this together:

1. **Crafting trust** — If the same stack could silently change Conductivity, tuning and recipe previews become meaningless. Stats are fixed at spawn; only quantity moves.
2. **Audit trust** — "Where did this copper come from?" must be answerable after a dispute, a duplicate-click bug, or a playtest review. The ledger is the explanation chain.
3. **Extinct resource value** — When an instance goes extinct (`extinct_at` set), stacks keep their provenance. Items crafted from that instance still cite the dead spawn — SWG-style scarcity memory.
4. **Idempotency prep** — Lesson 14 will grant on claim inside a transaction. Ledger rows keyed by `source_id` make double-claims detectable.

Immutability is enforced in the **query layer**, not only by convention:

```typescript
updateResourceInstance(db, id, { statConductivity: 1 })
// → throws ResourceInstanceStatsImmutableError

updateResourceInstance(db, id, { extinctAt: new Date() })
// → allowed — lifecycle only
```

---

## 3. Schema (Decision 012)

### `resource_instances`

| Column | Purpose |
|--------|---------|
| `resource_slug` | Stable id (`veyrith_copper`) — unique per bloom |
| `display_name` | Unique player-facing name |
| `family` | `conductive_metal` \| `structural_alloy` \| `reactive_crystal` |
| `stat_*` | Five locked stats (1–1000 scale) |
| `bloom_id` | `1` for the seeded first bloom |
| `concentration_min/max_percent` | Rolled range hint (Decision 021-C) |
| `lifespan_days` | Hidden lifespan roll (Decision 020) |
| `spawned_at` / `extinct_at` | Spawn and extinction markers |

Unique indexes: `(bloom_id, resource_slug)` and `display_name`.

### `resource_stacks`

| Column | Purpose |
|--------|---------|
| `pilot_id` | Owner |
| `resource_instance_id` | Which spawn |
| `quantity` | Current units |

Unique index: `(pilot_id, resource_instance_id)` — **stacks combine** (Decision 012).

### `economy_ledger`

Append-only rows with `event_type`, optional `pilot_id`, `resource_instance_id`, `resource_stack_id`, `quantity_delta`, and JSON `payload` for source references.

Locked event types (Decision 012):

```text
survey_completed · thumper_deployed · thumper_claimed · resource_granted ·
resource_consumed · item_crafted · item_equipped · item_condition_changed ·
repair_kit_consumed · item_repaired
```

This lesson implements **`resource_granted`** via `grantResourceToPilot`. Other types arrive in later lessons.

---

## 4. Bloom #1 seed (nine resources)

Decision 006 as amended by Decision 021 — three resources per family:

| Resource | Family | Concentration | Lifespan (seed roll) |
|----------|--------|---------------|----------------------|
| Keth Iron | SA | 55–95% | 8 days |
| Red Mesa Conductive Slag | CM | 50–90% | 7 |
| Asterion Frame Alloy | SA | 25–55% | 5 |
| Pale Ember Crystal | RC | 30–65% | 6 |
| Veyrith Copper | CM | 20–50% | 4 |
| Thornwake Crystal | RC | 25–55% | 5 |
| **Sorrel Vein Copper** | CM | 40–75% | 6 |
| **Bendrel Ridge Alloy** | SA | 35–70% | 7 |
| **Glimmerfall Shard** | RC | 45–80% | 9 |

Seed data lives in `packages/db/src/seed/bloomOneSeed.ts`. `ensureBloomOneResourceInstances()` inserts idempotently — safe to call on every app boot.

Lifespan values are **frozen seed rolls** in the 3–9 day band. The random bloom generator (Lesson 6.4) will roll new values for future blooms; bloom #1 stays fixed for Decision 011 tutorial reproducibility.

---

## 5. Grant flow (transactional)

```typescript
grantResourceToPilot(db, {
  pilotId,
  resourceInstanceId,
  quantity: 12,
  source: { type: 'thumper_run_result', id: resultId }
})
```

Inside one transaction:

1. `INSERT … ON CONFLICT (pilot_id, resource_instance_id) DO UPDATE` — add to existing stack or create new row.
2. `INSERT` into `economy_ledger` with `event_type: 'resource_granted'`.

No delete helpers are exported for the ledger — append-only by API design.

---

## 6. Files touched

| Path | Role |
|------|------|
| `packages/db/src/schema/resourceInstances.ts` | Instance table |
| `packages/db/src/schema/resourceStacks.ts` | Stack table |
| `packages/db/src/schema/economyLedger.ts` | Ledger table |
| `packages/db/src/seed/bloomOneSeed.ts` | Nine locked resources |
| `packages/db/src/queries/resourceInstances.ts` | Insert, lifecycle update, seed |
| `packages/db/src/queries/resourceGrants.ts` | `grantResourceToPilot` |
| `packages/db/src/queries/economyLedger.ts` | `appendEconomyLedgerEntry` |
| `packages/db/src/economy/eventTypes.ts` | Locked event type union |
| `packages/db/drizzle/0009_resource_economy.sql` | Migration |

---

## 7. TDD / integrity checklist

| Test | Proves |
|------|--------|
| Stat update rejected | `ResourceInstanceStatsImmutableError` — query layer blocks mutation |
| Two grants combine | One stack row; `quantity` sums |
| Every grant → ledger | `resource_granted` row with matching `quantity_delta` |
| Bloom seed | Nine instances; concentration + lifespan columns populated |

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter @async-frontier-mmo/db test
pnpm --filter @async-frontier-mmo/db db:smoke
```

---

## Recap checklist

- [x] `resource_instances` with immutable stats, bloom markers, concentration range, lifespan
- [x] Bloom #1 seeded with nine locked resources (006 + 021)
- [x] `resource_stacks` keyed by `pilot_id + resource_instance_id`
- [x] `economy_ledger` append-only with Decision 012 event types
- [x] `grantResourceToPilot` combines stacks and writes ledger in one transaction
- [x] Query-layer immutability guard + integration tests

**Next exercise:** Wire thumper claim to `grantResourceToPilot` using `resource_instance_id` from the run's target signal, with idempotent ledger rows (Lesson 14 — transactional claim reward).
