# Lesson 14 — Transactional claim reward (Veyrith Copper)

> **Exercise:** When the tutorial thumper run is claimable, claim grants Veyrith Copper to the pilot's stack and writes a ledger row — in **one database transaction**, idempotently. Double-claim must not duplicate stacks or ledger entries.

**Prerequisite:** Lessons 03 (idempotent claim), 12 (recall early), 13 (resource instances, stacks, ledger).

**Out of scope:** Crafting, inventory UI beyond a simple claim result line, seeded non-tutorial claim resolution, marketplace.

**Learning goal:** Understand **transactions**, **idempotency**, and why `claimed_at` and resource grants must not be separate commits.

---

## 1. What a transaction is (and why claim needs one)

A **transaction** is a group of database writes that succeed together or fail together:

```text
BEGIN
  1. verify run is claimable
  2. UPDATE thumper_runs SET claimed_at = now() WHERE id = ? AND claimed_at IS NULL
  3. INSERT thumper_run_results (...)
  4. UPSERT resource_stacks (pilot + resource_instance_id)
  5. INSERT economy_ledger (resource_granted)
COMMIT   — all five visible together
ROLLBACK — none of them stick if step 4 throws
```

Without a transaction, a crash between steps 2 and 4 leaves:

- run marked claimed but **no copper granted** (player rage)
- or copper granted but run still "open" (double-claim exploit)

Postgres `db.transaction()` wraps the claim path in `claimOpenThumperRunForPilot`.

---

## 2. Idempotency — same answer, no extra copper

**Idempotent** claim means: calling claim N times has the same effect as calling it once.

| Attempt | `claimed_at` | `thumper_run_results` | stack | ledger |
|---------|--------------|----------------------|-------|--------|
| 1st (wins) | set | inserted | +recovered | +1 `resource_granted` |
| 2nd | unchanged | existing returned | unchanged | unchanged |

Mechanisms:

1. **Conditional update** — `claimThumperRun` only sets `claimed_at` when it is currently `NULL`.
2. **Early return** — if no open run and latest run already claimed → `already_claimed`, **no grant**.
3. **Grant only on `status: 'claimed'`** — reward path runs only when this request won the race.

Hiding the Claim button is presentation. The server must enforce this.

---

## 3. What goes wrong if claim and grant are separate

```text
BAD — two HTTP handlers / two transactions:

  POST /claim  →  claimed_at = now()     ✓
  (server crash)
  POST /grant  →  never runs             ✗ player lost copper

BAD — grant before claim wins:

  grant 50 copper                        ✓
  claim UPDATE returns 0 rows            ✗ open run + free copper

BAD — double-click two parallel claims:

  both read claimed_at IS NULL
  both grant 50                          ✗ 100 copper from one run
```

**Fix:** one transaction, grant keyed to `thumper_run_result.id` in ledger `source_id`, and grant only when conditional `claimed_at` update wins.

---

## 4. Resource instance reference (not domain slug alone)

Lesson 13 introduced persisted `resource_instances`. The grant must reference:

```text
run.target_resource_id  →  slug (veyrith_copper)
bloom #1 instance row   →  resource_instance_id (uuid)
resource_stacks row     →  pilot_id + resource_instance_id
ledger row              →  resource_instance_id, source_id = thumper_run_result.id
```

Domain still resolves **how much** copper (`resolveFirstSessionThumperRunResult`). DB resolves **which instance** (`getResourceInstanceByBloomSlug`).

---

## 5. Claim flow (tutorial)

```text
POST ?/claim
  → ensureBloomOneResourceInstances()
  → claimOpenThumperRunForPilot({
       isClaimable: isThumperRunClaimable,   // domain
       buildResult: resolveFirstSession…,
       grantResourceReward: { bloomId: 1 }
     })
  → return { claimResult, reward }
```

Inside the transaction (first successful claim only):

1. Gate on `isThumperRunClaimable` (timer or recall).
2. `claimThumperRun` conditional update.
3. Insert `thumper_run_results`.
4. `grantResourceToPilotTx` — stack upsert + `resource_granted` ledger.

---

## 6. Domain — claim eligibility

`isThumperRunClaimable` (pure domain) combines:

- `resolveThumperState` — timer elapsed → claimable
- Recall Early — claimable immediately when run ended by recall
- `isThumperRunReadyToResolve` — windows answered (or recall recorded)

Tests live in `packages/domain/src/thumper/isThumperRunClaimable.test.ts`.

---

## 7. Files touched

| Path | Role |
|------|------|
| `packages/domain/src/thumper/isThumperRunClaimable.ts` | Server-side claim eligibility |
| `packages/db/src/queries/thumperRunWorkflow.ts` | Transactional claim + optional `grantResourceReward` |
| `packages/db/src/queries/resourceGrants.ts` | `grantResourceToPilotTx` for in-transaction grants |
| `packages/db/src/queries/claimReward.test.ts` | Double-claim stack + ledger integrity |
| `apps/web/src/routes/+page.server.ts` | Tutorial claim wires bloom grant |
| `apps/web/src/routes/+page.svelte` | Simple reward line in claim result |

---

## 8. TDD / verification checklist

| Test | Proves |
|------|--------|
| `isThumperRunClaimable` domain tests | Timer vs recall eligibility |
| First claim integration | Stack += recovered; one ledger row with `source_id` = result id |
| Second claim | `already_claimed`; stack unchanged; ledger count unchanged |
| Smoke script | End-to-end on demo pilot |

```bash
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db test
pnpm --filter @async-frontier-mmo/db db:smoke
```

---

## Recap checklist

- [x] Claim grants Veyrith Copper via `resource_instance_id` from bloom #1
- [x] `claimed_at`, result row, stack, and ledger in one transaction
- [x] Double claim returns existing result without duplicate grant/ledger
- [x] Domain `isThumperRunClaimable` tests
- [x] UI shows simple claim result + inventory line

**Next exercise:** Schematic engine + Survey Scanner Module Mk I (Lesson 5.1) — consume granted copper in crafting.
