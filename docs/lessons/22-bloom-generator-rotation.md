# Lesson 22 — Seeded random bloom generator and manual rotation

> **Phase 6 / Lesson 6.4** — Decision 018 bloom variance: family caps, deterministic generator, extinction + provenance, manual rotation (no scheduler).

**Prerequisite:** Lessons 13 (resource instances/stacks/ledger), 21 (loop closure).

**Out of scope:** Timed 7-day scheduler, jobs, per-resource lifespan expiry, prospecting/sampling (Lesson 6.5).

**Learning goal:** Understand why SWG-style scarcity comes from **extinction + caps + randomness**, and why the **roll distribution** is a tuning knob separate from the generator code.

---

## 1. Why scarcity is three knobs, not one

| Knob | What it does | MVP implementation |
|------|----------------|-------------------|
| **Family stat caps** | Defines the legal range per stat per family | `FAMILY_STAT_CAPS` in domain data |
| **Random rolls** | Each spawn draws stats uniformly inside caps | `generateBloom(seed)` — distribution shape is data |
| **Extinction** | Despawned resources never return; stacks keep provenance | `extinct_at` on instances + manual rotate |

Caps prevent impossible stats. Randomness makes great fits rare. Extinction makes stockpiling rational — "this Veyrith-tier copper might not exist next bloom."

**Distribution shape** (uniform today, skew-low later) changes how often exciting blooms appear **without** rewriting the generator. That is why Monte Carlo lives in `design-docs/bloom_variance_sim.py`, not in TypeScript branches.

---

## 2. Pure generator (domain)

```text
seed string
  → createSeededRng(seed)
  → 9 resources (3 × conductive_metal, 3 × structural_alloy, 3 × reactive_crystal)
  → each: unique display name, stats, concentration range, lifespan_days (3–9)
```

| File | Role |
|------|------|
| `packages/domain/src/resources/familyStatCaps.ts` | Prototype caps (BUILD_PLAN Part C) |
| `packages/domain/src/resources/bloomGenerator.ts` | `generateBloom` |
| `packages/domain/src/survey/activeBloomSurvey.ts` | Survey from spawnable DB rows |
| `packages/domain/src/crafting/liveSchematicStatWeights.ts` | Decision 018 §6 de-emphasis |

Bloom **#1** stays the locked Decision 006/021 seed (`bloomOneSeed.ts`). Tutorial survey (`surveyRedMesaFirstSession`) runs until the first tutorial thumper is claimed on bloom #1.

---

## 3. Persistence and rotation (db)

| Table / column | Role |
|----------------|------|
| `blooms` | `id`, `generation_seed`, `rotated_at` |
| `resource_instances.extinct_at` | Lifecycle-only mutation (Decision 012) |
| Ledger `bloom_rotated` | Audit trail for manual rotation |

`rotateActiveBloom`:

1. Mark all spawnable instances in the active bloom `extinct_at = now`
2. Insert next `blooms` row + 9 new instances from `generateBloom`
3. Append `bloom_rotated` ledger entry

**Untouched:** `resource_stacks`, crafted `items.provenance`, ledger history.

---

## 4. Survey + UI rules

- **Tutorial mode:** bloom #1 + tutorial incomplete → Decision 011 three-signal script.
- **Active bloom mode:** `listSpawnableResourceInstances` → `buildActiveBloomSurvey`.
- **Dev only:** `?/rotateBloom` action (SvelteKit `dev` guard).
- **Decision 018 §6:** stats with zero weight in every live schematic render de-emphasized (`.stat-deemphasized` in survey; list echoed in craft workshop).

---

## 5. TDD checklist

| Test | File | Proves |
|------|------|--------|
| Same seed → same bloom; different seeds differ | `bloomGenerator.test.ts` | Deterministic generator |
| Rolled stats within caps; bloom #1 validates | `bloomGenerator.test.ts` | Caps are enforced |
| Extinct resources absent from survey; stacks persist | `bloomRotation.test.ts` | Extinction + stockpiling |
| Unique display names across blooms | `bloomGenerator.test.ts` | SWG unique names |
| `concentration_range` + `lifespan_days` bounds | `bloomGenerator.test.ts` | Decision 020 fields stamped |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter @async-frontier-mmo/db test bloomRotation
pnpm check
```

---

## 6. Recap

**Learned:** Scarcity is caps + random rolls + extinction; distribution skew is a data knob; generator stays pure; rotation is explicit and ledger-audited.

**Files:** `familyStatCaps.ts`, `bloomGenerator.ts`, `bloomRotation.ts`, `0016_bloom_rotation.sql`, `+page.server.ts` rotate action.

**Next exercise:** Prospecting, sampling, and survey energy (Lesson 6.5 / Decision 019).
