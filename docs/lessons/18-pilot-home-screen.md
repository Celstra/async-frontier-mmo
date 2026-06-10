# Lesson 18 — Pilot Home screen (frame choice + session pilot)

> **Exercise:** Replace the default SvelteKit welcome page with **Pilot Home** — the first of Decision 008's six MVP screens. A new browser session gets its own pilot id (cookie, not auth). Frame choice gates everything else. The home screen summarizes what the player needs before diving into survey, thumper, or craft flows still living on the same route for now.

**Prerequisite:** Phases 0–6 backend complete (thumper loop, crafting, equip, bloom rotation). `resolvePilotId(event)` helper exists from the phase review (W-W2).

**Out of scope:** Auth/accounts, separate routes for the other five screens (Lessons 7.2–7.6), dashboard polish, realtime updates.

**Learning goal:** Learn **information hierarchy** — what a player must see first on returning to the game, and how server load shapes a summary screen without duplicating domain math in the UI.

---

## 1. What belongs on Pilot Home?

Decision 008 lists Pilot Home as screen #1. It is not a menu of every system — it is an **orientation board**: "Where am I, what's running, what do I have, what should I do next?"

| Panel | Why it belongs |
|-------|------------------|
| **Frame** | Identity + verb (Decision 011). Feeds thumper resolution math (Lesson 3.4 / Lesson 10). |
| **Active bloom name** | Named resources are bloom-scoped (Decision 006). Player needs to know which spawn set is live. |
| **Run status** | Async MMO core: is a thumper active, finished, recalled, or idle? |
| **Resource summary** | Inventory at a glance — proves the economy loop is personal. |
| **Equipped scanner + parts** | Gear affects survey clarity and thumper performance; home confirms loadout without opening Crafting. |
| **Suggested next action** | Reduces "what now?" friction; derived from game state, not a hard-coded tutorial string. |

Everything else (full survey comparison, deploy form, event windows, craft workshop) stays on this page **below** the summary until Lesson 7.2 splits screens.

---

## 2. Rank what the player needs first (and why)

When a player opens the app, their mental questions arrive in this order:

1. **"Who am I playing?"** → Frame (verb, not stat block). Locked first step in Decision 011.
2. **"Is something running without me?"** → Run status. Async fantasy: the thumper may be extracting while they were away.
3. **"What world am I in?"** → Active bloom. Resources rotate; stacks keep provenance but new spawns belong to the current bloom.
4. **"What do I own?"** → Resource summary + equipped gear. Grounds crafting and deploy decisions.
5. **"What should I do next?"** → Suggested action. Single line, state-derived.

Survey detail, schematic slots, and event-window buttons are **second-layer** UI — important once oriented, but noise on first glance.

```text
Orientation (Pilot Home summary)
    ↓
Action screens (survey / deploy / run / claim / craft — still on +page for now)
```

---

## 3. Frame choice before anything else (Decision 011)

New pilots must choose **Recon**, **Engineer**, or **Vanguard** before survey, starter kit, or deploy:

| Frame | Verb (UI copy) |
|-------|------------------|
| Recon | Better at reading signals. |
| Engineer | Better at keeping machinery alive. |
| Vanguard | Better at suppressing threat. |

**Persistence:** `setPilotFrame(db, pilotId, frameId)` updates `pilots.frame_id` and grants the one-time starter stockpile + thumper parts (same as the old demo bootstrap, but only after the player commits).

**Gate signal:** `starter_stockpile_granted_at IS NULL` means "frame not committed yet." No extra column needed — the starter kit cannot arrive before frame choice.

**Gameplay link:** Frame is resolution input at claim time (`resolveThumperRunResult({ pilotFrame })`), not decoration (Lesson 10).

---

## 4. Session pilot without auth

Lesson 04 used `DEMO_PILOT_ID`. Lesson 7.1 replaces that with a **per-browser pilot**:

```text
hooks.server.ts  →  cookie `pilot_id` (uuid) on first visit
resolvePilotId   →  event.locals.pilotId
ensureSessionPilot → INSERT pilots row if missing (no starter kit yet)
```

Auth later swaps cookie issuance for login; **actions keep calling `resolvePilotId(event)`** — one-line change at the identity layer.

No passwords, no sessions table — just httpOnly cookie + Postgres row.

---

## 5. Server load shape

`+page.server.ts` `load` returns a **pilot home bundle** alongside existing demo fields:

```typescript
{
  needsFrameChoice: boolean,
  frameLabel, frameVerb,
  activeBloomName,        // e.g. "Red Mesa · Bloom #1"
  runStatusSummary,       // one line
  resourceSummary,        // { displayName, quantity, family }[]
  equippedScannerSummary,
  equippedPartsSummary,   // drill / pump / hull display names
  suggestedNextAction: { label, detail }
}
```

Pure string builders live in `apps/web/src/lib/pilotHome.ts` — presentation helpers, not domain rules.

When `needsFrameChoice` is true, load returns only frame options + empty summaries; survey/craft/thumper data is omitted.

---

## 6. UI shape

Replace:

```html
<h1>Welcome to SvelteKit</h1>
```

With:

1. **Frame choice form** (`?/chooseFrame`) when `needsFrameChoice`.
2. **Summary `<dl>`** + **Suggested next** when frame is chosen.
3. Existing survey / thumper / craft blocks unchanged below (wrapped in `{:else}`).

Styling: minimal borders, no component library — prove the toy, not the chrome (Decision 008).

---

## 7. Files touched

| File | Change |
|------|--------|
| `apps/web/src/hooks.server.ts` | Issue/read `pilot_id` cookie |
| `apps/web/src/app.d.ts` | `App.Locals.pilotId` |
| `apps/web/src/lib/server/pilot.ts` | Read `event.locals.pilotId` |
| `apps/web/src/lib/pilotHome.ts` | Frame verbs, bloom label, suggested action |
| `packages/db/src/queries/pilots.ts` | `ensureSessionPilot`, `setPilotFrame`, `ensurePilotGameReady` |
| `apps/web/src/routes/+page.server.ts` | Pilot home load, `chooseFrame` action, session pilot |
| `apps/web/src/routes/+page.svelte` | Pilot Home UI |

---

## 8. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Manual checklist:

1. Open `/` in a fresh browser profile → frame choice only (no survey).
2. Pick Engineer → starter inventory appears; home shows frame verb + bloom + suggested "Survey Red Mesa".
3. Complete tutorial thumper → suggested action moves through claim → craft → equip → survey again.
4. Dev note still shows thumper state when frame chosen.

---

## 9. Recap

**Learned:** Pilot Home is an orientation layer — rank frame → run → bloom → inventory → next action. Frame choice persists to Postgres and gates the Decision 011 starter kit. Session pilot id replaces hardcoded demo id without auth.

**Changed:** hooks + `pilot.ts` + db helpers + `+page` load/action/UI + `pilotHome.ts`.

**Next exercise:** Lesson 7.2 — Red Mesa Survey screen (`docs/lessons/19-red-mesa-survey-screen.md`) — move survey comparison to its own route; keep Pilot Home as the return anchor.

---

## Commit

```bash
git add apps/web packages/db docs/lessons/18-pilot-home-screen.md
git commit -m "feat: add pilot home screen with frame choice"
```
