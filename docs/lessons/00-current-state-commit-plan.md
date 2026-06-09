# Commit plan — current learning scaffold

> **Purpose:** Split the current working tree into four logical commits before pushing.  
> **Do not commit secrets:** `packages/db/.env` and `apps/web/.env` are gitignored — never `git add` them.

**Branch:** `master`  
**Already committed (for context):** monorepo scaffold, domain `resolveThumperState`, early web demo, initial `thumper_events` schema stub.

**Recommended order:** commit **1 → 2 → 3 → 4** (oldest / most foundational first).

After each commit, run `pnpm check` before moving on (except commit 1, which is docs-only).

---

## Commit 1 — design-doc final review / reorganization

**Why first:** Pure documentation. No code or lockfile coupling. Easy to review or revert in isolation.

### `git add`

```bash
git add design-docs/DESIGN_BIBLE.md
git add design-docs/MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md
git add design-docs/TECH_STACK_AND_INFRA_COST_PLAN.md
git add design-docs/DECISION_LOG.md
git add design-docs/FINAL_REVIEW_NOTES.md
git add design-docs/LAYERED_FEATURE_BACKLOG.md
git add design-docs/MANIFEST.md
git add design-docs/MVP_SCOPE_REFERENCE.md
git add design-docs/README.md
git add design-docs/legacy/
git add design-docs/research/
git add design-docs/DURABILITY_AND_FRAME_MODULE_RESEARCH.md
git add design-docs/FIREFALL_FAILURE_AND_THUMPER_COMPONENT_RESEARCH.md
git add design-docs/FIREFALL_THUMPER_GROUP_VS_PERSONAL_RESEARCH.md
git add design-docs/PLAYER_FACING_ROADMAP.md
git add design-docs/SWG_CRAFTING_REPAIR_ACTIVE_EVENTS_RESEARCH.md
git add design-docs/SWG_RESOURCE_CRAFTING_FEEDBACK_RESEARCH.md
git add design-docs/production-point.md
git add design-docs-old-reference/
```

**Notes:**

- The `git add` lines for deleted root-level research files record the **deletions** (moved into `design-docs/research/` with renamed `RESEARCH_*` filenames).
- `design-docs-old-reference/` is a frozen copy of the pre-reorganization tree — include if you want history in-repo; omit that line if you prefer not to archive it in git.

### Commit message

```text
Reorganize design docs after MVP final review.

Consolidate canon docs, add manifest and decision log, move research into
design-docs/research/, and archive the pre-reorganization snapshot for reference.
```

### Verify

```bash
git status   # design-docs clean; code changes still unstaged
```

---

## Commit 2 — db / docker / drizzle setup

**Why second:** Persistence layer and local Postgres — independent of SvelteKit UI behavior.

### `git add`

```bash
git add docker-compose.yml
git add packages/db/package.json
git add packages/db/src/index.ts
git add packages/db/src/schema/thumperEvents.ts
git add packages/db/src/client.ts
git add packages/db/src/queries/
git add packages/db/drizzle.config.ts
git add packages/db/drizzle/
git add packages/db/scripts/
git add packages/db/.env.example
```

**Do not add:** `packages/db/.env`

### Lockfile (read this)

`packages/db/package.json` adds `drizzle-orm`, `postgres`, `drizzle-kit`, and `tsx`. You have two clean options:

**Option A (simpler):** defer `pnpm-lock.yaml` to **commit 3** so one lockfile reflects both db and web dependency changes. Commit 2 is still valid; just don’t run a fresh clone `pnpm install` until commit 3 lands.

**Option B (stricter):** after staging commit 2 files only, run `pnpm install`, then:

```bash
git add pnpm-lock.yaml
```

…and include the lockfile in commit 2. Commit 3 may need another `pnpm install` + lockfile add if `apps/web/package.json` changes deps again.

### Commit message

```text
Add Docker Postgres and Drizzle persistence for thumper events.

Introduce docker-compose Postgres, Drizzle schema and migrations for
thumper_events (including claimed_at), a db client, query helpers, and a
db:smoke script for local verification.
```

### Verify

```bash
docker compose up -d
cd packages/db && pnpm db:migrate && pnpm db:smoke
```

---

## Commit 3 — web thumper deploy / claim / countdown learning scaffold

**Why third:** UI and server routes that **use** the db package — builds on commit 2.

### `git add`

```bash
git add apps/web/package.json
git add apps/web/.env.example
git add apps/web/svelte.config.js
git add apps/web/vite.config.ts
git add apps/web/src/routes/+page.server.ts
git add apps/web/src/routes/+page.svelte
git add pnpm-lock.yaml
```

**Do not add:** `apps/web/.env`

**Lockfile:** if you used Option A in commit 2, `pnpm-lock.yaml` **must** be included here. From repo root:

```bash
pnpm install
git add pnpm-lock.yaml
```

### Commit message

```text
Wire thumper deploy, claim, and countdown UX to Postgres.

Persist deploys in thumper_events, load latest event on refresh, add named
deploy/claim actions with server-side eligibility checks, and tick an active
countdown client-side that invalidates load when it reaches zero.
```

### Verify

```bash
pnpm check
pnpm dev
# Deploy → countdown → claimable → Claim → claimed; hard refresh keeps state until claimed
```

---

## Commit 4 — lesson docs

**Why last:** Learning notes about the scaffold you just committed — meta documentation.

### `git add`

```bash
git add docs/ASYNC_FRONTIER_MMO_CURSOR_LEARNING_PATH.md
git add docs/lessons/01-light-countdown-refresh-ux.md
git add docs/lessons/00-current-state-commit-plan.md
```

### Commit message

```text
Add learning path and lesson notes for the thumper vertical slice.

Document the countdown refresh lesson, Cursor learning path, and this commit
plan so future sessions can pick up from a known checkpoint.
```

### Verify

```bash
git status   # working tree clean
git log -4 --oneline
```

---

## Quick reference

| # | Theme | Key paths |
|---|--------|-----------|
| 1 | Design reorg | `design-docs/**`, `design-docs-old-reference/` |
| 2 | DB / Docker | `docker-compose.yml`, `packages/db/**` |
| 3 | Web scaffold | `apps/web/**` (+ `pnpm-lock.yaml`) |
| 4 | Lessons | `docs/**` |

---

## Optional follow-up (not part of this plan)

- Squash commits 2–3 if you prefer one “persistence + web” commit for the learning milestone.
- Add a git tag after commit 4, e.g. `learning-thumper-vslice-v1`.
- Open a PR with the four commits intact for readable review history.
