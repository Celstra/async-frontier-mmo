# Build Plan — MVP Vertical Slice, Tech Stack, and Stage 1 Results

> Merges the former `MVP_VERTICAL_SLICE_PRODUCTION_POINT_PLAN.md` and `TECH_STACK_AND_INFRA_COST_PLAN.md`, plus the executed Stage 1 paper-test results. Locked decision text lives ONLY in `DECISION_LOG.md`; this file references decisions by number instead of duplicating them.

---

# PART A — Vertical Slice + Production Point Plan

## 1. Current question

Ryan asked:

- SWG had a risk: combat-focused players disliked that only crafted items were the best. Do we need to consider that here?
- Why have different player frames if only crafted gear matters?
- What does the MVP look like, based on the Production Point approach?
- What is the first vertical-slice gameplay loop we can tune until it is repeatable and fun before adding another loop?
- How do we move slowly, layer fun step by step, reach the production point, and only then switch gears to content?

---

## 2. Production Point interpretation for this project

The project is not ready for production just because the fantasy has potential.

Per the Production Point framing, the dangerous trap is committing at the **potential point**: the moment when the idea sounds exciting but the major uncertainties are still unresolved.

For this project, the production point is reached only after a small playable slice proves:

1. The core toy is fun with tiny content.
2. The loop can repeat without feeling like chores.
3. The UI makes resource quality and crafting outcomes understandable.
4. The pixel/menu presentation sells the fantasy.
5. The system can be tuned with data rather than guesses.
6. The scope is known enough that adding content is mostly production work, not constant redesign.

Until then, we are in **pre-production**.

---

## 2A. Locked decisions summary

Decisions 001–015 now lock the MVP to:

- 1 Red Mesa region.
- 3 frames: Recon, Engineer, Vanguard.
- 3 resource families and 5 MVP stats using a 1–1000 internal stat scale.
- 6 named resources in the first Red Mesa Bloom with exact prototype stats locked by Decision 010.
- 3 thumper components: Drill, Pump, Hull.
- 4 event actions and 4 complication types.
- 5 craftable outputs.
- A thinking-craft flow with named-resource slot choice, property preview, exactly 3 tuning points, Safe Craft / Careful Experiment, and a result explanation. Resource stats set the base/ceiling; tuning only allocates and risks that potential.
- No mandatory refining step in the MVP.
- Six UI screens and one required first click-path.
- Decision 011 first-session path: frame choice → three-signal survey → recommended Veyrith Copper thump → Signal Drift + Pump Strain → claim enough Veyrith Copper → craft Survey Scanner Module Mk I → equip → see a clearer second survey.
- 0–100 crafted property scores, transparent recipe weights, 5% relative tuning per point, and bounded Careful Experiment variance.
- A server-authoritative MVP data/economy ledger with explicit records for resources, stacks, crafted item provenance, crafting attempts, thumper runs, event windows, run results, repair actions, and economy mutations.
- Decision 013 success metrics/playtest instrumentation: first-session funnel, resource/crafting comprehension, voluntary repeat behavior, event-action comprehension, durability/repair trust, economy-ledger correctness, and friction/confusion notes.
- Decision 014 prototype ladder: paper/spreadsheet economy prototype → text-only loop prototype → clickable single-player vertical slice → instrumented playtest build → presentation pass → production-point review.
- Decision 015 final scope freeze: Decisions 001–014 define the MVP; new ideas go to backlog unless they fix contradictions, unblock the prototype ladder, improve comprehension, protect economy trust, or are required for playtest evidence.

**Slice implementation note (2026-06):** The four-screen terminal slice (`FIELD`, `SETTLEMENT`, `WORKSHOP`, `RIG`) and `FIRST_THUMP_SLICE_SPEC.md` / Decision 022 supersede the older Decision 008 six-screen list, Decision 011 frame-choice / Veyrith-first-session script, and Decision 013 playtest event names for **new** implementation work. Locked economy/schema decisions (001–007, 010, 012, 016–021) still apply; historical `playtest_events` rows remain, but emitters follow `SLICE_FUNNEL_EVENTS` in `packages/db/src/playtest/eventNames.ts`. Build order: `design-docs/SLICE_IMPLEMENTATION_PLAN.md`.

Future direction if the toy is fun: preserve the long-term SWG-inspired loop of finding the right named resource with the right stats before it disappears, then using it intelligently in schematics. Tuning must never erase the market value of rare named resources. Refining, Chemical Purity, separators, resource archives, markets, factories, and group thumpers are later layers, not MVP requirements.

---

### Decision 007 clarification — resource quality sets the ceiling

Crafting tuning is an expression/allocation layer, not a resource-upgrading layer.

```text
Resource stats set the potential and ceiling.
Tuning chooses where that potential goes.
Experimentation tests how cleanly the craft reaches that potential.
```

A high-Conductivity resource such as Veyrith Copper should remain economically valuable because it naturally enables stronger Conductivity-driven outcomes. A low-Conductivity resource can be tuned toward a Conductivity property, but it cannot become equivalent to Veyrith Copper. This preserves stockpiling, market value, provenance, and the future SWG-inspired loop of finding the right named resource before it disappears.

---

## 3. The core toy

The core toy should not be “an MMO.” It should be this:

```text
Find a promising resource signal
  -> choose how to extract it
  -> survive/manage the thumper event
  -> turn the resource into a better tool/module
  -> use that better tool/module to find or extract better resources
  -> item wear creates a reason to repeat
```

Short form:

> Survey → thump → craft → equip/use → decay → survey better.

If this toy is not fun with one zone, six named resources, three frames, and five recipes, adding planets, guilds, cities, PvP, story, or monetization will not save it.

---

## 4. Crafted-best vs combat-player problem

### 4.1 The SWG risk

The SWG risk is real: if the best functional items are always crafted, combat-focused players can feel like their playstyle is merely feeding crafters or buying from them. They may miss the classic adventure reward pattern:

- kill something dangerous
- find something exciting
- equip it
- feel stronger or cooler

A pure crafted-only economy can make combat feel unrewarding if enemies only drop generic crafting inputs.

### 4.2 Recommended solution

Do **not** make this a binary choice between “crafted gear matters” and “combat loot matters.”

Use this split:

```text
Best reliable functional performance = crafted
Best discovery/trophy/exotic unlocks = exploration/combat/events
Best long-term identity = frame + crafted loadout + provenance
```

This preserves the SWG economy while giving combat/exploration players rewards that feel exciting.

### 4.3 What combat/events should reward

Combat or event participation should produce rewards that do not destroy the crafting economy:

- rare salvage
- trophy components
- cosmetic skins
- frame decals/colors
- blueprint fragments
- special affixes/mod patterns
- enemy research data
- faction reputation
- titles/badges
- unstable prototype parts that must be finished by crafters
- temporary boosters/consumables

The key is that combat can find the **spark**, but crafting turns it into the **reliable tool**.

Example:

```text
A swarm queen event drops “Chitinous Harmonic Plate.”
It is not a finished best-in-slot hull.
A crafter uses it with high-Hardness alloy to craft a quiet anti-swarm hull plate.
The combat player feels rewarded; the crafter/economy still matters.
```

---

## 5. Why frames matter if gear is crafted

Frames should not be simple stat sticks. They should define **verbs**, **efficiencies**, and **constraints**.

A frame answers:

- What actions are you naturally good at during a thumper event?
- Which event problems can you solve cheaply?
- What gear/modules do you want?
- Which resources are valuable to you?
- What role do other players expect you to fill?

### 5.1 Frame design rule

Frames provide base identity and action modifiers. Crafted modules tune, specialize, and temporarily push that identity.

```text
Frame = durable role / verb package
Crafted modules = economic expression / tuning / optimization
Loot/event rewards = unlocks, trophies, cosmetics, rare ingredients
```

This prevents crafted gear from making frames irrelevant.

### 5.2 MVP frame set

For the first vertical slice, use **three frames**. Do not add more until these are meaningfully different.

| Frame | Fantasy | Core thumper event verbs | Resource/crafting demand |
|---|---|---|---|
| Surveyor / Recon Frame | Finds and reads the frontier | Scan, mark weak signal, predict threats, improve survey accuracy | Sensors, signal boosters, lightweight electronics |
| Engineer / Rig Frame | Keeps machinery alive | Repair hull, tune pump, stabilize drill, reduce waste | Toolkits, repair drones, pump parts, stabilizers |
| Defender / Vanguard Frame | Handles danger | Suppress swarm, guard perimeter, reduce thumper damage | Armor plates, field batteries, weapon components |

Important: in the MVP, these can be mechanically simple. They do not need deep combat.

### 5.3 MVP frame differences

Each frame gets one passive and one event action.

#### Recon

- Passive: +survey clarity / sees one extra resource clue.
- Event action: **Signal Tune** — improves resource integrity or lowers surprise-complication chance.

#### Engineer

- Passive: repairs are more efficient / reduced thumper wear.
- Event action: **Field Repair** — restores hull or clears pump instability.

#### Vanguard

- Passive: reduces threat damage to thumper.
- Event action: **Suppress Threat** — lowers current threat or prevents the next damage tick.

These verbs matter even if all modules are crafted.

---

## 6. First vertical slice: one repeatable loop

The first vertical slice should be a tiny layer cake: gameplay, UI, art style, theme, and feedback all present, but with very little content.

### 6.1 Slice premise

```text
Red Mesa is experiencing the first seeded **Red Mesa Bloom**.
Players survey the zone, compare named resource signals, deploy basic thumpers, manage small complications, craft better survey/thumper modules through a small optimization puzzle, and repeat until the resource bloom expires.
```

### 6.2 Included content

Keep this extremely small and aligned to Decisions 001–011:

- 1 planet/frontier world: placeholder name TBD.
- 1 zone: **Red Mesa**.
- 3 frames: **Recon**, **Engineer**, **Vanguard**.
- 3 resource families:
  - **Conductive Metal**.
  - **Structural Alloy**.
  - **Reactive Crystal**.
- 6 named resources in the first **Red Mesa Bloom**:
  - **Keth Iron**.
  - **Red Mesa Conductive Slag**.
  - **Asterion Frame Alloy**.
  - **Pale Ember Crystal**.
  - **Veyrith Copper**.
  - **Thornwake Crystal**.
- 5 resource stats:
  - **Overall Quality / OQ**.
  - **Conductivity**.
  - **Hardness**.
  - **Heat Resistance**.
  - **Malleability**.
- 1 survey tool/action.
- 1 basic personal thumper.
- 3 thumper component slots:
  - **Drill**.
  - **Pump**.
  - **Hull**.
- 4 thumper event actions:
  - **Signal Tune**.
  - **Field Repair**.
  - **Suppress Threat**.
  - **Clear Pump Problem**.
- 2 thumper event windows by default; high-risk/push runs can have up to 3.
- 5 craftable items:
  - **Basic Drill Head**.
  - **Efficient Pump**.
  - **Reinforced Hull Plate**.
  - **Survey Scanner Module Mk I**.
  - **Field Repair Kit**.
- MVP crafting interaction:
  - choose schematic;
  - fill named-resource slots;
  - preview weighted item properties;
  - spend exactly **3 tuning points**;
  - choose **Safe Craft** or **Careful Experiment**;
  - craft;
  - read the result explanation.
  - resource stats set the base and effective ceiling/range;
  - tuning points allocate emphasis between property lines, not input-resource quality;
  - crafted properties display as 0–100 scores;
  - tuning points give +5% relative expression per point.
- 1 durability/condition/integrity system.
- 1 lightweight event complication table:
  - **Signal Drift** → Signal Tune.
  - **Hull Damage** → Field Repair.
  - **Threat Surge** → Suppress Threat.
  - **Pump Strain** → Clear Pump Problem.
- 6 MVP screens:
  - **Pilot Home**.
  - **Red Mesa Survey**.
  - **Signal Detail / Deploy Thumper**.
  - **Thumper Run / Event Window**.
  - **Claim Results**.
  - **Crafting + Gear / Repair**.

### 6.3 Not included

Do not include yet:

- multiple planets
- cities
- guilds
- chat/social moderation
- player marketplace
- monetization
- PvP
- deep combat builds
- public combat distress board / live helper matchmaking
- full group thumpers
- long crafting tree
- dozens of stats
- mandatory refining step
- refining station UI
- factory/batch crafting
- mobile wrapper


### 6.4 Future resource/crafting direction if the toy is fun

The long-term SWG-inspired resource/crafting loop should remain:

> Find the right named resource with the right stats before it disappears, then use it intelligently in schematics.

Future iterations can add irregular multi-day resource lifespans, historical scarcity, provenance, resource archives, tradeable survey intel, separators, refiners, byproducts, contamination, Chemical Purity, factory/batch crafting, and player brands — but only if they strengthen the core toy rather than adding mandatory chores.

---

## 7. Minute-to-minute / session loop

A 5–10 minute test session should look like:

```text
1. Choose frame.
2. Survey Red Mesa.
3. See 2–3 possible signals.
4. Pick a signal based on concentration, quality hints, and threat.
5. Deploy personal thumper.
6. Resolve 2 event windows by default, or up to 3 in a high-risk/push run.
7. Resolve output: resource gained, thumper condition changed, maybe salvage gained.
8. Choose a schematic, fill named-resource slots, preview properties, spend 3 tuning points, then Safe Craft or Careful Experiment.
9. Equip the new item or apply a Field Repair Kit.
10. Repeat and notice that the next run is different/better/riskier.
```

### Example run

```text
Ryan chooses Recon.
Survey finds:
- 64% Keth Iron, low threat
- 82% Veyrith Copper, medium threat, high Conductivity hint

Ryan deploys a basic thumper on Veyrith Copper.
Event window 1: Pump Strain. Ryan holds because Pump Flow is still acceptable.
Event window 2: Signal Drift. Recon uses Signal Tune to preserve Signal Lock.
Thumper returns 118 Veyrith Copper with high Conductivity.
Ryan chooses the Survey Scanner Module Mk I schematic, fills the Conductive Metal slot with Veyrith Copper, previews Survey Clarity / Stat Hint Accuracy / Signal Range, spends 3 tuning points, and chooses Safe Craft. Veyrith Copper's Conductivity is the primary quality source; the tuning points decide which scanner property receives that available quality.
Next survey shows clearer stat hints and deeper signal range.
The scanner loses 3 Condition after meaningful use.
```

That is enough to test whether the toy works.

---

## 8. Locked MVP crafting interaction

MVP crafting is not a drag/drop/click conversion. Each of the five locked recipes uses the same thinking-craft flow:

```text
Choose schematic
→ fill resource-family slots with named resources
→ preview weighted output properties
→ spend exactly 3 tuning points
→ choose Safe Craft or Careful Experiment
→ produce the item
→ show why the result happened
```

**Safe Craft** is predictable, has no flaw chance, and has a lower ceiling.

**Careful Experiment** has modest upside, a small flaw chance, and no catastrophic loss in the MVP.

The MVP has no mandatory refining step. Extracted named resources can go directly into schematics. Refining is deferred until it can create meaningful choices instead of a waiting-bar tax.

### Resource primacy inside MVP crafting

Decision 009 locks the relationship between resources and tuning:

- Resource quality/stat fit is the primary power source and practical ceiling.
- Tuning allocation decides which property lines receive the crafter's effort.
- Safe Craft / Careful Experiment creates bounded item-result variance inside that potential.
- Tuning never mutates the named resource stack and never turns poor resources into rare-resource equivalents.

Example: Veyrith Copper's very high Conductivity should make it genuinely better for Conductivity-weighted Survey Scanner and Pump properties. Tuning points can express that advantage, but the same tuning points on low-Conductivity material should not produce an equivalent item.

---


## 9–13. Locked specifications (see DECISION_LOG.md)

The UI proof and first click-path (Decision 008), resource primacy guardrail (Decision 009), stat scale / recipe weights / output ranges (Decision 010), onboarding and first-session script (Decision 011), and data model / economy ledger (Decision 012) are specified in full in `DECISION_LOG.md`. Two Decision 010 weight amendments are PROPOSED as Decision 016 following the Stage 1 paper test (Part C below).

## 14. Tuning variables for the vertical slice

The MVP should expose a small number of tuning knobs:

### Survey tuning

- number of signals shown
- concentration spread
- stat hint accuracy
- cost per survey
- chance to reveal threat type

### Thumper tuning

- extraction duration
- output amount
- recovery efficiency
- hull damage per threat tick
- complication chance
- early recall penalty

### Crafting tuning

- resource stat weighting
- resource-derived property ceilings
- tuning-point contribution size
- Safe Craft vs Careful Experiment variance range
- recipe input costs
- output stat clarity
- durability range
- repair cost

### Frame tuning

- action strength
- action cooldown/cost
- passive bonus size
- when each frame feels useful

### Economy tuning

- resource spawn duration
- total expected output per player per day
- item durability loss rate
- craft/repair sink size

---

## 15. Success criteria before adding a second loop

Do not add another major loop until this one passes playtests.

The slice is promising if playtesters say or demonstrate:

1. “I want to survey one more time.”
2. “That resource is good for this recipe.”
3. “I understand why this crafted module is better.”
4. “I care that my module is wearing down, but I’m not angry about it.”
5. “I would choose a different frame for a different goal.”
6. “I can see why helping a thumper event later would be useful.”
7. “The pixel/menu presentation makes the world feel cooler than a spreadsheet.”

### Quantitative guardrails

Track:

- time to first successful survey
- time to first thumper claim
- time to first craft
- number of repeated loops in one session
- whether players compare resource stats without being prompted
- whether players can explain their frame choice
- confusion points in UI
- moments where players stop because they are bored vs waiting

---


## 16–18. Metrics, prototype ladder, and definition of done (see DECISION_LOG.md)

Success metrics and playtest instrumentation are Decision 013; the six-stage prototype ladder and build order are Decision 014; the MVP definition of done and scope freeze are Decision 015. The proposed MVP time model needed before Stage 2 is Decision 017 (PROPOSED).

## 19. Production point checklist

The game reaches the production point only when the following are true:

### Core fun

- The survey → thump → craft → equip/use → decay loop is repeatable and fun with tiny content.
- Players repeat the loop voluntarily, not just because the test asks them to.
- At least one frame choice feels meaningfully different.

### Comprehension

- Players understand resource quality without reading a manual.
- Players understand why a crafted output is better/worse.
- Players understand decay/condition and do not feel blindsided.

### Scope

- The next content additions are obvious production work: more resources, recipes, zones, events, art, and UI polish.
- Major system design is not changing every session.
- The project has a clear content pipeline.

### Technical

- Server-authoritative actions work.
- Inventory/economy ledger is reliable and follows Decision 012 records.
- Thumper events resolve predictably and can be audited.
- Data is tunable without code rewrites.

### Presentation

- Pixel/menu art direction is good enough to communicate the fantasy.
- UI is readable.
- Event feedback is satisfying enough for a text-first game.

If these are not true, stay in pre-production.

---

## 20. Layering plan after the first loop works

Only after the first loop is proven:

### Layer 2: Public combat distress board

Add this before full group thumpers if the single-player thumper loop is fun and the Vanguard/combat verb needs a social home. The board should surface combat/threat events from active thumper runs to online players who want short, active play.

Guardrails:

- helpers can suppress, distract, defend, scout threats, fortify perimeter, or recover combat salvage;
- helpers cannot overdrive the drill, push deeper, spend the owner's repair kits, recall the thumper, abandon cargo, or make other owner equipment-risk decisions;
- the owner keeps the site/loadout/doctrine/repair/recall/extraction decisions;
- if nobody helps, the event resolves by owner doctrine instead of pausing or punishing absence;
- helper rewards lean toward combat salvage, trophy components, faction rep, badges, and small payouts, not duplicated rare node output.

### Layer 3: Group thumpers

- public thumper beacons / posted event contracts
- helper actions with explicit permissions
- contribution tracking
- owner reserve
- capped node yield with recovery-efficiency scaling

### Layer 4: Contracts / NPC requests

- daily faction needs
- delivery requests
- repair orders
- resource bounties

### Layer 5: Marketplace / player economy

- buy/sell resources
- crafter listings
- item provenance
- price history

### Layer 6: More world texture

- additional zones
- enemy factions
- rare event chains
- light story
- cosmetics/trophies

### Layer 7: Monetization discussion

Only after retention and trust exist.

---

## 21. Recommendation

The MVP should not be “Farm RPG plus Firefall plus SWG.”

The MVP should be:

> A tiny playable extraction-crafting toy where frame choice, resource quality, thumper risk, crafting output, and item wear all connect in one repeatable loop.

If that is fun, the game has a spine. If it is not fun, no amount of MMO content will fix it.


---


---

# PART B — Tech Stack + Infrastructure Cost Plan

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
economy_ledger
- id
- pilot_id
- event_type
- source_type
- source_id
- resource_stack_id
- item_id
- quantity_delta
- condition_delta
- integrity_delta
- metadata_json
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

These are broad implementation domains. Decision 012 below is the locked MVP record list.

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


## 9A. Decision 012 — Locked MVP Data Model / Economy Ledger

Decision 012 supersedes the looser schema-domain sketch above for the MVP. The physical table names can vary, but the first vertical slice must preserve these authoritative records and audit guarantees.

Locked MVP records:

- **Pilot** — player identity and selected frame.
- **Resource Instance** — named resource in a bloom with immutable OQ, Conductivity, Hardness, Heat Resistance, and Malleability.
- **Resource Stack** — pilot-owned quantity of a resource instance; same pilot + same resource instance combines.
- **Item** — crafted/equipped object with Condition, Integrity, property scores, and provenance.
- **Schematic Definition** — versioned game data for recipe slots, property lines, weights, and tuning lines.
- **Crafting Attempt** — selected resources, consumed quantities, tuning, craft mode, base/tuned/final scores, flaw result, and output item.
- **Thumper Run** — target resource, equipped Drill/Pump/Hull, run mode, visible state, status, and timing.
- **Thumper Event Window** — complication, response, result, and before/after state.
- **Thumper Run Result** — recovered quantity, waste/scrap, salvage, component wear, hull damage, Integrity delta, and explanation.
- **Repair Action** — target item, repair kit, before/after Condition and Integrity, repair properties, and explanation.
- **Economy Ledger** — append-style record of every resource, item, condition, and integrity mutation.

Implementation guardrails:

- Use Postgres transactions for claim, craft, repair, and item-equip flows.
- Use idempotency keys or unique constraints around claim/craft/repair resolution.
- Keep current-state tables for fast UI, but keep the ledger for audit.
- Keep flexible JSONB for event snapshots, provenance, salvage details, and result explanations, but keep ownership, quantities, and deltas relational.
- Do not add marketplace, trade, group contribution accounting, factories, refiner/separator tables, guilds, chat, settlement, or monetization tables for MVP.

## 9B. Decision 013 — MVP Telemetry and Playtest Instrumentation

Decision 013 locks what the first vertical slice must measure. This is not a growth-analytics system and not monetization tracking. It is prototype evidence for whether the core toy is understandable, repeatable, and trustworthy.

### Required MVP event stream

Track first-session funnel events:

```text
frame_chosen
first_survey_started
first_survey_completed
signal_compared
veyrith_copper_recommended
target_signal_selected
thumper_deployed
event_window_1_resolved
event_window_2_resolved
thumper_claimed
resource_claimed
schematic_opened
resource_slots_filled
tuning_points_spent
craft_mode_chosen
item_crafted
item_equipped
second_survey_completed
```

### Required playtest annotations

Support lightweight notes for:

- confusion points;
- moments where the player pauses or backtracks;
- terms the player asks about;
- whether the player can explain resource stats → schematic weights → property preview → tuning expression;
- whether the player voluntarily starts or wants another survey/thumper/craft loop;
- whether wear/repair feels fair.

### Implementation guardrails

- Keep telemetry server-side and privacy-light.
- Do not use third-party ad/marketing analytics in the MVP.
- Record event names, timestamps, pilot/session identifiers, and compact metadata only.
- Keep economy state authoritative in the Decision 012 ledger; telemetry explains player comprehension and behavior, not ownership truth.
- Use the same event vocabulary in code, playtest notes, and the Design Bible so funnels can be audited without translation.


## 9C. Decision 014 — MVP Prototype Ladder and Build Order

Decision 014 locks the build order so implementation stays production-shaped without becoming broad MMO infrastructure too early.

Locked build ladder:

1. Paper / spreadsheet economy prototype.
2. Text-only loop prototype.
3. Clickable single-player vertical slice.
4. Instrumented playtest build.
5. Presentation pass.
6. Production-point review.

Implementation implications:

- Stage 1 can be a spreadsheet or script, but it should mirror the domain formulas that will later live in `/packages/domain`.
- Stage 2 can be CLI, rough local web page, or simple form flow; it should prove the sequence before polishing UI.
- Stage 3 becomes the first real SvelteKit vertical slice with the six locked MVP screens.
- Stage 4 adds Decision 013 telemetry and ledger audit checks.
- Stage 5 adds only lightweight pixel/menu/audio feedback needed to test fantasy.
- Stage 6 decides whether the toy has earned expansion.

Do not build marketplace services, chat infrastructure, guild systems, group-thumper accounting, mobile wrappers, distributed job systems, or broader MMO infrastructure before the production-point review.



## 9D. Decision 015 — MVP Definition of Done and Scope Freeze

Decision 015 freezes MVP scope and prevents implementation drift.

Implementation implications:

- Build only the records, screens, domain functions, telemetry, and light presentation required by Decisions 001–014.
- New implementation requests enter MVP only if they fix a contradiction, unblock the prototype ladder, improve comprehension of the locked toy, protect resource/crafting/economy trust, or are required for Decision 013 evidence.
- Otherwise, park them in the Layered Feature Backlog.
- Treat marketplace, trade, chat, guilds, group thumpers, public helper boards, refining/separators, factories, mobile wrapper, monetization, and broad MMO infrastructure as explicitly out of scope until after the production-point review.

The technical Definition of Done is not a broad MMO shell. It is an auditable, server-authoritative vertical slice that proves:

```text
survey → thump → claim → think-craft → equip/use → wear/repair → survey better
```

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

---

# PART C — Stage 1 Paper Test Results (executed 2026-06-09)

Decision 014 Stage 1 deliverable: `stage1_economy.xlsx` (live-formula model) and `stage1_sim.py` (script). All five recipes were run against all 8 valid resource combinations each (40 crafts, 120 property lines), using Decision 010 locked stats and weights, 0–3 tuning points, Safe Craft, and Careful Experiment.

## Verdict per Stage 1 question

| Stage 1 question | Result |
|---|---|
| Does Veyrith Copper clearly outperform weak Conductivity material for the Scanner? | **PASS.** Best Veyrith scanner: 83.8 Strong (96.3 Exceptional with 3 tuning pts). Best Slag scanner: 62.1 Solid (71.5 tuned). A two-band gap that tuning cannot close. |
| Does Thornwake Crystal look tempting but risky? | **FAIL under locked weights.** Thornwake wins 0/60 property comparisons vs Pale Ember — strictly dominated, contradicting Decision 006. Cause: no Reactive Crystal slot reads Conductivity. Fixed by proposed Decision 016 Amendment A (verified: Thornwake becomes best Survey Clarity lens at 89.0 Exceptional while tanking the other two scanner lines). |
| Does tuning express resource quality without replacing it? | **PASS.** Worst scanner combo with all 3 points (67.4) cannot approach the best combo untuned (83.8). Tuning is multiplicative, so good resources gain more. |
| Do the five recipes produce meaningfully different property profiles? | **PASS, with one fix.** Recipes rank resources differently and properties land in different bands. Exception: Field Repair Kit's Condition Restored ↔ Integrity Safety correlated at +1.00 (same stats, same slot) — a non-choice. Fixed by proposed Decision 016 Amendment B (verified: correlation drops to +0.51 and the Reactive Binder slot becomes meaningful). |
| Do Safe Craft and Careful Experiment feel different without chaos? | **PASS on paper, watch in playtest.** Careful Experiment EV ≈ +2.2 points on a strong line with a 5% minor-flaw risk — bounded and resource-respecting, but +3% is subtle; verify testers perceive the difference at Stage 4. |

## Additional findings

- **Tuning perceptibility:** 3 points moves a property across an output band in 59% of cases (perceptible); a single point does so in only 19% (subtle). Acceptable since players spend all 3, but watch the comprehension gate.
- **Score cap:** the 100 cap is reached only by 3 points on an already-Exceptional line (Veyrith+Pale scanner Signal Range 87.8 → capped at 100). No clipping problem at prototype stats.
- **Within-recipe correlations under locked weights:** Drill Depth Access ↔ Wear Control +0.97 and Scanner Stat Hint ↔ Signal Range +0.99 also move together (both driven by the same slot stat). Not amended — the affected pairs still differ from their recipe's third line, and Decision 016 fixes the two worst cases. Re-check at Stage 4 if tuning feels like a non-choice.
- **First-session script still holds** under Amendment A: the guaranteed Veyrith Copper + starter Pale Ember + Keth Iron scanner craft produces a Strong/Excellent item, and the first survey's Thornwake signal now carries genuine temptation.

## Gate status

Stage 1 passes once Decision 016 is locked (or alternatively amended). Stage 2 (text-only loop) is blocked only on locking Decision 017 (time model). No other contradictions found.

---

## Part C addendum — Bloom Variance Monte Carlo (Decision 018 evidence, 2026-06-09)

`bloom_variance_sim.py` rolled 10,000 random blooms (2 resources per family, stats uniform within family caps, Decision 016 weights) to test whether SWG-style stat variance is safe inside the MVP toy.

### Prototype family caps (locked Decision 006 bloom is a valid roll within these)

| Family | OQ | Conductivity | Hardness | Heat Resistance | Malleability |
|---|---|---|---|---|---|
| Conductive Metal | 1–1000 | 300–1000 | 1–600 | 1–800 | 1–800 |
| Structural Alloy | 1–1000 | 1–400 | 400–1000 | 1–700 | 200–900 |
| Reactive Crystal | 1–1000 | 200–1000 | 1–600 | 200–1000 | 1–500 |

### Results

| Metric | Value |
|---|---|
| Best achievable craft per bloom | median 82.7 (Strong); p10 73.0; p90 89.9; min 53.2; max 98.4 |
| Exciting bloom (Excellent craft possible) | 35.3% |
| Mediocre bloom (nothing above Solid) | 5.4% |
| Floor bloom (nothing above Basic) | 0.03% — no artificial floor needed |
| "Veyrith-tier" CM (Cond≥900 & OQ≥800) | 5.9% (~1 in 17 blooms → ~3/year at 7-day cadence) |
| Best-vs-worst combo gap on mediocre blooms | 15.4 pts (a full output band) — resource choice still matters |
| Locked first bloom's scanner ranking | top ~17% of blooms |

### Orphan-stat audit

Directly-read stats per family under Decision 016 weights: CM reads Conductivity; SA reads Hardness + Malleability; RC reads Conductivity + Heat Resistance; OQ counts everywhere via the average term. Orphan display stats (never read directly): CM Hardness/Heat Resistance/Malleability; SA Conductivity/Heat Resistance; RC Hardness/Malleability. MVP mitigation (Decision 018 §6): de-emphasize zero-weight stats in survey/crafting UI. Longer term, follow SWG's pattern of per-class stat sets or add recipes that read more stats.

### Tuning knobs

Roll distribution (uniform assumed; skewing low makes high quality rarer), family cap ranges, and the definition of "exceptional" (multi-stat fit is naturally rarer than single-stat peaks). All are data, not code.


---

## Part C addendum 2 — Time Model & Allocation simulations (Decisions 017/021 evidence, 2026-06-10)

**`run_duration_sim.py`** (Decision 017): three time models × three archetypes over 14 days. Pure short runs → 8.8:1 active:casual net (inflationary). Pure 4 h timers → 2.5:1 but active players can use only 10% of their playtime (tedium). Locked hybrid → **2.3:1**, casual 1.5 crafts/day, active 3.5, wear sink scaling 9%→20% with run frequency. Reward target band: 2–3:1, edge from prospecting skill and attention.

**Allocation simulation** (Decision 021): on the nine-resource seed bloom, every slot context has a winner and seven of nine resources win at least one (Keth Iron and Glimmerfall Shard are the intended bulk archetypes). Monte Carlo with 3 resources/family and 016+021 weights (8,000 blooms): median best craft 86.1, exciting 58.2%, mediocre 0.8%, floor 0.00%, and a CM allocation decision exists in **87.8%** of blooms. Orphan family-stat combinations drop from 7 to 5. Knob if peaks feel too common at Stage 4: skew the stat roll distribution low.

---

## Active Rollout Target Note

As of 2026-06-16, Decision 024 / `WORKSHOP_FIRST_CRAFTING_SLICE_SPEC.md` supersedes Decision 022 for the next playtest. The active build target starts in WORKSHOP, disables FIELD / RIG / SETTLEMENT as in-development screens, and proves repeated crafting with low-to-mid bench resources before restoring the field loop.
