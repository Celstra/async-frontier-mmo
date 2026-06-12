# First-Thump Slice — Flow / UX Spec

Companion to Decision 022 (PROPOSED). This is the build target for the flow/UI rewrite. Economy structures from Decisions 010/016–021 are unchanged; quantities marked `[SIM]` are placeholders pending the balance simulations (§8).

## 1. The toy, stated once

> Find the spot. Wake the thumper. Hold the line. Carry it home.

Sampling and thumping are the same verb at two time scales:

- **Hand scale (synchronous):** you walk the gradient, scan, sample. Attention-priced, energy-limited, tiny pools, instant feedback. This is the minigame and the tutorial.
- **Industrial scale (async):** the thumper works the spot you proved by hand, for hours, while you're gone. Time-priced, threat-attracting, big pools.

Everything in the slice exists to make a player feel hand scale in minute one and *choose* industrial scale by minute fifteen.

## 2. Goals / non-goals

**Goals**

- First sample within ~90 seconds of page load. First claim within ~15 minutes. Voluntary second deploy in the first session.
- Zero out-of-band context needed: prologue + foreman dialogue + screen affordances carry everything.
- The UI rewrite: no dropdowns, terminal/console aesthetic, explicit next action on every screen.

**Non-goals (explicitly out)**

- Simulated settlement economy (it's a ledger), frame choice, multiple thumper slots, combat minigame, timed bloom rotation, thumper destruction, realtime/multiplayer anything.

## 3. Fiction frame

The player is a prospector in a small settlement whose fabricator — and with it, thumper production — is offline. The foreman posts material needs. The player's scanner works; nothing else does. All jargon is introduced diegetically: the foreman explains what conductive metal is *for* because the fabricator needs it.

Prologue (full text, three lines, shown once):

```
The settlement's fabricator went dark two weeks ago. No fabricator, no
thumpers; no thumpers, no ore worth hauling. You have a scanner, two
good legs, and the foreman's list. Start walking.
```

## 4. Screen inventory (four screens, no dropdowns)

1. **FIELD** — the primary screen. ASCII map, you are `@`. Scan / move / sample / deploy / guard all happen here. Local concentration readout, energy bar, known-waypoint markers.
2. **SETTLEMENT** — the foreman's board: posted needs as missions, contribution bars, what comes online next. Turn-in happens here. **Adaptive mission tracker (the stack teacher):** an order starts family-level — `30 units — ONE Structural Alloy stack (no mixing)`. The moment the player samples a candidate resource, the tracker **binds to it**: `BENDREL RIDGE ALLOY — 13/30 — single stack`, with a one-shot nudge: `17 more Bendrel completes this order. Stacks can't mix.` If the player then samples a *different* alloy, the tracker shows both ("Bendrel 13/30 · Sorrel 4 — only one stack counts") so the mistake is visible before turn-in, not at it. A compact one-line tracker mirrors on FIELD so the goal travels with the player.
3. **WORKSHOP** — crafting. Schematic rendered as a physical diagram with labeled slots; inventory is a flat selectable list (never a dropdown); tuning points; assemble action.
4. **RIG** — your thumper: chassis, slotted components with wear %, hull state, repair queue. Empty/locked until the tutorial builds it.

Navigation is a persistent single-row bar: `[F]IELD  [S]ETTLEMENT  [W]ORKSHOP  [R]IG`. The active next action is always highlighted on exactly one screen ("the foreman has a job for you →").

### FIELD screen sketch

```
┌─ FIELD ─ Red Mesa ──────────────────────────────┐
│  . . . ~ ~ . . . . . .        SCANNING: CM      │
│  . . ~ ~ ~ ~ . . ▲ . .        Sorrel Vein Copper│
│  . . ~ ~ @ ~ ~ . . . .        HERE: 41%         │
│  . . . ~ ~ ~ . . . . .        best so far: 47%  │
│  . . . . . . . . . . .        range hint: 40-75%│
│                                                 │
│  ENERGY ███████░░░ 70    SAMPLES: Sorrel x2 (9u)│
│                                                 │
│  [scan]  [move ←↑↓→]  [SAMPLE HERE]  [waypoints]│
└─────────────────────────────────────────────────┘
```

`~` = signal strength shading near the player (revealed only where scanned), `▲` = known waypoint, `@` = player. The map is the toy's face: scanning literally reveals the world.

## 5. The sampling minigame

1. Pick a family to scan (foreman's list drives the first choices; CM/SA/RC order is the player's).
2. Family scan lists this rotation's live resources in that family (per Decision 021), with rolled range hints (Decision 019). **Turn-ins demand a single stack** (e.g. "30 units of one Structural Alloy — any of the three, any quality, no mixing"), so picking which resource to commit to is the decision this screen exists for, and the board text says the rule out loud.
3. Pick one → the FIELD map activates for it. **Topology is generated per resource instance at spawn** — peak count and peak maxima rolled per Decision 019, so two coppers in the same rotation are different terrains. Scan reads concentration **at your tile only**. First reading lands in the low third of the rolled range `[SIM]`.
4. Move (1 tile per step, small energy cost), re-scan, walk the gradient. Peaks are real topology — some resources never peak high this rotation (Decision 019's SWG grounding).
5. **SAMPLE** = ~10-second commitment animation (progress bar on the map). Yield = **5u × (local concentration / 100)** (sim-set: 1.25u at tutorial Veyrith 25%, 3.25u at Keth 65%, 4.4u at Keth peak — gradient-hunting visibly pays). Replaces the flat `SAMPLE_TRICKLE_UNITS = 2` in `prospectingSampling.ts`. First-ever sample of a resource reveals its five stats — the wow beat, kept exactly.
6. Each spot holds a finite per-pilot hand-sample pool (**4–5 samples**, sim-set), separate from thumpable units. Sampled spots become permanent waypoints (`pilot_deposit_spot_samples` already stores this per pilot).

Energy gates total sampling (`surveyEnergyOutlook` exists in domain; current regen is ~20× too generous and must change — see §8.3). Thumping costs no energy — the machine works, you don't. Regen model **locked (Ryan, 2026-06-12): continuous trickle, cap 10 samples, 0.5 samples/hr** — sim-confirmed over daily reset (reset leaves spaced visitors arriving empty-handed); the rate holds the anti-substitution guard (~16 samples/day ceiling), and late check-ins are for tending thumpers, claims, and turn-ins rather than sampling.

## 6. First-session script (the clock)

| t | Beat | Screen |
|---|------|--------|
| 0:00 | Prologue (3 lines), then straight to SETTLEMENT board | SETTLEMENT |
| 0:30 | Foreman: fabricator needs **one 20u Structural Alloy stack + one 12u Conductive Metal stack** (sim-set: SA fills in ~7 samples at Keth's 65% opening; CM in ~4–5 at Slag's. Veyrith at 25% can't fill a stack fast — it gets sampled for the *wow*, not the order, teaching prize-vs-bulk at minute six). Player picks which family to hunt first | SETTLEMENT |
| 1:00 | Family scan → 3 live signals with range hints → pick one → map activates | FIELD |
| 1:30–6:00 | Gradient hunt; 2–3 samples; first stat reveal wow; optionally chase the peak or settle | FIELD |
| 6:00–8:00 | Second family, shorter hunt (map skills now learned) | FIELD |
| 8:00 | Turn in (single stacks). Contribution bars fill; fabricator boots **loudly** (full-screen moment) | SETTLEMENT |
| 8:30 | Foreman hands over the thumper schematic + the settlement's worn drill head and a scavenged hull (**5% integrity, shown plainly**). Player assembles the rig: slots hull, drill, pump into the chassis through the real crafting flow | WORKSHOP |
| 10:00 | Deploy on the player's best-sampled waypoint. Watched live on FIELD — thumper ASCII art, threat meter climbing, first event window (Signal Drift) | FIELD |
| ~12:00 | **The hull gives out. Fail-safe auto-recall fires on screen**: "RIG SECURED — fail-safe nominal. Hull integrity spent. Partial yield recovered: **25u** (scripted floor — never empty-handed)." The rig worked; the hull was the limit. First (partial) claim in hand | FIELD |
| 12:30 | Foreman patches the hull to 30%: "Scavenge gets you 30 percent. *Crafted* hulls run for hours. Get back out there" | SETTLEMENT |
| 13:00 | Second deploy, same waypoint (known-spot redeploy taught by doing). **5 minutes watched**, both scripted windows (Signal Drift, Pump Strain), hull holds | FIELD |
| 18:00 | Full claim: **60u** (sim: tutorial 5-min run at the Decision 017 generosity floor). Yield comparison shown: "Hand samples today: ~25u. Aborted run: 25u. This run: 60u." | FIELD |
| 18:30 | Foreman posts the next need (bigger). Async reveal: "Longer deployments run while you're gone. Your rig, your call." Duration picker: **15 min / 1 hr / 4 hr** (20-min tier cut — sim showed it's only 1.15× over 15 min, a non-choice) | SETTLEMENT |

Run-duration ramp across day one: 2 (scripted abort) → 5 (scripted) → 15 → 60 minutes, then 4-hour pushes. The first wait a player ever experiences is two minutes and ends in a lesson *and* loot; the second is five and ends in treasure. The deliberate first failure teaches hull, wear, recall, and "craft better components" in one beat — but the recall framing must read as the system working, never as player error.

## 7. System rules confirmed by Decision 022

- **One thumper slot.** Fleet growth is a future settlement unlock, not in slice.
- **Known-spot redeploy:** waypoints are redeployable without resurvey until `units_extracted = units_capacity` or the resource instance expires (Decision 020). Expiry kills the waypoint. The RIG/FIELD UI must show remaining units on known spots ("Sorrel ridge: ~210u left").
- **Hull 0% = auto-recall fail-safe:** run ends early, partial yield kept, repair debt incurred. Never destruction.
- **Hull governs run ceiling** (sim-derived, the tutorial beats fall out of the real formula): `max_run_minutes = TIER_BASE × (integrity/100)^1.2` — scavenged (base 75) at 5% ≈ 2 min; patched (base 30) at 30% ≈ 7 min; Basic crafted at 80% ≈ 3 h; Strong ≈ 7 h; Exceptional ≈ 11 h. Player picks any tail ≤ ceiling.
- **Blooms unchanged:** seeded first bloom, individual lifespans, manual rotation.

## 8. Simulations (built and run 2026-06-12)

Scripts: `sampling_ratio_sim.py`, `run_ramp_sim.py`, `energy_regime_sim.py` (all in `design-docs/`, python3-runnable).

1. **Sampling/thumping ratio — PASS with one re-anchor.** Recommended: base yield 5u (concentration-scaled), per-spot pool 4–5, turn-in stack 20u. Dedicated sampler stays at 6.4–8.5% of thumper units/hour across all concentrations (≤10% guard holds, energy-bound). Repair Kit ≈ 1.3 days of pure sampling (pinch-affordable ✓); Hull Plate ≈ 2.7 days (thumping required ✓). The original "30u stack in 6–8 samples *at Veyrith 25%*" was structurally impossible under the guard — re-anchored to bulk-resource concentrations (Keth 65%, Slag 55%), which is the better tutorial anyway: bulk fills orders, Veyrith is the prize you sample once and covet. Code change: concentration-scaled yield replaces flat `SAMPLE_TRICKLE_UNITS` in `prospectingSampling.ts`.
2. **Run ramp — PASS with two cuts.** Hull→ceiling formula in §7. Tier yields (67% conc): 15 min = 30u → 60 min = 60u (2.0×) → 240 min = 120u (2.0×). The 20-min tier is a non-choice (1.15×) — cut from the picker. Tutorial 2-min and 5-min runs both hit the Decision 017 generosity floor (60u), so the abort's 25u partial is tutorial-scripted. Spam check: chained 5-min runs with 3-min natural redeploy friction out-earn one long run 1.9× over 2 hours (within the acceptable active-play premium; long runs are 8× more repair-efficient, which is the casual's compensation). No hard cooldown; first knob if playtests show abuse: per-run wear floor of 10 condition points. Event windows: 2 scripted (tutorial), 2 slots × 55% on 15–60 min, 3 slots on 4 h (~1.7 expected decisions).
3. **Energy regime — trickle CONFIRMED over reset; rate LOCKED at 0.5/hr, cap 10 (Ryan, 2026-06-12).** Daily reset fails spaced players (33–50% of check-ins arrive sampling-dry); trickle+cap gives 100% coverage with diminishing returns past visit 3–4 — the design hypothesis confirmed. The locked rate caps the most diligent player at ~16 samples/day (~60u at bulk-mid → Hull Plate stays ~2 days of pure sampling, guard (c) holds). Accepted trade: later check-ins may arrive sampling-dry — in the real game those visits have thumpers to tend, claims, and turn-ins. Implementation: `surveyEnergyOutlook` constants change to cap = 10 × sample cost, regen = 0.5 × sample cost per hour.

## 9. Telemetry funnel (replaces the Decision 013 event set)

`prologue_done, first_family_chosen, first_scan, first_move, first_sample, first_stat_reveal, second_family_started, turn_in_completed, fabricator_online_seen, rig_assembled, first_deploy, event_window_resolved, first_claim, async_duration_chosen, second_deploy_voluntary, return_visit`

The Stage 6 metrics become: median time-to-first-sample, % reaching first claim in one session, **% with a voluntary second deploy**, % returning within 48h.

## 10. Open questions

Resolved 2026-06-12: fail-safe taught via the scripted 5%-hull first run; energy = trickle pending sim; topology generated per resource; turn-in = any quality, single stack. Round 2: the scripted abort has a **guaranteed partial-yield floor** (`[SIM: ~25u]` — tutorial-scripted, never empty-handed); the foreman's 30% hull patch is **free in the slice** (repair costs arrive with the first real hull craft); stack commitment is taught by the **adaptive mission tracker** (§4.2 — binds to the first-sampled resource, shows x/30 progress, nudges with remaining count, surfaces split-stack mistakes before turn-in). Tracker copy and placement refine during build.

No open design questions. The §8 simulations ran 2026-06-12 and Decision 022 is **Locked** — the next gate is the build itself, then 3–5 external testers on the §9 funnel.
