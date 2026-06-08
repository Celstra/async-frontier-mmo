# Tech Stack + Infrastructure Cost Plan

> Purpose: Choose an end-product-oriented stack for the async frontier MMO learning project while designing around low infrastructure cost, low rewrite risk, and server-authoritative multiplayer/economy correctness.

---

## 1. Ryan's concern

Ryan said the stack should focus on the eventual end product so we do not rewrite a bunch of things. We also need to consider costs at scale early: server costs, traffic that actually hits infrastructure, and how design choices affect cost.

This is the right concern. For this project, the cheapest architecture is not just a cheap host. It is a game design and data model that avoid expensive traffic patterns.

---

## 2. Core recommendation

Build the first real app as a **web-first, server-authoritative, modular monolith**:

```text
SvelteKit web/PWA client
  -> TypeScript server actions/API
  -> PostgreSQL database
  -> Postgres-backed job queue / scheduled worker
  -> object/static asset storage behind CDN
```

Short version:

> TypeScript + SvelteKit + Postgres + Drizzle + Docker, deployed first as a single VPS/modular monolith.

This keeps the stack close to the eventual product while avoiding premature distributed systems.

---

## 3. Why web/PWA first

The end product is Farm RPG-like: menu/text-first, async, persistent, pixel-art-enhanced. That fits the web extremely well.

Advantages:

- One client works on desktop and mobile browser.
- PWA can feel app-like without App Store complexity at first.
- No need for Godot/native client rewrite for menus, forms, inventory, crafting tables, and chat-like interfaces.
- Static pixel art can be cached aggressively.
- Web UI iteration is fast.
- If mobile apps are desired later, the same app can be wrapped with Capacitor or a thin native shell.

### Godot note

Godot is still useful for learning and future experiments, but it should not be the primary client for this MVP unless the game becomes much more visual/interactive than currently planned.

For a low-cost async text/pixel MMO, a web app is the likely end-product shape. Godot would add client complexity without reducing server cost.

---

## 4. Why a modular monolith

A modular monolith means one deployable app, but clean internal boundaries:

```text
/apps/web        SvelteKit UI + server endpoints
/packages/domain pure game rules: survey, thumpers, crafting, economy math
/packages/db     schema, migrations, typed queries
/packages/jobs   scheduled workers / queues
/packages/shared shared types/utils
```

This avoids early microservices while still preventing a messy ball of code.

Benefits:

- Lowest operational cost.
- Easier debugging.
- Fewer moving parts.
- Server-authoritative actions are simple.
- Easier to test domain logic without the UI.
- Can split services later if needed, but probably will not need to for a long time.

---

## 5. Recommended stack

### Language

**TypeScript**

Reason:

- One language across client, server, validation, and shared types.
- Strong learning value for modern web apps.
- Good ecosystem for SvelteKit, Drizzle, Zod/Valibot, testing, and deployment.

### Frontend

**SvelteKit**

Reason:

- Excellent for lightweight interactive apps.
- Easier mental model than many heavier React stacks.
- Can do SSR, form actions, API routes, and static assets.
- Good fit for inventory/crafting/menu-heavy UI.

Alternative: Next.js is viable, but SvelteKit is lighter and more pleasant for this kind of app.

### Backend

**SvelteKit server routes/actions initially**, with domain logic in separate packages.

Reason:

- Avoid building two apps before we need to.
- Still keep `/packages/domain` independent so we can extract an API later if necessary.

If the API grows, add **Fastify** or **Hono** later without rewriting core game rules.

### Database

**PostgreSQL**

Reason:

- Strong transactional guarantees.
- Great fit for ledgers, inventory, resources, crafting, trade, and auditability.
- JSONB available for flexible event payloads, but relational tables for important economy state.
- Scales much further than the MVP needs.

### ORM / query layer

**Drizzle ORM**

Reason:

- SQL-shaped, typed, migration-friendly.
- Less magical than Prisma.
- Good for learning real relational modeling.

### Validation

**Zod or Valibot**

Reason:

- Validate all server actions/API inputs.
- Share schemas between UI and server where useful.

### Jobs / scheduled work

Start with **Postgres-backed jobs**, not Redis.

Examples:

- resource spawn rotation
- thumper event resolution
- durability/wear processing
- daily contracts
- cleanup tasks

Implementation options:

- simple `jobs` table with `run_at`, `locked_at`, `attempts`
- worker loop using `FOR UPDATE SKIP LOCKED`
- cron/systemd timer or app-side worker process

Only add Redis/BullMQ/Temporal/etc. if Postgres jobs are insufficient.

### Realtime

Do **not** start with realtime.

Use:

- normal HTTP requests for actions
- polling for event status
- ETags/cache headers where useful
- server timestamps for thumper timers

Add SSE/WebSockets later only for:

- chat
- live public events
- notifications
- marketplace updates

Realtime is expensive because it keeps connections open and complicates scaling. An async MMO should avoid it until the design proves it is necessary.

### Assets

- Pixel art in repo during MVP.
- Optimize as PNG/WebP.
- Use spritesheets where practical.
- Serve through CDN/static hosting.
- Cache aggressively with fingerprinted filenames.

### Auth

Start simple:

- email magic link or username/password
- session cookies
- one provider later if desired

Potential libraries:

- Better Auth
- Auth.js
- or hand-rolled minimal auth if learning goal favors understanding sessions

Avoid complex OAuth/social login in the MVP.

### Testing

- Vitest for domain logic.
- Playwright for one or two critical UI flows.
- Migration tests for schema changes.
- Property-style tests for economy invariants later.

Important tests:

- inventory never goes negative
- thumper output never exceeds node cap
- crafting consumes exact inputs
- ledger and inventory stay in sync
- repeated claim is idempotent

---

## 6. Hosting path

### Phase 0: local development

```text
Docker Compose:
- app
- postgres
- optional local object store later
```

Use local migrations and seed data.

### Phase 1: cheapest real deployment

Single VPS:

```text
Caddy / reverse proxy
SvelteKit Node app
PostgreSQL
worker process
nightly database backup
```

This is probably the lowest-cost “real product” shape for a small async game.

Good candidates:

- Hetzner VPS if available/comfortable.
- Fly.io/Render/Railway if convenience matters more than absolute lowest cost.
- Supabase for managed Postgres if avoiding DB ops is worth the monthly cost.

### Phase 2: split managed database only when needed

When backups, reliability, or load justify it:

```text
App server(s)
Managed Postgres
Object storage/CDN
```

### Phase 3: scale selectively

Only split what is actually hot:

- static assets to CDN
- read-heavy public pages cached
- worker moved to separate process
- Redis only for hot cache/rate limits
- managed queue only if Postgres jobs become bottleneck

---

## 7. Current public pricing signals checked

These numbers change, so treat them as directional, not permanent commitments.

### Cloudflare Workers

Cloudflare Workers docs currently state:

- Workers Free plan exists with limited Workers/Pages Functions/KV/Hyperdrive usage.
- Workers Paid has a minimum charge of **$5 USD/month**.
- Docs state no additional charges for data transfer/egress or throughput/bandwidth on Workers pricing.
- Cloudflare D1 Free/Paid limits include daily/monthly row-read/write and storage allowances.

Source: https://developers.cloudflare.com/workers/platform/pricing/

### Supabase

Supabase pricing page currently states:

- Free plan includes 500 MB database, 5 GB egress, 1 GB file storage, and free projects may pause after inactivity.
- Pro starts from **$25/month** with larger included disk/egress/storage and daily backups.

Source: https://supabase.com/pricing

### Fly.io

Fly.io docs currently emphasize pay-as-you-go resource pricing for machines, volumes, bandwidth, and support. Legacy free allowances exist only for older organizations/plans, not something to design around.

Source: https://fly.io/docs/about/pricing/

### Hetzner

Hetzner Cloud is usually attractive for low-cost VPS hosting, but the dynamic pricing page is harder to scrape reliably. It should be evaluated manually when choosing the first deployment target.

Source: https://www.hetzner.com/cloud/

---

## 8. Cost-design principles

The biggest cost wins come from product/architecture decisions.

### 8.1 Avoid per-second simulation

Bad:

```text
Every active thumper ticks every second and writes state.
```

Good:

```text
Store start time, loadout, node, and event seed.
Resolve on claim or scheduled checkpoints.
```

For most thumper events, compute elapsed progress from timestamps instead of writing every tick.

### 8.2 Avoid realtime by default

Bad:

```text
Thousands of open WebSocket connections for timers and inventory updates.
```

Good:

```text
Client polls event status occasionally or receives updates only after actions.
```

### 8.3 Cache static and mostly-static data

Static or cacheable:

- pixel art
- item icons
- recipe definitions
- resource family definitions
- zone descriptions
- public changelogs/news

Do not hit Postgres for recipe definitions on every request if they rarely change.

### 8.4 Keep economy writes intentional

Write on meaningful events:

- survey performed
- thumper deployed
- thumper claimed
- craft completed
- item repaired
- trade completed

Avoid writes for:

- every second of a timer
- every hover/view
- every UI refresh
- every small animation/frame

### 8.5 Ledger all economy mutations

Every resource/item change should be traceable.

```text
inventory_transactions
- id
- player_id
- item/resource id
- quantity delta
- reason
- related_entity_id
- created_at
```

This is both good coding practice and protection against dupes/exploits.

### 8.6 Make actions idempotent

Expensive bugs in multiplayer economies often come from duplicate requests.

Examples:

- claim thumper twice
- craft twice after one click
- trade completes twice

Use idempotency keys or unique constraints around action resolution.

### 8.7 Design for cheap reads

For player dashboards, store compact snapshots where useful:

- current inventory stack totals
- active thumper status
- player frame/loadout

Keep the ledger for audit; use current-state tables for fast UI.

### 8.8 Delay global chat

Chat creates moderation cost, storage cost, abuse risk, and realtime pressure.

For MVP, use:

- no chat
- or local dev-only chat
- or announcement feed only

Add communication tools after the game loop is proven.

---

## 9. Suggested initial schema domains

### Accounts / players

- users
- sessions
- players
- player_frames
- player_loadouts

### World/resources

- worlds
- zones
- resource_families
- resource_instances
- resource_spawn_locations
- survey_logs

### Thumpers/events

- thumper_frames
- thumper_components
- player_thumpers
- thumper_events
- thumper_event_actions
- thumper_event_results

### Inventory/economy

- inventory_stacks
- inventory_transactions
- item_instances
- durability_events

### Crafting

- recipes
- recipe_inputs
- crafted_item_defs
- crafting_jobs

### Admin/content

- content_versions
- balance_configs
- admin_audit_log

---

## 10. End-product compatibility

This stack can grow into the eventual product without a full rewrite if we keep boundaries clean.

### Can support later

- PWA/mobile wrapper
- player marketplace
- group thumpers
- contracts/dailies
- admin content tools
- analytics dashboards
- seasonal events
- supporter purchases later
- chat later

### What would require a bigger rethink

- realtime action combat
- thousands of simultaneous live map avatars
- twitchy PvP
- 3D client-first MMO simulation

Those are intentionally not the product direction right now.

---

## 11. Architecture for the first vertical slice

```text
Browser/PWA
  SvelteKit pages/forms
  minimal pixel-art UI

SvelteKit server
  validates action
  calls domain functions
  writes transactionally to Postgres

Domain package
  survey math
  thumper resolution
  crafting formulas
  durability formulas
  economy invariants

Postgres
  authoritative state
  ledger
  jobs
  config tables

Worker
  scheduled resource rotations
  optional thumper timeout resolution
  cleanup/backups
```

---

## 12. Recommendation

Start with:

```text
pnpm workspace
SvelteKit
TypeScript
PostgreSQL
Drizzle ORM
Zod/Valibot
Vitest
Playwright
Docker Compose
Caddy for deployment
```

Deploy first as:

```text
single VPS + Docker Compose + Postgres + nightly backups
```

Keep Cloudflare in front for DNS/CDN/assets if desired.

The key is not to choose “toy prototype tech” that gets thrown away. But also do not choose “future enterprise MMO tech” that slows learning.

The right middle path is:

> A production-shaped modular monolith: boring enough to finish, clean enough to grow, cheap enough to run, and server-authoritative enough for a multiplayer economy.
