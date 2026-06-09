# Async Frontier MMO — Cursor Learning Path and Prompt Pack

Last reviewed: 2026-06-09
Reviewer: Hermes using GPT-5.5 / OpenAI Codex with xHigh-style review depth
Project: `/home/ryanh/development/async-frontier-mmo`

This document is the pasteable learning path for Cursor. It replaces the repeated back-and-forth of asking “is this still the right next step?” after every recap.

Use it like this:

1. Start at the current lesson.
2. Copy the Cursor prompt for that lesson.
3. Let Cursor explain the lesson, include likely questions with answers, then implement the scoped change without stopping for answers.
4. Run the verification commands.
5. Commit.
6. At every `GPT 5.5 Review` gate, come back to Hermes/GPT-5.5 xHigh for a deeper code/design review before continuing.

---

## 0. Current review verdict

### Are we still on the right track?

Yes, with one important clarification.

The current implementation is on the right track as a learning scaffold for:

```text
SvelteKit server load/actions
→ server-authoritative state
→ domain rules
→ Drizzle/Postgres persistence
→ light client countdown presentation
```

But the current code is not yet the actual locked MVP vertical slice.

Current implemented toy:

```text
deploy test thumper
→ persist thumper_events row
→ show countdown
→ invalidate at zero
→ claim server-side
→ record claimed_at
```

Locked MVP toy from design docs:

```text
choose frame
→ survey Red Mesa
→ compare Keth Iron / Veyrith Copper / Thornwake Crystal
→ deploy on Veyrith Copper signal
→ resolve Signal Drift and Pump Strain
→ claim Veyrith Copper
→ craft Survey Scanner Module Mk I
→ equip scanner
→ survey again with clearer information
```

So: keep the current scaffold, but pivot the learning path back toward the locked MVP.

### What was rescanned

Design docs reviewed:

- `design-docs/README.md`
- `design-docs/MANIFEST.md`
- `design-docs/MVP_SCOPE_REFERENCE.md`
- `design-docs/DESIGN_BIBLE.md`
- `design-docs/DECISION_LOG.md`
- `design-docs/MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md`
- `design-docs/TECH_STACK_AND_INFRA_COST_PLAN.md`
- `design-docs/LAYERED_FEATURE_BACKLOG.md`
- `design-docs/FINAL_REVIEW_NOTES.md`
- research docs under `design-docs/research/`

Current code reviewed:

- `apps/web/src/routes/+page.server.ts`
- `apps/web/src/routes/+page.svelte`
- `packages/domain/src/thumper/resolveThumperState.ts`
- `packages/domain/src/thumper/resolveThumperState.test.ts`
- `packages/db/src/schema/thumperEvents.ts`
- `packages/db/src/queries/thumperEvents.ts`
- `packages/db/src/client.ts`
- `packages/db/drizzle/`
- `packages/shared/src/index.ts`
- package scripts and Docker/Drizzle setup

Verification actually run:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Result:

```text
Domain tests: 4 passed
pnpm check: 0 errors, 0 warnings
DB smoke: inserted and selected a thumper_events row successfully
```

Note: `db:smoke` inserts a row into local Postgres. That is expected for the current script.

---

## 1. Locked MVP scope summary

Do not let Cursor expand the MVP beyond this without a GPT 5.5 Review gate.

### Core MVP question

From `MVP_SCOPE_REFERENCE.md`:

```text
Is it fun to survey Red Mesa, discover named resource signals, deploy a personal thumper, make a few event choices, recover resources, craft better parts/modules, and repeat while gear wears down fairly?
```

### Core toy

```text
survey → thump → claim → think-craft → equip/use → wear/repair → survey better
```

### Locked MVP content

- Region: Red Mesa only.
- Frames: Recon, Engineer, Vanguard.
- Resource families:
  - Conductive Metal
  - Structural Alloy
  - Reactive Crystal
- Named resources:
  - Keth Iron
  - Red Mesa Conductive Slag
  - Asterion Frame Alloy
  - Pale Ember Crystal
  - Veyrith Copper
  - Thornwake Crystal
- Resource stats:
  - OQ
  - Conductivity
  - Hardness
  - Heat Resistance
  - Malleability
- One basic personal thumper.
- Thumper slots:
  - Drill
  - Pump
  - Hull
- Event actions:
  - Signal Tune
  - Field Repair
  - Suppress Threat
  - Clear Pump Problem
- Complications:
  - Signal Drift
  - Hull Damage
  - Threat Surge
  - Pump Strain
- Universal safety choice:
  - Recall Early
- Craftable outputs:
  - Basic Drill Head
  - Efficient Pump
  - Reinforced Hull Plate
  - Survey Scanner Module Mk I
  - Field Repair Kit
- Crafting interaction:
  - named-resource slot choice
  - weighted property preview
  - exactly 3 tuning points
  - Safe Craft / Careful Experiment
  - result explanation
- Durability:
  - Condition + Integrity
  - crafted Field Repair Kits
- Audit spine:
  - Pilot
  - Resource Instance
  - Resource Stack
  - Item
  - Schematic Definition
  - Crafting Attempt
  - Thumper Run
  - Thumper Event Window
  - Thumper Run Result
  - Repair Action
  - Economy Ledger

### Explicitly out of MVP

Do not add these during the learning path unless a GPT 5.5 Review explicitly promotes them:

```text
marketplace
player trade
chat
guilds
settlements
public helper boards
group thumpers
contracts
multiple regions
advanced refining
Chemical Purity
separators
factories
batch crafting
weapons
armor suits
PvP
realtime combat
monetization
mobile wrapper
broad MMO infrastructure
WebSockets/SSE unless specifically justified later
```

---

## 2. Current implementation findings

### Good direction

The current architecture is good for learning:

```text
/apps/web        SvelteKit UI + server load/actions
/packages/domain pure game rules; no UI or DB imports
/packages/db     Drizzle schema, migrations, queries, smoke script
/packages/shared shared types
```

Good choices already made:

- Domain logic is pure and tested.
- Server action validates claim eligibility server-side.
- Client countdown is presentation only.
- `invalidateAll()` is a light refresh at zero.
- No WebSockets, cron, jobs, or queues were added prematurely.
- Drizzle/Postgres persistence is wired enough to prove the path.

### Risks to fix before adding the full MVP loop

1. `packages/shared/src/index.ts` has stale stat codes:

```ts
export type ResourceStatCode = 'OQ' | 'DR' | 'EN' | 'CD';
```

This conflicts with locked MVP stats:

```text
OQ, Conductivity, Hardness, Heat Resistance, Malleability
```

2. Thumper state is global/latest-event oriented.

Current query:

```text
getLatestThumperEvent(db)
```

This is fine for a first demo but not enough for MVP. We need at least a demo pilot / ownership concept before resource rewards.

3. Claim is not yet economy-safe.

Current `claimThumperEvent` updates by id only. Before rewards exist, this is acceptable as a demo. Before adding resource stacks/ledger, claim must become idempotent:

```text
update where id = ? and claimed_at is null
```

Then claim + rewards should happen in one transaction.

4. There is no economy ledger yet.

That is okay right now. But once claim creates resources, every resource mutation should be auditable.

5. The current UI is still a demo page.

That is okay for learning, but the real MVP screens are:

1. Pilot Home
2. Red Mesa Survey
3. Signal Detail / Deploy Thumper
4. Thumper Run / Event Window
5. Claim Results
6. Crafting + Gear / Repair

---

## 3. Operating rules for Cursor

Paste this at the start of every new Cursor chat for this project.

```text
Use the learning-coach skill.

Project: async-frontier-mmo.
Stack: TypeScript + SvelteKit + PostgreSQL + Drizzle + Docker + pnpm workspace.
Architecture:
- apps/web = SvelteKit UI and server load/actions
- packages/domain = pure game rules, no DB/UI imports
- packages/db = Drizzle schema, migrations, queries
- packages/shared = shared types/constants
- packages/jobs = only later, when real autonomous world processing exists

Ryan is learning. Do not silently implement large changes.

Teaching rules:
1. Keep chat short.
2. Write the main explanation, likely questions with answers, recap, and commands into a markdown file under docs/lessons/ or docs/learning-path-progress/.
3. Explain current flow and new flow before editing.
4. Before code changes, state the expected files, data flow, and likely mistakes so Ryan can ask follow-up questions if needed.
5. Continue without waiting for answers.
6. Include a short self-check explaining why the chosen approach is correct.
7. Apply the scoped change directly unless Ryan explicitly asks to type it manually.
8. Use TDD for domain rules and behavior changes.
9. Run the relevant checks after edits.
10. Do not add post-MVP systems; if the scoped lesson appears to require one, stop and explain the blocker instead of asking to expand scope.

Scope guard:
Locked MVP is Red Mesa only, one basic personal thumper, three thumper slots, four event actions, five recipes, five resource stats, and the core loop: survey → thump → claim → think-craft → equip/use → wear/repair → survey better.

Do not add marketplace, chat, guilds, group thumpers, multiple regions, realtime combat, WebSockets, jobs, cron, queues, monetization, mobile wrapper, or broad MMO infrastructure unless I explicitly ask after a GPT 5.5 Review checkpoint.
```

---

## 4. Git workflow checkpoints

### See current state

```bash
cd ~/development/async-frontier-mmo
git status --short
git diff --stat
```

Fish version is the same:

```fish
cd ~/development/async-frontier-mmo
git status --short
git diff --stat
```

### Standard verification before each commit

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

When DB work changed:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/db db:smoke
```

When web changed:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter web build
```

### Commit pattern

Use small commits, but always commit the whole lesson artifact set: code, tests, migrations/generated Drizzle metadata, lockfile changes, and the matching `docs/lessons/*.md` file.

```bash
cd ~/development/async-frontier-mmo
git status --short
git add <exact files, including the lesson doc>
git diff --cached --name-status
git commit -m "type: short description"
git status --short
```

Rules:

- Never commit from a dirty state you have not inspected.
- Never rely on a passing local build if `git status --short` still shows modified or untracked files; that means `HEAD`/GitHub may be broken even though your working tree passes.
- Include `docs/lessons/<lesson>.md` in the same commit as the lesson unless the lesson is intentionally docs-only.
- Include generated Drizzle migration metadata and `pnpm-lock.yaml` when they changed.
- After a commit, `git status --short` should be empty unless you intentionally have unrelated work parked.

Examples:

```bash
git commit -m "docs: add cursor learning path"
git commit -m "test: cover double thumper claim rule"
git commit -m "fix: make thumper claim idempotent"
git commit -m "feat: add Red Mesa resource definitions"
```

### Push pattern

This repo should use `main` as the GitHub/default branch. Avoid pushing lesson work to a separate `master` branch.

Before pushing, always confirm the branch and upstream:

```bash
cd ~/development/async-frontier-mmo
git status -sb
git branch -vv
git remote -v
```

Expected healthy state:

```text
## main...origin/main
```

If the local branch is still named `master`, rename it once:

```bash
git branch -m master main
git branch --set-upstream-to=origin/main main 2>/dev/null || true
```

If no remote exists yet, create a GitHub repo first, then:

```bash
git remote add origin git@github.com:<your-github-user>/async-frontier-mmo.git
git push -u origin main
```

For normal lesson commits, push the current branch to its upstream:

```bash
git push
```

If upstream is missing, set it explicitly:

```bash
git push -u origin main
```

Do not use `git push origin master` in this project unless a GPT-5.5 review explicitly asks for a temporary recovery push. It can create a second GitHub branch and leave the default `main` stale.

### GPT 5.5 Review checkpoint prompt

Use this with Hermes/GPT-5.5 xHigh before pushing larger milestones:

```text
GPT 5.5 Review checkpoint for async-frontier-mmo.

Please review the current git diff and project state for:
1. Locked MVP scope alignment against design-docs/MVP_SCOPE_REFERENCE.md and DECISION_LOG.md.
2. Architecture boundaries: domain pure, db isolated, web server-authoritative, client presentation only.
3. TDD/test coverage and missing tests.
4. Economy safety: no duplicate rewards, no unaudited mutations, no client-authoritative decisions.
5. YAGNI/scope creep: reject jobs, WebSockets, marketplace, guilds, group thumpers, multiple regions, etc. unless clearly required.
6. Learning quality: small steps, durable lesson docs, explain-before-edit workflow with likely questions answered.
7. Exact next step recommendation.

Use GPT-5.5 xHigh depth. Be strict. If it is not ready to commit/push, say why.
```

---

# Learning Path

The path is divided into phases. Each lesson has:

- Goal
- Why it matters
- Cursor prompt to paste
- Verification commands
- Commit checkpoint
- GPT 5.5 Review gate when needed

Do not rush. The goal is not just to produce code; the lesson doc should explain what changed, why it changed, and answer the questions Ryan is likely to have while reading it.

---

## Phase 0 — Stabilize what exists

### Lesson 0.1 — Commit the current reviewed learning scaffold

Goal:

Capture the current working state before pivoting toward the locked MVP.

Why:

Your repo currently has many uncommitted files: docs reorganization, Drizzle/Postgres setup, thumper claim/countdown, env examples, etc. Before continuing, create a known restore point.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: help me prepare a clean commit for the current learning scaffold.

Do not change source files until after writing the commit plan.

First inspect git status and group the current changes into logical commits:
1. design-doc final review/reorganization
2. db/docker/drizzle setup
3. web thumper deploy/claim/countdown learning scaffold
4. lesson docs

Write the suggested commit plan into docs/lessons/00-current-state-commit-plan.md.

For each commit, list exact files to git add and the commit message.

Do not commit automatically. Write the plan, explain why the grouping is safe, and stop after the plan.
```

Verification commands:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Possible commit commands after reviewing Cursor’s file grouping:

```bash
cd ~/development/async-frontier-mmo

git add design-docs design-docs-old-reference
git commit -m "docs: finalize MVP design package"

git add docker-compose.yml packages/db apps/web/.env.example packages/db/.env.example pnpm-lock.yaml
git commit -m "feat: add local Postgres and Drizzle setup"

git add apps/web/src/routes/+page.server.ts apps/web/src/routes/+page.svelte apps/web/package.json apps/web/svelte.config.js apps/web/vite.config.ts packages/domain packages/shared pnpm-lock.yaml
git commit -m "feat: add persisted thumper deploy and claim scaffold"

git add docs
git commit -m "docs: add learning notes"
```

Important: adjust file groups based on actual `git status`. Do not blindly commit files you do not understand.

GPT 5.5 Review gate:

After these commits, ask for a review before starting Phase 1.

---

## Phase 1 — Correct the foundation before adding MVP systems

### Lesson 1.1 — Align shared resource stat codes with locked MVP

Goal:

Replace placeholder stat codes with the locked MVP stat set.

Why:

The design docs lock five stats:

```text
OQ, Conductivity, Hardness, Heat Resistance, Malleability
```

Current code still has:

```text
OQ, DR, EN, CD
```

That mismatch should be fixed before survey/crafting work.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: align packages/shared resource stat codes with the locked MVP stats.

Important: write the lesson into docs/lessons/02-align-resource-stat-codes.md and keep chat short.

Goal:
- Replace the placeholder ResourceStatCode union with the locked MVP stat set from design-docs/MVP_SCOPE_REFERENCE.md:
  - OQ
  - Conductivity
  - Hardness
  - Heat Resistance
  - Malleability
- Prefer clear string values over cryptic abbreviations unless there is a strong reason.
- Update the dev display in apps/web/src/routes/+page.svelte if needed.
- Do not add resources, crafting, DB tables, or UI screens yet.

Teaching mode:
1. Explain why shared stat vocabulary matters.
2. Show current code and target code.
3. State which files should change and why.
4. Continue without waiting for an answer.
5. Then apply minimal edits.
6. Run pnpm check.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add packages/shared/src/index.ts apps/web/src/routes/+page.svelte docs/lessons/02-align-resource-stat-codes.md
git commit -m "fix: align resource stat codes with MVP scope"
git push
```

GPT 5.5 Review:

Not required unless Cursor tries to add extra systems.

---

### Lesson 1.2 — Make claim idempotent before rewards exist

Goal:

Ensure a thumper cannot be claimed twice at the DB/query boundary.

Why:

Before claim creates resources, fix the double-claim invariant. In multiplayer/economy games, duplicate reward claims are a major class of bug.

Expected direction:

- Domain can express whether a thumper is active/claimable/already claimed, or a separate claim eligibility function can handle that.
- DB update should include `claimed_at is null` in the condition.
- Server action should treat “no row updated” as already claimed/no longer claimable.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: make thumper claim idempotent before rewards exist.

Important: write the explanation into docs/lessons/03-idempotent-thumper-claim.md.

Goal:
- Prevent duplicate claim at the query/server boundary.
- Keep server authoritative.
- Do not add resources, inventory, ledger, pilots, auth, jobs, WebSockets, or cron yet.

Teaching mode:
1. Explain what idempotent claim means in a game economy.
2. Explain why UI hiding the button is not enough.
3. Show the current claim flow.
4. Propose the smallest testable change.
5. Use TDD if there is a clean domain rule to test.
6. Explain the double-submit/race bug: what happens if two claim requests arrive at the same time.
7. Continue without waiting for an answer.
8. Apply the smallest code change.
9. Run checks.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit:

```bash
git add packages/domain packages/db/src/queries/thumperEvents.ts apps/web/src/routes/+page.server.ts docs/lessons/03-idempotent-thumper-claim.md
git commit -m "fix: make thumper claim idempotent"
git push
```

GPT 5.5 Review gate:

Use the standard review prompt after this lesson. This is the first economy-safety checkpoint.

---

### Lesson 1.3 — Replace global latest thumper with a demo pilot/open-run concept

Goal:

Move from “latest global thumper” toward “current open thumper for one pilot” without adding full auth.

Why:

The MVP will need pilot ownership. We do not need real users/auth yet, but we should stop building habits around global singleton game state.

Expected direction:

- Add a simple pilot concept, possibly a hardcoded demo pilot id or `pilot_id` column.
- Query current open thumper for that pilot.
- Prevent deploying a second open thumper for the same pilot.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: replace global latest thumper with a demo pilot/open-run concept.

Important: write the lesson into docs/lessons/04-demo-pilot-open-thumper.md.

Goal:
- Stop using global latest thumper as the main state model.
- Add the smallest demo-pilot ownership concept needed for the learning scaffold.
- Prevent more than one open thumper for the demo pilot.
- Keep auth out of scope.
- Keep multiplayer out of scope.
- Keep resources/crafting out of scope for this lesson.

First explain:
1. Why global latest-event state is dangerous.
2. Why a hardcoded demo pilot is okay before auth.
3. What query we actually want: current open thumper for pilot.
4. What migration/schema/query changes are needed.
5. What test or smoke check proves this works.

State the files that should change and why, then continue with the scoped implementation.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/shared packages/db apps/web/src/routes/+page.server.ts apps/web/src/routes/+page.svelte pnpm-lock.yaml docs/lessons/04-demo-pilot-open-thumper.md
git commit -m "feat: scope thumper state to demo pilot"
git push
```

GPT 5.5 Review gate:

Required. Ask Hermes/GPT-5.5 xHigh to review whether this is enough pilot modeling or too much.

---

## Phase 2 — Pivot to the locked Red Mesa resource model

### Lesson 2.1 — Add Red Mesa resource definitions in domain only

Goal:

Create the locked MVP named resources as pure domain data.

Why:

Before more DB tables or UI, learn the resource model in pure TypeScript. This is the MVP’s economic foundation.

Resources:

- Keth Iron
- Red Mesa Conductive Slag
- Asterion Frame Alloy
- Pale Ember Crystal
- Veyrith Copper
- Thornwake Crystal

Stats:

- OQ
- Conductivity
- Hardness
- Heat Resistance
- Malleability

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Red Mesa resource definitions in packages/domain.

Important: write the lesson into docs/lessons/05-red-mesa-resource-definitions.md.

Goal:
- Add pure domain data/types for the six locked Red Mesa resources.
- Include family and stat values/personality for each resource based on design-docs/DECISION_LOG.md Decision 006 and Decision 010.
- Keep this in packages/domain for now.
- Do not add DB tables yet.
- Do not add UI yet.
- Do not add random generation yet.

Use TDD/documentation tests:
1. Test that there are exactly six MVP resources.
2. Test that each resource has all five MVP stats.
3. Test that Veyrith Copper has high Conductivity and weak Hardness, matching the design intent.

Teaching mode:
- Explain why we start in domain before DB.
- Explain why resource stats should not mutate during extraction.
- Continue to the scoped edits after documenting the reasoning.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain packages/shared docs/lessons/05-red-mesa-resource-definitions.md
git commit -m "feat: add Red Mesa resource definitions"
git push
```

GPT 5.5 Review:

Not required unless resource values/design interpretation are uncertain.

---

### Lesson 2.2 — Build a text-only survey result domain function

Goal:

Add pure domain logic for surveying Red Mesa and returning a few visible resource signals.

Why:

The first real MVP action is not deploy; it is survey.

Expected first-session behavior:

```text
survey Red Mesa
→ compare Keth Iron / Veyrith Copper / Thornwake Crystal
→ recommend Veyrith Copper
```

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: build a pure domain survey result for Red Mesa.

Important: write the lesson into docs/lessons/06-red-mesa-survey-domain.md.

Goal:
- Add a pure domain function that returns the first-session Red Mesa survey signals.
- Include at least Keth Iron, Veyrith Copper, and Thornwake Crystal.
- Mark Veyrith Copper as the recommended thump target for the first-session path.
- Keep the result deterministic for now.
- Do not add DB persistence yet.
- Do not add random resource rotation yet.
- Do not build full UI yet.

TDD:
1. Test survey returns exactly the intended starter comparison set.
2. Test Veyrith Copper is recommended.
3. Test each signal includes enough display info for a beginner to compare.

Teaching mode:
- Explain the difference between deterministic tutorial data and later world rotation.
- Explain what the survey action should output, with likely alternatives and why they are not chosen.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain docs/lessons/06-red-mesa-survey-domain.md
git commit -m "feat: add Red Mesa survey domain result"
git push
```

GPT 5.5 Review gate:

Recommended. Review whether survey output matches locked first-session path.

---

## Phase 3 — MVP thumper run, not just a timer

### Lesson 3.1 — Rename/reshape thumper_events toward thumper_runs conceptually

Goal:

Clarify the difference between a demo timer event and an MVP thumper run.

Why:

The MVP needs a run with resource target, event windows, choices, projected recovery, complications, and claim result. The current `thumper_events` table is a useful learning scaffold, but the design docs call for a richer audit spine.

Do not overbuild. This lesson is for naming and shape clarity.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: plan the transition from thumper_events demo table to MVP thumper run model.

Important: write the plan into docs/lessons/07-thumper-run-data-shape.md.

Do not edit code first.

Goal:
- Compare current thumper_events fields to the MVP audit spine.
- Decide the next minimal schema shape for a personal thumper run targeting one resource signal.
- Include demo_pilot ownership if already added.
- Include target resource id/code.
- Keep duration/deployed/claimed concepts.
- Do not add full event windows yet unless the plan shows a tiny next step.
- Do not add group thumpers.
- Do not add jobs.

Include this Q&A in the lesson doc:
1. What is the difference between a thumper timer and a thumper run?
2. Why does the target resource belong on the run?
3. Why do choices/results need audit records later?

Stop after the markdown plan; do not ask Ryan to answer before writing it.
```

Verification:

No code verification if planning-only.

Commit:

```bash
git add docs/lessons/07-thumper-run-data-shape.md
git commit -m "docs: plan thumper run data shape"
git push
```

GPT 5.5 Review gate:

Required before making schema changes.

---

### Lesson 3.2 — Deploy thumper on Veyrith Copper from survey signal

Goal:

Connect survey result to thumper deployment.

Why:

This moves from “Deploy test thumper” to the actual first-session MVP action:

```text
survey Red Mesa → choose Veyrith Copper → deploy thumper
```

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: deploy a thumper on the Veyrith Copper survey signal.

Important: write the lesson into docs/lessons/08-deploy-on-survey-signal.md.

Goal:
- Replace generic Deploy test thumper with deploying on a selected Red Mesa survey signal.
- Start with Veyrith Copper as the recommended/tutorial target.
- Store enough information to know which resource the run targets.
- Keep UI minimal.
- Keep server authoritative.
- Keep client display presentation-only.
- Do not add event choices yet.
- Do not add resource rewards yet.

Teaching mode:
1. Explain current flow.
2. Explain new flow.
3. State what data the form must submit.
4. State what the server must validate.
5. Continue without waiting for answers.
6. Then implement in the smallest step.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/08-deploy-on-survey-signal.md
git commit -m "feat: deploy thumper from survey signal"
git push
```

GPT 5.5 Review:

Recommended.

---

### Lesson 3.3 — Add two deterministic event windows: Signal Drift and Pump Strain

Goal:

Add the first MVP active thumper choices.

Why:

The first-session path requires:

```text
resolve Signal Drift and Pump Strain
```

This is where the thumper becomes a game event, not just a timer.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add deterministic thumper event windows for Signal Drift and Pump Strain.

Important: write the lesson into docs/lessons/09-thumper-event-windows.md.

Goal:
- Add a pure domain model for thumper event windows.
- For the first tutorial run, generate exactly two event windows:
  1. Signal Drift → matching response Signal Tune
  2. Pump Strain → matching response Clear Pump Problem
- Keep it deterministic.
- Do not add random generation yet.
- Do not add all complications yet unless needed for types.
- Do not add realtime combat.
- Do not add jobs.

TDD:
1. Test tutorial Veyrith Copper run gets Signal Drift and Pump Strain.
2. Test each complication has the correct matching action.
3. Test Recall Early is available but not counted as one of the four event actions.

Teaching mode:
- Explain why active choices are short attention windows, not 40 minutes of watching.
- Map complication → matching response and explain why.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain docs/lessons/09-thumper-event-windows.md
git commit -m "feat: add tutorial thumper event windows"
git push
```

GPT 5.5 Review gate:

Required. This is a design-critical mechanic.

---

### Lesson 3.4 — Store event-window choices and resolve run result

Goal:

Record the player’s event choices and calculate the run result.

Why:

The MVP must be auditable. If a player receives resources, the game should be able to explain why.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: store thumper event choices and resolve the run result.

Important: write the lesson into docs/lessons/10-thumper-event-choice-resolution.md.

Goal:
- Add the minimal DB/domain path for event choices in the tutorial thumper run.
- Record player responses to Signal Drift and Pump Strain.
- Resolve projected recovery into a claimable result.
- Keep resource stats immutable.
- Bad choices may reduce quantity/waste/condition later, but do not create worse-stat versions of Veyrith Copper.
- Do not add inventory/resource stacks yet unless needed for the next lesson.
- Do not add jobs.

Teaching mode:
1. Explain auditability.
2. Explain why choices are stored, not just hidden in UI state.
3. State what needs to be recorded for each event window.
4. Continue without waiting for an answer.
5. Then implement minimal TDD/domain first, DB second.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/10-thumper-event-choice-resolution.md
git commit -m "feat: record thumper event choices"
git push
```

GPT 5.5 Review gate:

Required. Ask specifically about auditability and scope creep.

---

## Phase 4 — Claim resources with an economy ledger

### Lesson 4.1 — Add resource stacks and economy ledger tables

Goal:

Prepare for claim to grant Veyrith Copper in an auditable way.

Why:

The MVP is an economy game. Rewards should not appear without a durable trail.

Expected minimal tables:

- resource_instances or static resource definitions reference
- resource_stacks
- economy_ledger

Keep this tiny. Do not model the whole future economy.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add minimal resource stack and economy ledger tables.

Important: write the lesson into docs/lessons/11-resource-stack-ledger.md.

Goal:
- Add only the tables needed for the tutorial claim to grant Veyrith Copper safely.
- Add resource stack ownership for the demo pilot.
- Add economy ledger row for claim reward.
- Keep resource definitions in domain/static data for now unless there is a strong reason to persist them.
- Do not add marketplace, trade, contracts, refining, factories, or batch crafting.

Teaching mode:
1. Explain why claimed resources need a ledger.
2. Explain stack vs ledger.
3. Explain why this must be transactional with claimed_at.
4. State the minimum columns and why each is needed.
5. Continue without waiting for an answer.
6. Then implement in small steps.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
```

Commit:

```bash
git add packages/db pnpm-lock.yaml docs/lessons/11-resource-stack-ledger.md
git commit -m "feat: add resource stack and ledger tables"
git push
```

GPT 5.5 Review gate:

Required. Economy/audit checkpoint.

---

### Lesson 4.2 — Claim Veyrith Copper transactionally

Goal:

Change claim from “set claimed_at only” to “mark claimed + grant resource stack + ledger row.”

Why:

This is the first real reward loop.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: claim Veyrith Copper transactionally.

Important: write the lesson into docs/lessons/12-transactional-claim-reward.md.

Goal:
- When the tutorial thumper run is claimable, claim grants Veyrith Copper.
- The claim action must be transactional:
  1. verify run is claimable server-side
  2. update claimed_at only if currently unclaimed
  3. insert/update resource stack
  4. insert economy ledger row
- If already claimed, do not grant again.
- Return a simple claim result to UI.
- Do not add crafting yet.

TDD/testing:
- Add a domain test for claim eligibility if not already present.
- Add a DB smoke/integration script or test proving double claim does not duplicate rewards.

Teaching mode:
1. Explain transaction.
2. Explain idempotency.
3. Explain what can go wrong if claimed_at and resource reward are separate operations.
4. Continue without waiting for an answer.
5. Then implement.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Manual verification:

```bash
cd ~/development/async-frontier-mmo
pnpm dev
```

Then in browser:

```text
survey/deploy/finish/claim
refresh
verify reward persists
try claim again
verify no duplicate reward
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/12-transactional-claim-reward.md
git commit -m "feat: grant Veyrith Copper on thumper claim"
git push
```

GPT 5.5 Review gate:

Required. This is the most important early economy safety gate.

---

## Phase 5 — Thinking-craft MVP

### Lesson 5.1 — Add Survey Scanner Module Mk I schematic in domain

Goal:

Create the first craftable upgrade.

Why:

The first-session path requires crafting Survey Scanner Module Mk I after claiming Veyrith Copper.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Survey Scanner Module Mk I schematic in domain.

Important: write the lesson into docs/lessons/13-survey-scanner-schematic.md.

Goal:
- Add a pure domain schematic for Survey Scanner Module Mk I.
- Include named-resource slot requirements appropriate for the MVP.
- Include weighted property preview using the five MVP stats.
- Keep exactly 3 tuning points.
- Include Safe Craft and Careful Experiment as the only MVP craft modes.
- Do not add all five recipes yet unless types require names.
- Do not add batch crafting.
- Do not add factories/refining.

TDD:
1. Test the schematic exists.
2. Test exactly 3 tuning points are accepted.
3. Test Veyrith Copper influences scanner signal clarity through Conductivity/OQ.
4. Test tuning expresses resource potential but does not mutate the resource.

Teaching mode:
- Explain resource primacy.
- Explain why tuning should not upgrade the raw material.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain docs/lessons/13-survey-scanner-schematic.md
git commit -m "feat: add survey scanner crafting schematic"
git push
```

GPT 5.5 Review gate:

Required. Crafting math/scope checkpoint.

---

### Lesson 5.2 — Craft scanner from claimed Veyrith Copper

Goal:

Let the player craft Survey Scanner Module Mk I from their claimed resource stack.

Why:

This completes:

```text
claim → craft
```

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: craft Survey Scanner Module Mk I from claimed Veyrith Copper.

Important: write the lesson into docs/lessons/14-craft-survey-scanner.md.

Goal:
- Add minimal crafting action for Survey Scanner Module Mk I.
- Spend resource stack quantity.
- Create item record.
- Insert economy ledger/crafting attempt record.
- Show a result explanation.
- Keep crafting server-authoritative.
- Do not add all recipes yet.
- Do not add inventory UI beyond what is needed.
- Do not add marketplace/trade.

Teaching mode:
1. Explain resource spend vs item creation.
2. Explain why crafting attempt should be recorded.
3. State what database records change when crafting succeeds.
4. Continue without waiting for an answer.
5. Implement minimal TDD/domain first, DB second, web third.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/14-craft-survey-scanner.md
git commit -m "feat: craft survey scanner from claimed resource"
git push
```

GPT 5.5 Review gate:

Required. Economy/crafting audit checkpoint.

---

### Lesson 5.3 — Equip scanner and make second survey clearer

Goal:

Close the first MVP learning loop:

```text
craft scanner → equip scanner → survey again with clearer information
```

Why:

This is the first “gear changes the next loop” payoff.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: equip Survey Scanner Module Mk I and improve the next survey.

Important: write the lesson into docs/lessons/15-equip-scanner-survey-better.md.

Goal:
- Add minimal equip/use flow for Survey Scanner Module Mk I.
- When equipped, the next Red Mesa survey should show clearer information.
- Keep this deterministic and easy to understand.
- Server remains authoritative.
- Client only displays.
- Do not add full gear system yet.
- Do not add multiple modules per frame unless required by the tiny flow.

TDD:
1. Domain test: survey without scanner has basic clarity.
2. Domain test: survey with scanner has improved clarity.
3. Domain test: scanner does not change resource stats; it changes information quality.

Teaching mode:
- Explain “survey better” as information improvement, not raw stat mutation.
- Explain what should be clearer after equipping the scanner.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/15-equip-scanner-survey-better.md
git commit -m "feat: equip scanner to improve survey clarity"
git push
```

GPT 5.5 Review gate:

Required. This is the first full loop payoff gate.

---

## Phase 6 — Wear, repair, and trust

### Lesson 6.1 — Add Condition + Integrity domain model

Goal:

Represent item wear fairly.

Why:

Durability should create demand without feeling punitive.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Condition + Integrity domain model.

Important: write the lesson into docs/lessons/16-condition-integrity-domain.md.

Goal:
- Add pure domain types/rules for Condition and Integrity.
- Routine use reduces Condition.
- Integrity/max-condition loss is reserved for severe events or risky choices.
- Avoid surprise deletion.
- Do not add repair UI yet.
- Do not add complex durability simulation.

TDD:
1. Test routine use reduces Condition only.
2. Test severe event may risk Integrity.
3. Test normal repair cannot exceed Integrity-limited maximum.

Teaching mode:
- Explain why two-layer durability is more trustworthy than simple item deletion.
- Explain what should happen after routine use.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
```

Commit:

```bash
git add packages/domain docs/lessons/16-condition-integrity-domain.md
git commit -m "feat: add condition and integrity rules"
git push
```

GPT 5.5 Review:

Recommended.

---

### Lesson 6.2 — Add Field Repair Kit as a crafted repair item

Goal:

Add the MVP repair loop.

Why:

Repair kits make crafting/economy matter and prevent wear from feeling purely punitive.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Field Repair Kit as a crafted repair item.

Important: write the lesson into docs/lessons/17-field-repair-kit.md.

Goal:
- Add Field Repair Kit as one of the five MVP craftable outputs.
- Use the MVP substitution formulas from DECISION_LOG Decision 003.
- Repair restores Condition partially and reduces Integrity risk; it is not a full-heal button.
- Add repair action/audit record only as minimally needed.
- Do not add Chemical Purity.
- Do not add Precision Repair Kits, Overhaul Kits, calibration kits, or post-MVP repair systems.

Teaching mode:
1. Explain why Field Repair Kit is an economy item.
2. Explain why it should not be a full heal.
3. State what a repair action should record.
4. Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add packages/domain packages/db apps/web pnpm-lock.yaml docs/lessons/17-field-repair-kit.md
git commit -m "feat: add field repair kit loop"
git push
```

GPT 5.5 Review gate:

Required. Durability trust checkpoint.

---

## Phase 7 — Convert demo UI into six MVP screens

### Lesson 7.1 — Replace default SvelteKit page with Pilot Home

Goal:

Remove the demo/default page and create the first MVP screen.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: replace default SvelteKit page with Pilot Home.

Important: write the lesson into docs/lessons/18-pilot-home-screen.md.

Goal:
- Remove the default Welcome to SvelteKit content.
- Add a minimal Pilot Home screen for the demo pilot.
- Show current frame, current run status, resource summary, equipped scanner if any, and next suggested action.
- Keep styling minimal.
- Do not add auth.
- Do not add full dashboard polish.

Teaching mode:
- Explain what information belongs on Pilot Home.
- Rank what the player needs to know first and explain why.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add apps/web docs/lessons/18-pilot-home-screen.md
git commit -m "feat: add pilot home screen"
git push
```

---

### Lesson 7.2 — Add Red Mesa Survey screen

Goal:

Make survey a visible screen, not just domain data.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Red Mesa Survey screen.

Important: write the lesson into docs/lessons/19-red-mesa-survey-screen.md.

Goal:
- Add a minimal Red Mesa Survey screen.
- Show Keth Iron, Veyrith Copper, and Thornwake Crystal comparison.
- Show why Veyrith Copper is recommended.
- Link/action to Signal Detail / Deploy Thumper.
- Keep one region only.
- Do not add multiple regions or random rotations yet.

Teaching mode:
- Explain server load data for survey.
- State what fields each signal card should show and why.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add apps/web packages/domain docs/lessons/19-red-mesa-survey-screen.md
git commit -m "feat: add Red Mesa survey screen"
git push
```

---

### Lesson 7.3 — Add Signal Detail / Deploy Thumper screen

Goal:

Show the selected signal and deploy action.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Signal Detail / Deploy Thumper screen.

Important: write the lesson into docs/lessons/20-signal-detail-deploy-screen.md.

Goal:
- Add a minimal Signal Detail screen for Veyrith Copper.
- Show projected recovery, signal lock, pump flow, threat pressure, and hull condition preview.
- Deploy the basic personal thumper.
- Keep the preview deterministic.
- Do not add multiple thumper types.
- Do not add group thumpers.

Teaching mode:
- Explain projected values vs actual result.
- State which values are player-facing and why.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add apps/web packages/domain packages/db docs/lessons/20-signal-detail-deploy-screen.md
git commit -m "feat: add signal detail deploy screen"
git push
```

---

### Lesson 7.4 — Add Thumper Run / Event Window screen

Goal:

Make Signal Drift and Pump Strain playable.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Thumper Run / Event Window screen.

Important: write the lesson into docs/lessons/21-thumper-run-event-screen.md.

Goal:
- Show current thumper run state.
- Present Signal Drift and Pump Strain event windows.
- Let player choose matching action, hold/ignore, or Recall Early.
- Keep choices server-authoritative.
- Keep timer/refresh light.
- Do not add realtime combat.
- Do not add WebSockets/jobs.

Teaching mode:
- Explain event windows as short attention moments.
- Explain how absent-player fallback should work.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add apps/web packages/domain packages/db docs/lessons/21-thumper-run-event-screen.md
git commit -m "feat: add thumper event window screen"
git push
```

GPT 5.5 Review gate:

Required before moving to claim/crafting screens.

---

### Lesson 7.5 — Add Claim Results screen

Goal:

Show what the player recovered and why.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Claim Results screen.

Important: write the lesson into docs/lessons/22-claim-results-screen.md.

Goal:
- Show recovered Veyrith Copper quantity.
- Explain how choices affected the result.
- Show ledger/audit summary in dev mode.
- Prevent duplicate claim.
- Link to Crafting + Gear.
- Do not add marketplace/trade.

Teaching mode:
- Explain result explanation and player trust.
- State what needs to be visible to feel fair.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Commit:

```bash
git add apps/web packages/domain packages/db docs/lessons/22-claim-results-screen.md
git commit -m "feat: add thumper claim results screen"
git push
```

---

### Lesson 7.6 — Add Crafting + Gear / Repair screen

Goal:

Bring crafting, equip, and repair into one minimal MVP screen.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add Crafting + Gear / Repair screen.

Important: write the lesson into docs/lessons/23-crafting-gear-repair-screen.md.

Goal:
- Show available Veyrith Copper stack.
- Show Survey Scanner Module Mk I schematic.
- Let player allocate exactly 3 tuning points.
- Let player Safe Craft or Careful Experiment.
- Show item result explanation.
- Let player equip scanner.
- Show Condition/Integrity if durability has been added.
- Keep UI minimal and understandable.
- Do not add all post-MVP crafting systems.

Teaching mode:
- Explain thinking-craft.
- Explain how resource stats feed property preview.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add apps/web packages/domain packages/db docs/lessons/23-crafting-gear-repair-screen.md
git commit -m "feat: add crafting gear repair screen"
git push
```

GPT 5.5 Review gate:

Required. This is the full clickable vertical slice checkpoint.

---

## Phase 8 — Instrumented playtest and production point

### Lesson 8.1 — Add tiny event telemetry for playtest evidence

Goal:

Record enough local evidence to decide whether the toy is fun/comprehensible.

Do not build analytics infrastructure. Keep it simple.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: add minimal playtest telemetry for the MVP loop.

Important: write the lesson into docs/lessons/24-minimal-playtest-telemetry.md.

Goal:
- Add the smallest useful telemetry/events for local playtest evidence.
- Track where players get stuck:
  - survey viewed
  - thumper deployed
  - event choice made
  - claim completed
  - craft completed
  - scanner equipped
  - second survey completed
- Keep data local and simple.
- Do not add external analytics.
- Do not add user tracking beyond demo pilot.
- Do not add dashboards.

Teaching mode:
- Explain evidence vs over-instrumentation.
- State what question each event answers.
- Continue without waiting for an answer.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add packages/db apps/web docs/lessons/24-minimal-playtest-telemetry.md
git commit -m "feat: add minimal MVP playtest telemetry"
git push
```

---

### Lesson 8.2 — Production Point review prep

Goal:

Prepare the evidence package for deciding whether to continue, cut, or rework.

Cursor prompt:

```text
Use the learning-coach skill.

Lesson: prepare Production Point review package.

Important: write the package into docs/production-point/README.md.

Goal:
- Summarize what the MVP slice currently proves.
- List what is fun or promising.
- List what is confusing or weak.
- List bugs and technical risks.
- Compare implementation to design-docs/MVP_SCOPE_REFERENCE.md.
- Recommend one of:
  1. continue deeper
  2. rework core loop
  3. cut scope
  4. pause project

Do not add features in this lesson.
```

Verification:

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter web build
```

Commit:

```bash
git add docs/production-point
git commit -m "docs: prepare production point review"
git push
```

GPT 5.5 Review gate:

Required. Paste this to Hermes/GPT-5.5 xHigh:

```text
GPT 5.5 Production Point Review for async-frontier-mmo.

Please review:
- design-docs/MVP_SCOPE_REFERENCE.md
- design-docs/DESIGN_BIBLE.md
- design-docs/DECISION_LOG.md
- docs/production-point/README.md
- current code state

Question:
Has the MVP answered whether the core toy is fun enough to continue?

Be strict. Recommend continue, rework, cut scope, or pause. Include evidence and exact next step.
```

---

## 5. When to add packages/jobs

Do not add `packages/jobs` just because it sounds architecturally complete.

Add jobs only when there is a real autonomous world process that must happen without a user request.

Jobs are appropriate later for:

- resolving abandoned thumper runs under conservative fallback
- periodic resource bloom rotation
- scheduled world events
- notification batches
- cleanup of expired sessions/runs
- playtest telemetry rollups

Jobs are not needed for:

- displaying countdown
- deciding if a thumper is claimable
- preventing early claim
- preventing double claim
- deriving active/claimable/already claimed from stored timestamps

Principle:

```text
If the answer can be derived from stored facts, derive it.
Do not create background infrastructure just to update derived state.
```

When Cursor suggests jobs, use this response:

```text
Not yet. First prove the personal Red Mesa loop. Jobs come later only when the world needs to progress without a user request. For now, derive state from deployed_at, duration_seconds, claimed_at, event choices, and now.
```

---

## 6. Code review checklist for every GPT 5.5 Review gate

Ask GPT-5.5 xHigh to check these every time:

### Scope

- Does this stay inside Decisions 001–015?
- Did we add any post-MVP feature accidentally?
- Does this strengthen the core toy?

### Architecture

- Is domain pure?
- Is DB logic isolated?
- Is SvelteKit server authoritative?
- Is client code presentation only?
- Are jobs/WebSockets avoided unless truly needed?

### Economy safety

- Can any reward be duplicated?
- Are resource mutations audited?
- Are claim/craft/repair actions transactional where needed?
- Are resource stats immutable after discovery?

### Learning quality

- Was the lesson written to markdown?
- Did Cursor explain before editing?
- Did Cursor include likely questions with answers instead of stopping for answers?
- Did tests fail first for domain behavior changes?

### Verification

- Did domain tests pass?
- Did `pnpm check` pass?
- Did web build pass when UI changed?
- Did DB smoke/migrations pass when DB changed?

---

## 7. If Cursor starts going too broad

Paste this:

```text
Stop. This is scope creep.

Return to the locked MVP:
survey → thump → claim → think-craft → equip/use → wear/repair → survey better.

Do not add marketplace, chat, guilds, group thumpers, multiple regions, jobs, WebSockets, public helper boards, monetization, weapons, armor suits, factories, refining, or broad MMO infrastructure.

Write a short note explaining why your suggested change is outside MVP, then propose the smallest next step that strengthens the locked core toy.
```

---

## 8. If Cursor edits before teaching

Paste this:

```text
Stop and reset the workflow.

You edited before teaching. For this project, follow learning-coach mode:
1. Explain first.
2. Write durable markdown lesson.
3. Include likely questions with answers.
4. Continue without waiting for answers.
5. Include a self-check of the reasoning.
6. Apply code after the explanation unless Ryan explicitly says to stop.

Do not continue editing until you have written the lesson explanation and likely Q&A section.
```

---

## 9. Next immediate action

Because this file was created after a tool-backed review, the next practical step is:

```text
Lesson 0.1 — Commit the current reviewed learning scaffold
```

Start by pasting the Lesson 0.1 prompt into Cursor.

After Cursor proposes commit groups, run:

```bash
cd ~/development/async-frontier-mmo
git status --short
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:smoke
pnpm --filter web build
```

Then commit in logical groups and ask for a GPT 5.5 Review before Phase 1.