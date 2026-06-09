# Lesson 03 — Idempotent thumper claim (before rewards exist)

> **Exercise:** Make thumper claim safe at the DB/query boundary so the same run cannot be claimed twice — even under double-click or concurrent requests. No resources, ledger, or inventory yet.

**Prerequisite:** Lessons 01–02 complete; deploy + claim + Postgres persistence working.

---

## 1. What idempotent claim means in a game economy

**Idempotent** means: doing the action once or many times has the **same final effect**.

For thumper claim today that means:

- First claim → `claimed_at` is set, player sees “claimed”
- Second claim (refresh, double-click, retry) → **no second mutation**, same outcome as after the first claim

When rewards arrive in a later lesson, idempotency becomes critical:

```text
claim #1 → grant 50 Veyrith Copper  ✓
claim #2 → grant 50 Veyrith Copper  ✗ economy exploit
```

The server must enforce “at most one successful claim per thumper run” — not the browser.

Design docs (`TECH_STACK_AND_INFRA_COST_PLAN.md`, `DECISION_LOG.md`) require claiming, crafting, and repair to be idempotent before economy tables land.

---

## 2. Why hiding the Claim button is not enough

Lesson 01 already established: the server is authoritative for **eligibility** (`resolveThumperState` + `fail(400)` if too early).

Hiding the button after claim is **presentation only**. It does not stop:

| Attack / accident | Why UI fails |
|-------------------|--------------|
| Double-click Claim | Two POSTs before the first response updates the page |
| Browser back + resubmit | Form resubmission replays the action |
| Two tabs open | Both show Claim; both POST |
| DevTools / scripted POST | No button required |
| Network retry | Client may resend the same request |

```text
UI:     hide button after success     →  cosmetic
Server: one atomic claim per run       →  economy safety
```

---

## 3. Current claim flow

```text
POST ?/claim
  → getLatestThumperEvent()          read row
  → if no event → fail(400)
  → if claimed_at set → { claimed: true }     idempotent read path
  → resolveThumperState()            domain: active vs claimable
  → if not claimable → fail(400)
  → claimThumperEvent(id)            UPDATE … WHERE id = ? AND claimed_at IS NULL
  → return { claimed: true }                  idempotent write path (race-safe)
```

### `apps/web/src/routes/+page.server.ts` (claim action)

```typescript
claim: async () => {
	const db = getDb();
	const event = await getLatestThumperEvent(db);

	if (!event) {
		return fail(400, { message: 'No thumper to claim' });
	}

	if (event.claimedAt) {
		return { thumperDemo: null, claimed: true };
	}

	const thumperDemo = resolveThumperState({
		deployedAt: event.deployedAt,
		durationSeconds: event.durationSeconds,
		now: new Date()
	});

	if (thumperDemo.status !== 'claimable') {
		return fail(400, { message: 'Thumper is not claimable yet', thumperDemo });
	}

	await claimThumperEvent(db, event.id);

	return { thumperDemo: null, claimed: true };
}
```

### `packages/db/src/queries/thumperEvents.ts`

```typescript
export async function claimThumperEvent(db: Db, id: string) {
	const [row] = await db
		.update(thumperEvents)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperEvents.id, id), isNull(thumperEvents.claimedAt)))
		.returning();

	return row ?? null;
}
```

**Original gaps (fixed):** (1) read path returned `fail(400)` when `claimed_at` was already set; (2) write path updated by `id` only — no `claimed_at IS NULL` guard for concurrent requests.

### Domain (`resolveThumperState`)

Domain already answers: “Has the timer finished?” (`active` vs `claimable`). It does **not** know about `claimed_at` — that lives in Postgres. No domain change is required for this lesson; the bug is at the persistence boundary.

---

## 4. Smallest testable change

**One atomic rule at the DB layer:**

```sql
UPDATE thumper_events
SET claimed_at = now()
WHERE id = $1 AND claimed_at IS NULL
RETURNING *;
```

If zero rows match → already claimed → return `null` to the caller.

**Server action:** Treat `null` as **idempotent success** (same response as a fresh claim), not `fail(400)`. The player already got their outcome; repeating must not error or re-mutate.

### Target: `packages/db/src/queries/thumperEvents.ts`

```typescript
import { and, desc, eq, isNull } from 'drizzle-orm';

export async function claimThumperEvent(db: Db, id: string) {
	const [row] = await db
		.update(thumperEvents)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperEvents.id, id), isNull(thumperEvents.claimedAt)))
		.returning();

	return row ?? null;
}
```

### Target: `apps/web/src/routes/+page.server.ts` (claim action)

```typescript
if (!event) {
	return fail(400, { message: 'No thumper to claim' });
}

if (event.claimedAt) {
	return { thumperDemo: null, claimed: true };
}

// … resolveThumperState; fail(400) if not claimable …

await claimThumperEvent(db, event.id);

return { thumperDemo: null, claimed: true };
```

Idempotency at two layers:

- **Read path:** `event.claimedAt` already set → success (replay/back/resubmit)
- **Write path:** `claimThumperEvent` uses `WHERE claimed_at IS NULL` → race-safe; caller always returns success after a claimable check passes

### TDD note

This bug is **atomicity**, not a pure formula. `resolveThumperState` already has Vitest coverage; it cannot fix a concurrent double-write.

Verification for this lesson:

```bash
pnpm check
pnpm --filter @async-frontier-mmo/domain test   # unchanged, should still pass
pnpm --filter @async-frontier-mmo/db db:smoke     # optional manual double-claim check
```

A dedicated DB integration test for double claim can come with lesson 12 (transactional rewards).

---

## 5. Predict the race bug

Before editing, answer in chat:

> Two `claim` requests hit the server at the same time for the same unclaimed thumper. Both pass `getLatestThumperEvent` and `resolveThumperState`. **What happens today?** How many times does `claimed_at` get set? What would go wrong once claim grants resources?

The coach will confirm, apply the minimal diff (two files), and run checks.

---

## 6. Apply + verify (coach step)

After your answer:

1. Edit `packages/db/src/queries/thumperEvents.ts` — conditional `WHERE claimed_at IS NULL`.
2. Edit `apps/web/src/routes/+page.server.ts` — handle `null` return idempotently.
3. Run `pnpm check` and domain tests.

Manual sanity check:

1. Deploy thumper, wait until claimable.
2. Claim once → dev note shows `claimed`.
3. Replay POST (DevTools or back+submit) → should still succeed without error; `claimed_at` unchanged.

---

## Recap checklist

- [ ] Server returns success when `event.claimedAt` is already set (replay/back/resubmit)
- [ ] `claimThumperEvent` only updates when `claimed_at IS NULL` (race-safe write)
- [ ] No resources, ledger, or inventory added
- [ ] `pnpm check` passes

**Next exercise:** Lesson 1.3 — Replace global latest thumper with a demo pilot/open-run concept.
