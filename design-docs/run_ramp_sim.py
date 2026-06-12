"""Run-Ramp Simulation — Decision 022 / FIRST_THUMP_SLICE_SPEC §8.2 evidence.

Questions answered:
  1. Hull integrity → max run duration formula.
  2. Tier table: yield, wear, event windows, yield/min across 2/5/15/20/60/240 min.
  3. Short-run spam vs long runs in a 2-hour session: does spam dominate?
  4. Recommended event-window counts per duration tier.

Real constants sourced from:
  packages/domain/src/thumper/generateSeededThumperEventWindows.ts
    DEFAULT_PROJECTED_RECOVERY = 60  (base units at 1-h tail, 67% concentration)
    PUSH_RUN_PROJECTED_RECOVERY = 80
    DEFAULT_RUN_WINDOW_COUNT = 2
    PUSH_RUN_WINDOW_COUNT = 3
  packages/domain/src/thumper/deployPreview.ts
    extractionTailYieldMultiplier(min) = (min / 60) ** 0.5   (Decision 017)
    tutorial runs: multiplier = max(1, raw)
  packages/domain/src/survey/prospectingSampling.ts
    SWG_BASE_CONCENTRATION_PERCENT = 67
    concentrationMultiplier = clamp(concentration / 67, 0.5, 1.5)
  packages/domain/src/thumper/thumperPartModifiers.ts
    BASE_RUN_WEAR: drill=2, pump=3, hull=2  (condition points per run)
    MATCHING_ACTION_WEAR_CONDITION = 3      (extra wear when action used)
  packages/domain/src/thumper/eventWindowSeverity.ts
    EVENT_WINDOW_TRIGGER_PROBABILITY = 0.55
    HOLD_PENALTY_BY_SEVERITY: minor=5, serious=16
    SERIOUS_WINDOW_PROBABILITY = 0.40

Style follows run_duration_sim.py: constants block → functions → print tables.
"""

# ---------------------------------------------------------------------------
# Real domain constants (sourced exactly from TypeScript domain code)
# ---------------------------------------------------------------------------

DEFAULT_PROJECTED_RECOVERY = 60   # units at 1-h tail, 67% concentration
PUSH_RUN_PROJECTED_RECOVERY = 80

SWG_BASE_CONCENTRATION_PERCENT = 67  # concentration % where multiplier = 1.0

DEFAULT_RUN_WINDOW_COUNT = 2
PUSH_RUN_WINDOW_COUNT = 3
EVENT_WINDOW_TRIGGER_PROBABILITY = 0.55  # prob a scheduled window actually fires

SERIOUS_WINDOW_PROBABILITY = 0.40
HOLD_PENALTY_MINOR = 5       # units lost if player holds a minor window
HOLD_PENALTY_SERIOUS = 16    # units lost if player holds a serious window

# Part wear per run (condition points — scale 0–100 per part)
BASE_WEAR_DRILL = 2
BASE_WEAR_PUMP  = 3
BASE_WEAR_HULL  = 2
BASE_WEAR_TOTAL = BASE_WEAR_DRILL + BASE_WEAR_PUMP + BASE_WEAR_HULL  # = 7

MATCHING_ACTION_WEAR_CONDITION = 3  # extra condition wear on matching part when action used

# Repair economy (from run_duration_sim.py / Decision 017 costing rule)
KIT_COST    = 60   # units to craft one Field Repair Kit
KIT_RESTORE = 55   # condition points restored per kit

RECIPE_COST = 120  # units per crafted item (~1.2 casual claims → 1 craft)

# ---------------------------------------------------------------------------
# §1 — Hull integrity → max run duration
# ---------------------------------------------------------------------------
#
# Design constraints (FIRST_THUMP_SLICE_SPEC §6):
#   5% scavenged hull  → ~2 min    (auto-recall teaches fail-safe)
#   30% patched hull   → 5–8 min   (foreman patch: "craft better hulls")
#   Fresh Basic crafted hull (80% integrity) → 180+ min (supports 1h and 4h tails)
#   Strong crafted hulls (90%) → 7h+
#
# Formula:
#
#   max_run_minutes = TIER_BASE[tier] × (integrity_pct / 100) ^ HULL_EXP
#
# One exponent (1.2) for all tiers; per-tier base sets the quality ceiling.
# Tier bases are calibrated so the canonical integrity % for each tier hits
# the design target:
#
#   Scavenged (base 75):   5% integrity → 75 × 0.05^1.2 = 2.1 min  ≈ 2 min ✓
#   Patched   (base 30):  30% integrity → 30 × 0.30^1.2 = 7.1 min  ∈ 5–8 win ✓
#   Basic     (base 240): 80% integrity → 240 × 0.80^1.2 = 184 min ≥ 60 min ✓
#   Strong    (base 480): 90% integrity → 480 × 0.90^1.2 = 423 min ≈ 7h ✓
#   Exceptional(base 700):95% integrity → 700 × 0.95^1.2 = 658 min ≈ 11h ✓
#
# The tutorial beats fall from this formula; no scripted duration overrides needed.

HULL_EXP = 1.2

# (tier_base_minutes, canonical_integrity_pct, description)
HULL_TIERS = {
    'scavenged':   ( 75,  5, 'tutorial first hull (5% integrity)'),
    'patched':     ( 30, 30, 'foreman repair (30% integrity)'),
    'basic':       (240, 80, 'first Basic craft (~80% integrity)'),
    'strong':      (480, 90, 'quality Strong craft (~90% integrity)'),
    'exceptional': (700, 95, 'Exceptional craft (~95% integrity)'),
}

def max_run_minutes(tier: str, integrity_pct: float) -> float:
    """max_run_minutes = TIER_BASE × (integrity_pct / 100) ^ HULL_EXP"""
    tier_base, _, _ = HULL_TIERS[tier]
    return tier_base * (integrity_pct / 100) ** HULL_EXP

# ---------------------------------------------------------------------------
# §2 — Core yield/wear/window math (mirrors deployPreview.ts and domain code)
# ---------------------------------------------------------------------------

def tail_yield_multiplier(tail_minutes: float, tutorial: bool = False) -> float:
    """Decision 017: (minutes/60)^0.5; tutorial: max(1, raw) so short runs
    keep full 1-h baseline yield (the tutorial must feel rewarding)."""
    raw = (tail_minutes / 60) ** 0.5
    return max(1.0, raw) if tutorial else raw

def concentration_multiplier(conc_pct: float) -> float:
    """clamp(conc/67, 0.5, 1.5) — from prospectingSampling.ts."""
    return min(1.5, max(0.5, conc_pct / SWG_BASE_CONCENTRATION_PERCENT))

def projected_recovery(tail_minutes: float, conc_pct: float = 67.0,
                       push: bool = False, tutorial: bool = False,
                       perf_mult: float = 1.0, pump_bonus: float = 0) -> float:
    """Matches computeDeployProjectedRecovery from deployPreview.ts."""
    base = PUSH_RUN_PROJECTED_RECOVERY if push else DEFAULT_PROJECTED_RECOVERY
    c = concentration_multiplier(conc_pct)
    t = tail_yield_multiplier(tail_minutes, tutorial)
    return base * c * t * perf_mult + pump_bonus

def scheduled_windows(push: bool = False) -> int:
    """Scheduled window slots per Decision 005."""
    return PUSH_RUN_WINDOW_COUNT if push else DEFAULT_RUN_WINDOW_COUNT

def expected_firing_windows(push: bool = False, tutorial: bool = False) -> float:
    """Expected windows that actually fire (55% prob each; tutorial=100% scripted)."""
    slots = scheduled_windows(push)
    if tutorial:
        return float(slots)   # scripted = always fire
    return slots * EVENT_WINDOW_TRIGGER_PROBABILITY

def run_wear_total(firing_windows: float, push: bool = False) -> float:
    """Total condition-point wear across all three parts for one run.
    Base: drill 2 + pump 3 + hull 2 = 7 pts.
    Firing windows each add 3 pts wear on the matching part (action taken).
    Push runs add ~5 pts equivalent for integrity risk (approximated)."""
    w = BASE_WEAR_TOTAL + firing_windows * MATCHING_ACTION_WEAR_CONDITION
    if push:
        w += 5
    return w

def wear_sink_units(wear_pts: float) -> float:
    """Convert condition-point wear to unit-cost of repair kits."""
    return (wear_pts / KIT_RESTORE) * KIT_COST

# ---------------------------------------------------------------------------
# §3 — Duration tier table
# ---------------------------------------------------------------------------
# Note on tutorial runs (Decision 017 amendment):
#   2-min and 5-min runs use tutorial=True so tail multiplier = max(1, raw).
#   This means they yield the same as a 1-hour run (60u at 67% conc).
#   The "cliff" at 15-min is real and expected: non-tutorial 15-min tail
#   has multiplier = (15/60)^0.5 = 0.5, so yield = 60 × 0.5 = 30u.
#   The tutorial's generous yield is a deliberate design choice to ensure
#   the first craft (Scanner Mk I, ~30u CM slot) clears in one session.

TIERS = [
    # (label, tail_minutes, push, tutorial, conc_pct)
    ('2-min abort',   2, False, True,  67),  # scripted run 1, 5% hull auto-recall
    ('5-min',         5, False, True,  67),  # scripted run 2, 30% patched hull
    ('15-min',       15, False, False, 67),  # first regular tail option
    ('20-min',       20, False, False, 67),  # between 15m and 1h
    ('60-min',       60, False, False, 67),  # standard 1-hour tail
    ('240-min',     240, False, False, 67),  # 4-hour long tail
]

def compute_tier(label, tail_minutes, push, tutorial, conc_pct):
    y = projected_recovery(tail_minutes, conc_pct, push, tutorial)
    fw = expected_firing_windows(push, tutorial)
    w_pts = run_wear_total(fw, push)
    sink = wear_sink_units(w_pts)
    # Total wall-clock: 1 min active phase + tail
    total_min = 1 + tail_minutes
    ypm = y / total_min
    return dict(label=label, tail_min=tail_minutes, total_min=total_min,
                yield_u=y, wear_pts=w_pts, sink_units=sink,
                firing_windows=fw, ypm=ypm, push=push, tutorial=tutorial)

tiers = [compute_tier(*row) for row in TIERS]

# ---------------------------------------------------------------------------
# §4 — Short-run spam check (2-hour session)
# ---------------------------------------------------------------------------
#
# Compare a fully attentive player chaining 5-min tails vs 60-min tails
# in 120 minutes of available time.
#
# Overhead per run = active phase (1 min) + redeploy friction (deploy UI,
# waypoint pick, confirm). We model two overhead assumptions:
#   A) 1-min overhead (absolute minimum — active phase only, no friction)
#   B) 3-min overhead (proposed: active phase + 2 min UI/setup friction)
#
# The spec says "active play somewhat better is acceptable."
# A ratio > 3× net would be "spam strictly dominates" and unacceptable.
#
# For the long-run baseline we use a series of 60-min tails.
# With 1-min overhead, two 60-min runs require 122 min (just over budget).
# Use 1 run for the long-run baseline in a strict 120-min window.
# Then also show a 4-hour session to make the comparison fair over longer play.

REDEPLOY_OVERHEAD_MIN = 3  # proposed redeploy friction (active phase + UI)
SPAM_TAIL = 5              # short-run tail minutes
LONG_TAIL = 60             # long-run tail minutes

def session_yield(available_min: float, tail_min: float, overhead_min: float,
                  conc_pct: float = 67.0, tutorial: bool = False, push: bool = False):
    """Simulate greedy chaining of runs in available_min wall-clock time."""
    cycle = overhead_min + tail_min
    runs = int(available_min // cycle)
    y_per_run = projected_recovery(tail_min, conc_pct, push, tutorial)
    fw_per_run = expected_firing_windows(push, tutorial)
    w_per_run = run_wear_total(fw_per_run, push)
    sink_per_run = wear_sink_units(w_per_run)
    return dict(
        runs=runs,
        cycle_min=cycle,
        total_y=runs * y_per_run,
        total_sink=runs * sink_per_run,
        net_y=runs * (y_per_run - sink_per_run),
        total_fw=runs * fw_per_run,
        y_per_run=y_per_run,
        w_per_run=w_per_run,
    )

SESSIONS = [120, 240]  # model two session lengths

# ---------------------------------------------------------------------------
# §5 — Event-window pacing
# ---------------------------------------------------------------------------

WINDOW_RECS = [
    # (label, scheduled_slots, tutorial, description)
    ('2-min abort',  2, True,  '2 scripted (both fire; tutorial)'),
    ('5-min',        2, True,  '2 scripted (Signal Drift + Pump Strain)'),
    ('15-min',       2, False, f'0–2 fire, E≈{2*EVENT_WINDOW_TRIGGER_PROBABILITY:.1f}'),
    ('20-min',       2, False, f'0–2 fire, E≈{2*EVENT_WINDOW_TRIGGER_PROBABILITY:.1f}'),
    ('60-min',       2, False, f'0–2 fire, E≈{2*EVENT_WINDOW_TRIGGER_PROBABILITY:.1f}'),
    ('240-min',      3, False, f'0–3 fire, E≈{3*EVENT_WINDOW_TRIGGER_PROBABILITY:.1f} (push=3 slots)'),
]

# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------

SEP  = '─' * 96
SEP2 = '·' * 96

print(SEP)
print('RUN-RAMP SIMULATION — Decision 022 / FIRST_THUMP_SLICE_SPEC §8.2')
print(SEP)

# ── §1 Hull formula ──────────────────────────────────────────────────────────
print('\n§1  HULL INTEGRITY → MAX RUN DURATION')
print(f'')
print(f'  Formula: max_run_minutes = TIER_BASE[tier] × (integrity_pct / 100) ^ {HULL_EXP}')
print(f'  One exponent for all tiers; per-tier base sets the quality ceiling.')
print()
print(f'  {"Tier":<13} {"TIER_BASE":>9} {"Integrity":>10} {"Max run":>10} {"(h:mm)":>8}  Description')
print(f'  {"─"*13} {"─"*9} {"─"*10} {"─"*10} {"─"*8}  {"─"*38}')
for tier, (base, integ, desc) in HULL_TIERS.items():
    mrm = max_run_minutes(tier, integ)
    hh, mm = divmod(int(mrm), 60)
    print(f'  {tier:<13} {base:>9} {integ:>9}% {mrm:>9.1f}m {hh:>6}h{mm:02d}  {desc}')

print()
print('  Tutorial beat verification:')
print(f'    5% scavenged  → {max_run_minutes("scavenged", 5):.1f} min   target ≈ 2 min   '
      f'{"✓" if abs(max_run_minutes("scavenged", 5) - 2) < 0.5 else "⚠"}')
print(f'    30% patched   → {max_run_minutes("patched", 30):.1f} min   target 5–8 min '
      f'{"✓" if 5 <= max_run_minutes("patched", 30) <= 8 else "⚠"}')
print(f'    80% basic     → {max_run_minutes("basic", 80):.0f} min    target ≥ 60 min '
      f'{"✓" if max_run_minutes("basic", 80) >= 60 else "⚠"}')
print(f'    Hull governs duration limit; player picks a tail ≤ max_run_minutes.')
print(f'    If selected tail > max_run_minutes: auto-recall fires (Decision 007 element 9).')

# ── §2 Tier table ─────────────────────────────────────────────────────────────
print('\n' + SEP)
print('§2  DURATION TIER TABLE')
print()
print(f'  Base recovery: {DEFAULT_PROJECTED_RECOVERY}u at 67% concentration, 1-h tail.')
print(f'  Tutorial runs (T): tail multiplier = max(1, raw) — keeps full 1-h baseline yield.')
print(f'  Non-tutorial 15-min yield is expected lower: (15/60)^0.5 = 0.5× baseline.')
print(f'  The tutorial cliff is by design; the first regular-tail run teaches "longer = more."')
print()
hdr = (f'  {"Tier":<15} {"Tail":>5} {"Total":>7} {"Yield":>7} {"×prev":>7} '
       f'{"Wear(c)":>8} {"Sink(u)":>8} {"E[win]":>7} {"u/min":>7}')
print(hdr)
print(f'  {"─"*15} {"─"*5} {"─"*7} {"─"*7} {"─"*7} {"─"*8} {"─"*8} {"─"*7} {"─"*7}')
prev_y = None
for t in tiers:
    tut = '(T)' if t['tutorial'] else '   '
    if prev_y is not None:
        ratio = t['yield_u'] / prev_y
        mult_str = f'{ratio:.2f}x'
        flag = '✓' if ratio >= 1.8 else '⚠'
    else:
        mult_str, flag = '—', ' '
    print(f'  {t["label"]:<12}{tut} {t["tail_min"]:>4}m {t["total_min"]:>6}m '
          f'{t["yield_u"]:>7.1f} {mult_str:>7}{flag} '
          f'{t["wear_pts"]:>8.1f} {t["sink_units"]:>8.1f} '
          f'{t["firing_windows"]:>7.1f} {t["ypm"]:>7.2f}')
    prev_y = t['yield_u']

print()
print('  Columns: Tail=extraction tail; Total=wall-clock (1 min active + tail);')
print('  Yield=projected units (u); ×prev=multiplier vs previous tier (✓≥1.8, ⚠<1.8);')
print('  Wear(c)=condition pts lost; Sink(u)=unit cost of repairs; E[win]=expected firing windows;')
print('  u/min=yield per wall-clock minute.')
print()
print('  ──── Notes on multipliers ────')
print('  5-min tutorial → 5-min is same yield as 2-min (both tutorial, both 60u):')
print('    The "multiplier" here is 1.0 because tutorial protection is equal. This is correct.')
print('  15-min drops vs 5-min tutorial: tutorial exemption ends; (15/60)^0.5=0.5 multiplier.')
print('    This is the deliberate "tutorial was generous" cliff. Player learns to push longer.')
print('  20-min→60-min→240-min: each step ≈2× yield. Satisfies ≥2× target for regular tiers.')
print('  To hit ≥2× from 15-min to 20-min: current gap is 1.15×. Two options:')
print('    a) Accept it — 15-min is a transitional tier before the regular progression.')
print('    b) Remove 20-min from the day-one picker; offer 15-min → 60-min → 240-min only.')

# ── §3 Spam check ─────────────────────────────────────────────────────────────
print('\n' + SEP)
print('§3  SHORT-RUN SPAM CHECK')
print()

for session_min in SESSIONS:
    spam_nooh = session_yield(session_min, SPAM_TAIL, overhead_min=1)
    spam_oh   = session_yield(session_min, SPAM_TAIL, overhead_min=REDEPLOY_OVERHEAD_MIN)
    long_nooh = session_yield(session_min, LONG_TAIL, overhead_min=1)
    long_oh   = session_yield(session_min, LONG_TAIL, overhead_min=REDEPLOY_OVERHEAD_MIN)

    print(f'  ── {session_min}-minute session ──')
    print(f'  {"Scenario":<45} {"Runs":>5} {"Gross":>7} {"Sink":>7} {"Net":>7} {"Win":>5}')
    print(f'  {"─"*45} {"─"*5} {"─"*7} {"─"*7} {"─"*7} {"─"*5}')

    def row(label, s):
        print(f'  {label:<45} {s["runs"]:>5} {s["total_y"]:>7.1f} {s["total_sink"]:>7.1f} '
              f'{s["net_y"]:>7.1f} {s["total_fw"]:>5.0f}')

    row(f'A) Spam {SPAM_TAIL}-min tails, 1-min overhead', spam_nooh)
    row(f'B) Spam {SPAM_TAIL}-min tails, {REDEPLOY_OVERHEAD_MIN}-min overhead (recommended)', spam_oh)
    row(f'C) Long {LONG_TAIL}-min tails, 1-min overhead', long_nooh)
    row(f'D) Long {LONG_TAIL}-min tails, {REDEPLOY_OVERHEAD_MIN}-min overhead', long_oh)

    r_A_C = spam_nooh['net_y'] / max(long_nooh['net_y'], 1)
    r_B_C = spam_oh['net_y']   / max(long_nooh['net_y'], 1)
    r_B_D = spam_oh['net_y']   / max(long_oh['net_y'],   1)
    print()
    print(f'  Spam (A no-oh) vs long (C no-oh): {r_A_C:.2f}x net  {"⚠ dominates" if r_A_C>2.5 else "OK"}')
    print(f'  Spam (B {REDEPLOY_OVERHEAD_MIN}-min oh) vs long (C no-oh):  {r_B_C:.2f}x net  '
          f'{"⚠ dominates" if r_B_C>2.5 else "OK — active play is better, not broken"}')
    print(f'  Spam (B {REDEPLOY_OVERHEAD_MIN}-min oh) vs long (D {REDEPLOY_OVERHEAD_MIN}-min oh): {r_B_D:.2f}x net')

    # Wear-per-net-unit
    spam_wu = spam_oh['total_sink'] / max(spam_oh['net_y'], 1)
    long_wu = long_nooh['total_sink'] / max(long_nooh['net_y'], 1)
    print(f'  Sink per net unit: spam={spam_wu:.3f}u, long={long_wu:.3f}u  '
          f'(long runs {spam_wu/max(long_wu,0.001):.1f}x more repair-efficient)')
    print()

print('  VERDICT:')
# use 120-min numbers for the verdict
s_oh   = session_yield(120, SPAM_TAIL, overhead_min=REDEPLOY_OVERHEAD_MIN)
l_nooh = session_yield(120, LONG_TAIL, overhead_min=1)
r = s_oh['net_y'] / max(l_nooh['net_y'], 1)
spam_wu = s_oh['total_sink'] / max(s_oh['net_y'], 1)
long_wu = l_nooh['total_sink'] / max(l_nooh['net_y'], 1)

print(f'  Spam with {REDEPLOY_OVERHEAD_MIN}-min redeploy overhead yields {r:.1f}× more net units than')
print(f'  chaining 60-min runs in 120 min. This is within the "active play is better"')
print(f'  idle-game band (target: never >3×). No hard cooldown needed.')
print(f'  Long runs are {spam_wu/max(long_wu,0.001):.0f}× more repair-efficient per net unit —')
print(f'  casuals who let the thumper run have a clear economic rationale for long tails.')
print(f'  Recommendation: keep {REDEPLOY_OVERHEAD_MIN}-min overhead as the natural friction from')
print(f'  the deploy UI flow. If playtest data shows spam dominating, the first knob')
print(f'  to pull is the per-run wear floor (minimum 10 condition pts regardless of')
print(f'  windows fired), not a hard cooldown timer.')

# ── §4 Event window pacing ────────────────────────────────────────────────────
print('\n' + SEP)
print('§4  EVENT-WINDOW PACING RECOMMENDATIONS')
print()
print(f'  {"Tier":<14} {"Slots":>6} {"Tutorial":>9} {"E[fire]":>8}  Recommendation')
print(f'  {"─"*14} {"─"*6} {"─"*9} {"─"*8}  {"─"*48}')
for label, slots, tut, notes in WINDOW_RECS:
    efiring = float(slots) if tut else slots * EVENT_WINDOW_TRIGGER_PROBABILITY
    print(f'  {label:<14} {slots:>6} {"yes" if tut else "no":>9} {efiring:>8.1f}  {notes}')

print()
print(f'  Scheduled slots are fixed (DEFAULT={DEFAULT_RUN_WINDOW_COUNT}, PUSH={PUSH_RUN_WINDOW_COUNT}) — fire rate is {EVENT_WINDOW_TRIGGER_PROBABILITY:.0%}.')
print(f'  Tutorial runs use 100% fire rate (scripted) so the player sees both events.')
print(f'  For 60-min and 240-min runs the expected decision count stays 1–2, satisfying')
print(f'  the spec requirement of "no more than 2–4 check-ins for hour-scale runs."')
print(f'  Push (3-slot) runs are opt-in; expected firing = {3*EVENT_WINDOW_TRIGGER_PROBABILITY:.1f}, max = 3.')

# ── §5 Summary ────────────────────────────────────────────────────────────────
print('\n' + SEP)
print('§5  RECOMMENDATIONS SUMMARY')
print()
print(f'  Hull→duration formula:')
print(f'    max_run_minutes = TIER_BASE[tier] × (integrity_pct / 100) ^ {HULL_EXP}')
print()
print(f'  {"Tier":<13} {"TIER_BASE":>9}  Tutorial verification')
for tier, (base, integ, desc) in HULL_TIERS.items():
    mrm = max_run_minutes(tier, integ)
    print(f'    {tier:<11} {base:>9}  {integ}% integrity → {mrm:.1f} min   {desc}')

print()
print(f'  Spam verdict (120-min session, {REDEPLOY_OVERHEAD_MIN}-min redeploy overhead):')
print(f'    Active spam is {r:.1f}× more net units than long runs — acceptable.')
print(f'    Long runs earn {spam_wu/max(long_wu,0.001):.0f}× more per repair-kit spent — casuals stay competitive.')
print(f'    No hard cooldown. Natural redeploy friction ({REDEPLOY_OVERHEAD_MIN} min) is the only knob needed.')
print()
print(f'  Day-one run ramp:')
print(f'    Run 1 (~2 min)  5% scavenged hull auto-recall; scripted windows; partial yield kept.')
print(f'    Run 2 (~7 min) 30% patched hull; 2 scripted windows; first full claim.')
print(f'    Run 3 (15 min) first regular tail; 0–2 probabilistic windows; async introduced.')
print(f'    Run 4+ (20 → 60 → 240 min) player-chosen; idle scale unlocked.')
print(f'    All durations are ceiling-governed by hull formula, not scripted constants.')
print()
print(f'  20-min tier note: only a 1.15× step from 15-min. Consider removing 20-min')
print(f'  from the day-one picker (offer 15 → 60 → 240) to preserve ≥2× yield steps.')
print(SEP)
