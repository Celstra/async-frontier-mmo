"""Event Choice Liveness Simulation — thumper run event windows.

DESIGN QUESTION
===============
Thumper-run event windows currently have fixed outcomes: Hold always loses
5u (minor) / 16u (serious), the matching action always costs 3 Condition wear
and fully protects yield.  The matching action dominates whenever available, so
windows are not real choices.

Proposal
--------
  (1) Hold penalties become seeded ranges (minor 4–8u, serious 12–22u by candidate A).
  (2) The rig's meter level λ (Signal Lock / Pump Flow, 0–1) at resolution picks
      the point in the range: loss = lo + (1−λ)·(hi−lo).
      High λ → closer to lo (mild penalty); low λ → closer to hi (severe penalty).
  (3) The matching action costs 3 Condition wear, protects this window's yield AND
      resets the relevant meter to λ=0.9 for future windows.
  (4) Recall Early banks secured yield, forfeits remaining projected yield, ends
      all future window risk.

Liveness targets: every option optimal in ≥15% of states, no option >60%.

Mirrored live constants
-----------------------
  HOLD_PENALTY_BY_SEVERITY = {minor: 5, serious: 16}
    → packages/domain/src/thumper/eventWindowSeverity.ts
  MATCHING_ACTION_WEAR_CONDITION = 3
    → packages/domain/src/thumper/eventWindowSeverity.ts
  DEFAULT_RUN_WINDOW_COUNT = 2
    → packages/domain/src/thumper/generateSeededThumperEventWindows.ts
  EVENT_WINDOW_TRIGGER_PROBABILITY = 0.55
    → packages/domain/src/thumper/types.ts
  SERIOUS_WINDOW_PROBABILITY = 0.40
    → packages/domain/src/thumper/eventWindowSeverity.ts
  DEFAULT_PROJECTED_RECOVERY = 60 (yield at 1h tail, no concentration mod)
    → packages/domain/src/thumper/generateSeededThumperEventWindows.ts
  Yield formula: Y_tail = 60 × (tail_min/60)^0.5
    → packages/domain/src/thumper/deployPreview.ts (extractionTailYieldMultiplier)
  Repair Kit cost proxy: 60 materials restores ~55 Condition
    → CONDITION_TO_UNITS = 60/55 ≈ 1.09  (unit-equivalent cost of 1 Condition wear)
    → packages/db/src/queries/surveyEnergy.ts (Repair Kit recipe reference)
"""

import math
import itertools
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Live constants (mirrored from TypeScript)
# ---------------------------------------------------------------------------
HOLD_PENALTY_MINOR_LIVE       = 5       # fixed, current live
HOLD_PENALTY_SERIOUS_LIVE     = 16      # fixed, current live
MATCHING_ACTION_WEAR_CONDITION = 3
DEFAULT_RUN_WINDOW_COUNT      = 2
EVENT_WINDOW_TRIGGER_PROB     = 0.55
SERIOUS_WINDOW_PROB           = 0.40
MINOR_WINDOW_PROB             = 1.0 - SERIOUS_WINDOW_PROB   # 0.60

DEFAULT_PROJECTED_RECOVERY    = 60      # units at 1h tail

# Repair-kit proxy: 60 units of materials restores ~55 Condition
# => wearing 1 Condition = 60/55 unit-equivalent cost
CONDITION_TO_UNITS            = 60.0 / 55.0   # ≈ 1.0909

ACTION_UNIT_COST              = MATCHING_ACTION_WEAR_CONDITION * CONDITION_TO_UNITS
# ≈ 3.27 u-equivalent

# Action resets meter to λ=0.9; Hold/Recall leaves meter unchanged
METER_AFTER_ACTION            = 0.9

# ---------------------------------------------------------------------------
# State space
# ---------------------------------------------------------------------------
SEVERITIES  = ("minor", "serious")
METER_LEVELS = (0.1, 0.3, 0.5, 0.7, 0.9)  # λ at window resolution
RUN_FRACTIONS = (0.25, 0.50, 0.75, 0.90)   # fraction of tail elapsed
TAIL_MINUTES  = (15, 60, 240)

def tail_yield(tail_min: int) -> float:
    """Full projected yield for this tail (60 × (tail/60)^0.5)."""
    return DEFAULT_PROJECTED_RECOVERY * math.sqrt(tail_min / 60.0)

def secured_yield(tail_min: int, f: float) -> float:
    """Yield already banked at run-fraction f (linear extraction)."""
    return tail_yield(tail_min) * f

def remaining_yield(tail_min: int, f: float) -> float:
    return tail_yield(tail_min) * (1.0 - f)

# ---------------------------------------------------------------------------
# Option cost models
# ---------------------------------------------------------------------------

def hold_expected_loss(severity: str, lam: float, penalty_minor: tuple, penalty_serious: tuple) -> float:
    """
    Expected unit loss for Hold given current meter λ.
    loss = lo + (1−λ)·(hi−lo)  — high meter = close to lo (mild).
    """
    lo, hi = penalty_minor if severity == "minor" else penalty_serious
    return lo + (1.0 - lam) * (hi - lo)

def hold_loss_live(severity: str) -> float:
    """Fixed live-constant hold penalty (no meter, no range)."""
    return HOLD_PENALTY_MINOR_LIVE if severity == "minor" else HOLD_PENALTY_SERIOUS_LIVE

def future_window_expected_cost(lam_post: float, f: float,
                                 penalty_minor: tuple, penalty_serious: tuple) -> float:
    """
    Expected cost of all future windows after the current decision.

    n_f = DEFAULT_RUN_WINDOW_COUNT × (1−f) × EVENT_WINDOW_TRIGGER_PROB
    expected cost per future window = cheaper of:
      • future Hold (at lam_post, severity-weighted)
      • Action cost (fixed regardless of severity)
    with severity expectation: 0.6 × minor + 0.4 × serious.
    """
    n_f = DEFAULT_RUN_WINDOW_COUNT * (1.0 - f) * EVENT_WINDOW_TRIGGER_PROB

    hold_minor   = hold_expected_loss("minor",   lam_post, penalty_minor, penalty_serious)
    hold_serious = hold_expected_loss("serious",  lam_post, penalty_minor, penalty_serious)
    hold_exp     = MINOR_WINDOW_PROB * hold_minor + SERIOUS_WINDOW_PROB * hold_serious
    # Per-future-window: player will choose cheaper of Hold vs Action
    cost_per_window = min(hold_exp, ACTION_UNIT_COST)
    return n_f * cost_per_window

def future_window_expected_cost_live(lam_post: float, f: float) -> float:
    """
    Live-constant future cost: fixed penalties, meters have no effect.
    Action always wins because ACTION_UNIT_COST ≈ 3.27 < minor hold 5 < serious hold 16.
    """
    hold_exp = MINOR_WINDOW_PROB * HOLD_PENALTY_MINOR_LIVE + SERIOUS_WINDOW_PROB * HOLD_PENALTY_SERIOUS_LIVE
    # Live: meters are cosmetic, so lam_post irrelevant; action always beats hold
    cost_per_window = min(hold_exp, ACTION_UNIT_COST)
    n_f = DEFAULT_RUN_WINDOW_COUNT * (1.0 - f) * EVENT_WINDOW_TRIGGER_PROB
    return n_f * cost_per_window

# ---------------------------------------------------------------------------
# Policy solver: optimal option per state
# ---------------------------------------------------------------------------

class State(NamedTuple):
    severity: str
    lam: float
    f: float
    tail: int

def solve_policy(penalty_minor: tuple, penalty_serious: tuple) -> dict:
    """
    Returns {state: optimal_option} for all states in the enumerated state space.
    Options: 'action', 'hold', 'recall'

    Total cost model (lower = better):
      HOLD:   this_window_hold_loss + future_cost(lam, f)
      ACTION: ACTION_UNIT_COST + future_cost(METER_AFTER_ACTION, f)
              (action protects yield, so no yield loss this window)
      RECALL: forfeited_remaining_yield
              (secures what's banked, no future windows)
    """
    policy = {}
    for severity, lam, f, tail in itertools.product(SEVERITIES, METER_LEVELS, RUN_FRACTIONS, TAIL_MINUTES):
        state = State(severity, lam, f, tail)

        hold_loss = hold_expected_loss(severity, lam, penalty_minor, penalty_serious)
        fut_hold  = future_window_expected_cost(lam, f, penalty_minor, penalty_serious)
        fut_action= future_window_expected_cost(METER_AFTER_ACTION, f, penalty_minor, penalty_serious)

        cost_hold   = hold_loss + fut_hold
        cost_action = ACTION_UNIT_COST + fut_action
        cost_recall = remaining_yield(tail, f)   # forfeit everything not yet banked

        best_cost = min(cost_hold, cost_action, cost_recall)
        if best_cost == cost_action:
            opt = "action"
        elif best_cost == cost_hold:
            opt = "hold"
        else:
            opt = "recall"

        policy[state] = opt
    return policy

def solve_policy_live() -> dict:
    """
    Live-constant baseline: fixed 5/16 penalties, meters cosmetic.
    Action always dominates because ≈3.27 < 5 (minor hold) < 9.64 (expected hold).
    Recall: forfeit remaining yield.
    """
    policy = {}
    for severity, lam, f, tail in itertools.product(SEVERITIES, METER_LEVELS, RUN_FRACTIONS, TAIL_MINUTES):
        state = State(severity, lam, f, tail)

        hold_loss   = hold_loss_live(severity)
        fut         = future_window_expected_cost_live(lam, f)
        cost_hold   = hold_loss + fut
        cost_action = ACTION_UNIT_COST + future_window_expected_cost_live(METER_AFTER_ACTION, f)
        cost_recall = remaining_yield(tail, f)

        best_cost = min(cost_hold, cost_action, cost_recall)
        if best_cost == cost_action:
            opt = "action"
        elif best_cost == cost_hold:
            opt = "hold"
        else:
            opt = "recall"

        policy[state] = opt
    return policy

# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

LIVENESS_MIN = 0.15   # every option must be optimal in ≥15% of states
LIVENESS_MAX = 0.60   # no option may exceed 60%

def option_shares(policy: dict) -> dict:
    total = len(policy)
    counts = {"action": 0, "hold": 0, "recall": 0}
    for opt in policy.values():
        counts[opt] += 1
    return {k: v / total for k, v in counts.items()}

def liveness_passes(shares: dict) -> bool:
    return all(LIVENESS_MIN <= v <= LIVENESS_MAX for v in shares.values())

def liveness_label(shares: dict) -> str:
    if liveness_passes(shares):
        return "PASS"
    fails = []
    for opt, v in shares.items():
        if v < LIVENESS_MIN:
            fails.append(f"{opt} {v:.0%} < {LIVENESS_MIN:.0%}")
        elif v > LIVENESS_MAX:
            fails.append(f"{opt} {v:.0%} > {LIVENESS_MAX:.0%}")
    return "FAIL (" + "; ".join(fails) + ")"

# ---------------------------------------------------------------------------
# Sweep candidates
# ---------------------------------------------------------------------------
# Format: (label, (minor_lo, minor_hi), (serious_lo, serious_hi))
CANDIDATES = [
    ("A: minor(4,8)  serious(12,22)",  (4,  8),  (12, 22)),
    ("B: minor(3,10) serious(10,25)",  (3, 10),  (10, 25)),
    ("C: minor(5,9)  serious(14,26)",  (5,  9),  (14, 26)),
    ("D: minor(4,8)  serious(14,28)",  (4,  8),  (14, 28)),
]

# ---------------------------------------------------------------------------
# Hull-threat surcharge sweep (Recall knob)
# ---------------------------------------------------------------------------
# If Recall is never optimal, a "hull-threat surcharge" S on continuing can be
# added to all continuing options (Hold + Action) to model hull degradation risk.
# This tips Recall to optimal when remaining yield is lower than the surcharge cost.
HULL_SURCHARGES = [0.0, 2.0, 4.0, 6.0, 8.0, 10.0]   # units

def solve_policy_with_surcharge(penalty_minor: tuple, penalty_serious: tuple,
                                 surcharge: float) -> dict:
    """
    Same as solve_policy but adds `surcharge` to both Hold and Action total costs,
    representing ongoing hull-degradation risk of continuing the run.
    """
    policy = {}
    for severity, lam, f, tail in itertools.product(SEVERITIES, METER_LEVELS, RUN_FRACTIONS, TAIL_MINUTES):
        state = State(severity, lam, f, tail)

        hold_loss   = hold_expected_loss(severity, lam, penalty_minor, penalty_serious)
        fut_hold    = future_window_expected_cost(lam, f, penalty_minor, penalty_serious)
        fut_action  = future_window_expected_cost(METER_AFTER_ACTION, f, penalty_minor, penalty_serious)

        cost_hold   = hold_loss   + fut_hold   + surcharge
        cost_action = ACTION_UNIT_COST + fut_action + surcharge
        cost_recall = remaining_yield(tail, f)

        best_cost = min(cost_hold, cost_action, cost_recall)
        if best_cost == cost_action:
            opt = "action"
        elif best_cost == cost_hold:
            opt = "hold"
        else:
            opt = "recall"

        policy[state] = opt
    return policy

# ---------------------------------------------------------------------------
# Combined 2D sweep: action wear × hull-threat surcharge
#
# The single-surcharge sweep above cannot make Hold a live choice: it adds the
# surcharge to BOTH Hold and Action, so their *difference* is unchanged and the
# cheaper matching action keeps winning. The missing lever is the matching
# action's COST. At 3 Condition wear (~3.27u) the action is nearly free against
# any unit loss, so it dominates. Raising MATCHING_ACTION_WEAR_CONDITION lifts
# action cost toward the Hold range, which (a) lets a mild Hold win at high meter
# and (b) makes Recall rational sooner. This function sweeps both knobs together.
# ---------------------------------------------------------------------------
ACTION_WEAR_LEVELS = [3, 6, 9, 12]   # Condition points per matching action

def solve_policy_2d(penalty_minor: tuple, penalty_serious: tuple,
                    action_cost: float, surcharge: float) -> dict:
    """Policy with a parameterised matching-action unit cost AND hull surcharge.

    Future-window cost is recomputed with the same parameterised action_cost so
    the look-ahead stays self-consistent (a player who finds the action
    expensive now will also avoid it on future windows)."""
    def fut_cost(lam_post: float, f: float) -> float:
        n_f = DEFAULT_RUN_WINDOW_COUNT * (1.0 - f) * EVENT_WINDOW_TRIGGER_PROB
        hold_minor   = hold_expected_loss("minor",   lam_post, penalty_minor, penalty_serious)
        hold_serious = hold_expected_loss("serious", lam_post, penalty_minor, penalty_serious)
        hold_exp     = MINOR_WINDOW_PROB * hold_minor + SERIOUS_WINDOW_PROB * hold_serious
        return n_f * min(hold_exp, action_cost)

    policy = {}
    for severity, lam, f, tail in itertools.product(SEVERITIES, METER_LEVELS, RUN_FRACTIONS, TAIL_MINUTES):
        state = State(severity, lam, f, tail)
        hold_loss = hold_expected_loss(severity, lam, penalty_minor, penalty_serious)
        cost_hold   = hold_loss   + fut_cost(lam, f)              + surcharge
        cost_action = action_cost + fut_cost(METER_AFTER_ACTION, f) + surcharge
        cost_recall = remaining_yield(tail, f)
        best = min(cost_hold, cost_action, cost_recall)
        opt = "action" if best == cost_action else ("hold" if best == cost_hold else "recall")
        policy[state] = opt
    return policy

def print_2d_sweep() -> None:
    print()
    print(HBAR70)
    print("2D SWEEP — matching-action wear × hull-threat surcharge")
    print("  (the wear axis is the lever the original sweep was missing)")
    print(HBAR70d)
    best = None
    for label, pm, ps in CANDIDATES:
        print(f"\n  Candidate {label}:  minor{pm}  serious{ps}")
        print(f"  {'wear':>5} {'a_cost':>7} {'surch':>6} {'action':>7} {'hold':>6} {'recall':>7}  result")
        for wear in ACTION_WEAR_LEVELS:
            a_cost = wear * CONDITION_TO_UNITS
            for surch in HULL_SURCHARGES:
                pol = solve_policy_2d(pm, ps, a_cost, surch)
                sh = option_shares(pol)
                ok = liveness_passes(sh)
                mark = " <== PASS" if ok else ""
                if ok and best is None:
                    best = (label, pm, ps, wear, a_cost, surch, sh)
                print(f"  {wear:>5} {a_cost:>7.2f} {surch:>6.1f} "
                      f"{sh['action']:>6.1%} {sh['hold']:>5.1%} {sh['recall']:>6.1%}{mark}")
    print()
    if best:
        label, pm, ps, wear, a_cost, surch, sh = best
        print(f"  FIRST PASSING CONFIG: candidate {label}, action wear {wear} Condition "
              f"(~{a_cost:.1f}u), hull surcharge +{surch:.1f}u")
        print(f"    shares  action={sh['action']:.0%}  hold={sh['hold']:.0%}  recall={sh['recall']:.0%}")
    else:
        print("  No (wear × surcharge) cell passes liveness across candidates.")
    return best

# ---------------------------------------------------------------------------
# Printing helpers
# ---------------------------------------------------------------------------
HBAR70  = "=" * 70
HBAR70d = "-" * 70

def print_policy_table(policy: dict, label: str, penalty_minor: tuple | None,
                        penalty_serious: tuple | None) -> None:
    """Print full policy table: one row per state."""
    print()
    print(HBAR70)
    print(f"POLICY TABLE — {label}")
    if penalty_minor:
        print(f"  minor range [{penalty_minor[0]}, {penalty_minor[1]}]  "
              f"serious range [{penalty_serious[0]}, {penalty_serious[1]}]")
    print(HBAR70d)
    hdr = (f"  {'Sev':<8} {'λ':>4}  {'f':>5}  {'tail':>5}  "
           f"{'C_hold':>8} {'C_act':>7} {'C_rec':>7}  {'OPT':<8}")
    print(hdr)
    print(HBAR70d)

    for state in sorted(policy.keys()):
        severity, lam, f, tail = state
        opt = policy[state]

        if penalty_minor is not None:
            h_loss = hold_expected_loss(severity, lam, penalty_minor, penalty_serious)
            fut_h  = future_window_expected_cost(lam, f, penalty_minor, penalty_serious)
            fut_a  = future_window_expected_cost(METER_AFTER_ACTION, f, penalty_minor, penalty_serious)
            c_hold = h_loss + fut_h
            c_act  = ACTION_UNIT_COST + fut_a
        else:
            # live baseline
            c_hold = hold_loss_live(severity) + future_window_expected_cost_live(lam, f)
            c_act  = ACTION_UNIT_COST + future_window_expected_cost_live(METER_AFTER_ACTION, f)
        c_rec  = remaining_yield(tail, f)

        mark = " <<" if opt == "hold" else ("  <" if opt == "recall" else "")
        print(f"  {severity:<8} {lam:>4.1f}  {f:>5.2f}  {tail:>5}  "
              f"{c_hold:>8.2f} {c_act:>7.2f} {c_rec:>7.2f}  {opt:<8}{mark}")

    shares = option_shares(policy)
    print(HBAR70d)
    print(f"  Shares → action={shares['action']:.1%}  hold={shares['hold']:.1%}  "
          f"recall={shares['recall']:.1%}  "
          f"[{liveness_label(shares)}]")


def print_sweep_summary(surcharge: float = 0.0) -> None:
    print()
    print(HBAR70)
    surcharge_note = f"  (hull-threat surcharge +{surcharge:.1f}u on continuing)" if surcharge > 0 else ""
    print(f"SWEEP SUMMARY — range candidates{surcharge_note}")
    print(HBAR70d)
    print(f"  {'Candidate':<38}  {'Action':>7} {'Hold':>6} {'Recall':>7}  {'Verdict'}")
    print(HBAR70d)

    best_label = None
    best_shares = None
    best_dist   = float("inf")   # distance from ideal 45/35/20

    for label, pm, ps in CANDIDATES:
        if surcharge > 0:
            pol = solve_policy_with_surcharge(pm, ps, surcharge)
        else:
            pol = solve_policy(pm, ps)
        s = option_shares(pol)
        v = liveness_label(s)
        print(f"  {label:<38}  {s['action']:>7.1%} {s['hold']:>6.1%} {s['recall']:>7.1%}  {v}")

        if liveness_passes(s):
            dist = abs(s["action"] - 0.45) + abs(s["hold"] - 0.35) + abs(s["recall"] - 0.20)
            if dist < best_dist:
                best_dist   = dist
                best_label  = label
                best_shares = s

    print(HBAR70d)
    if best_label:
        print(f"  Closest to ideal (45/35/20): {best_label}")
        print(f"    action={best_shares['action']:.1%}  hold={best_shares['hold']:.1%}  "
              f"recall={best_shares['recall']:.1%}  dist_from_ideal={best_dist:.3f}")
    else:
        print("  No candidate passes liveness targets at this surcharge level.")

    return best_label, best_shares, best_dist if best_label else None


def print_baseline() -> None:
    """Print live-constant baseline to show ACTION dominance problem."""
    print()
    print(HBAR70)
    print("CURRENT-CONSTANTS BASELINE (live fixed 5/16, meters cosmetic)")
    print(HBAR70d)
    print(f"  ACTION_UNIT_COST = {ACTION_UNIT_COST:.2f}u  (3 wear × 60/55)")
    print(f"  Hold minor = {HOLD_PENALTY_MINOR_LIVE}u  Hold serious = {HOLD_PENALTY_SERIOUS_LIVE}u")
    print(f"  ACTION always cheaper than Hold if meter is cosmetic — expected Hold:")
    exp_hold = MINOR_WINDOW_PROB * HOLD_PENALTY_MINOR_LIVE + SERIOUS_WINDOW_PROB * HOLD_PENALTY_SERIOUS_LIVE
    print(f"    0.6×{HOLD_PENALTY_MINOR_LIVE} + 0.4×{HOLD_PENALTY_SERIOUS_LIVE} = {exp_hold:.2f}u >> {ACTION_UNIT_COST:.2f}u action cost")
    print()
    pol  = solve_policy_live()
    s    = option_shares(pol)
    print(f"  Option shares: action={s['action']:.1%}  hold={s['hold']:.1%}  "
          f"recall={s['recall']:.1%}")
    print(f"  Verdict: {liveness_label(s)}")
    print(f"  Interpretation: Recall optimal only when forfeited remaining yield < action cost "
          f"(late-run / short-tail corner cases). Action otherwise always dominates.")

# ---------------------------------------------------------------------------
# Example policy rows printer
# ---------------------------------------------------------------------------

def print_example_rows(policy: dict, label: str, penalty_minor: tuple, penalty_serious: tuple,
                        surcharge: float = 0.0) -> None:
    """Print a handful of illustrative states."""
    examples = [
        # (severity, lam, f, tail, description)
        ("serious", 0.3, 0.75, 60,  "serious window, late 60-min run, low meter"),
        ("serious", 0.9, 0.75, 60,  "serious window, late 60-min run, high meter"),
        ("minor",   0.1, 0.25, 240, "minor window, early 4-hr run, very low meter"),
        ("minor",   0.9, 0.50, 15,  "minor window, mid 15-min run, high meter"),
        ("serious", 0.5, 0.90, 15,  "serious window, near-end 15-min run, mid meter"),
        ("minor",   0.3, 0.75, 240, "minor window, late 4-hr run, low meter"),
    ]
    print()
    print(f"  Example policy rows — {label}")
    print(f"  {'Description':<47}  {'C_hold':>7} {'C_act':>6} {'C_rec':>6}  OPT")
    print("  " + "-" * 78)
    for sev, lam, f, tail, desc in examples:
        state = State(sev, lam, f, tail)
        opt = policy.get(state, "?")
        h_loss = hold_expected_loss(sev, lam, penalty_minor, penalty_serious)
        fut_h  = future_window_expected_cost(lam, f, penalty_minor, penalty_serious)
        fut_a  = future_window_expected_cost(METER_AFTER_ACTION, f, penalty_minor, penalty_serious)
        c_hold = h_loss + fut_h + surcharge
        c_act  = ACTION_UNIT_COST + fut_a + surcharge
        c_rec  = remaining_yield(tail, f)
        print(f"  {desc:<47}  {c_hold:>7.2f} {c_act:>6.2f} {c_rec:>6.2f}  {opt}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(__doc__)

    # ── Baseline ──────────────────────────────────────────────────────────────
    print_baseline()

    # ── Full policy table for each candidate (no surcharge) ───────────────────
    for label, pm, ps in CANDIDATES:
        pol = solve_policy(pm, ps)
        print_policy_table(pol, label, pm, ps)

    # ── Sweep summary ─────────────────────────────────────────────────────────
    print()
    print(HBAR70)
    print("SWEEP SUMMARY — no hull-threat surcharge")
    print(HBAR70d)
    print(f"  {'Candidate':<38}  {'Action':>7} {'Hold':>6} {'Recall':>7}  {'Verdict'}")
    print(HBAR70d)

    best_label  = None
    best_shares = None
    best_dist   = float("inf")
    candidate_results = []

    for label, pm, ps in CANDIDATES:
        pol = solve_policy(pm, ps)
        s   = option_shares(pol)
        v   = liveness_label(s)
        print(f"  {label:<38}  {s['action']:>7.1%} {s['hold']:>6.1%} {s['recall']:>7.1%}  {v}")
        candidate_results.append((label, pm, ps, pol, s))

        if liveness_passes(s):
            dist = abs(s["action"] - 0.45) + abs(s["hold"] - 0.35) + abs(s["recall"] - 0.20)
            if dist < best_dist:
                best_dist, best_label, best_shares = dist, label, s
                best_pol, best_pm, best_ps = pol, pm, ps

    print(HBAR70d)
    if best_label:
        print(f"  Closest to ideal (45/35/20): {best_label}")
        print(f"    action={best_shares['action']:.1%}  hold={best_shares['hold']:.1%}  "
              f"recall={best_shares['recall']:.1%}")
    else:
        print("  No candidate passes liveness targets without hull-threat surcharge.")

    # ── Hull-threat surcharge sweep ────────────────────────────────────────────
    print()
    print(HBAR70)
    print("HULL-THREAT SURCHARGE SWEEP (added to Hold + Action costs to lift Recall share)")
    print("  Rationale: if Recall is never optimal, add a surcharge representing hull-")
    print("  degradation risk of continuing. Even a small surcharge tips Recall optimal")
    print("  in late-run, short-tail states where remaining yield is small.")
    print(HBAR70d)
    print(f"  Candidate A (minor(4,8) serious(12,22)) — surcharge sensitivity:")
    print(f"  {'Surcharge':>10}  {'Action':>7} {'Hold':>6} {'Recall':>7}  {'Verdict'}")
    print("  " + "-" * 55)

    best_surcharge_label = None
    best_surcharge_val   = None
    best_surcharge_shares = None
    best_surcharge_dist  = float("inf")

    # Check surcharge sensitivity for candidate A (most likely to pass or be closest)
    # Also check all candidates at each surcharge
    for surcharge in HULL_SURCHARGES:
        for label, pm, ps in CANDIDATES:
            pol = solve_policy_with_surcharge(pm, ps, surcharge)
            s   = option_shares(pol)
            if label == CANDIDATES[0][0]:  # print A only for this table
                print(f"  {surcharge:>10.1f}  {s['action']:>7.1%} {s['hold']:>6.1%} {s['recall']:>7.1%}  {liveness_label(s)}")
            if liveness_passes(s):
                dist = abs(s["action"] - 0.45) + abs(s["hold"] - 0.35) + abs(s["recall"] - 0.20)
                if dist < best_surcharge_dist:
                    best_surcharge_dist   = dist
                    best_surcharge_label  = label
                    best_surcharge_val    = surcharge
                    best_surcharge_shares = s
                    best_pol_s, best_pm_s, best_ps_s = pol, pm, ps

    print()
    print(f"  Best across all candidates + surcharges:")
    if best_surcharge_label:
        print(f"    {best_surcharge_label}  surcharge={best_surcharge_val:.1f}u")
        print(f"    action={best_surcharge_shares['action']:.1%}  "
              f"hold={best_surcharge_shares['hold']:.1%}  "
              f"recall={best_surcharge_shares['recall']:.1%}  "
              f"dist={best_surcharge_dist:.3f}")
    else:
        print("    No passing config found.")

    # ── 2D sweep: the action-wear lever the surcharge-only sweep was missing ────
    passing_2d = print_2d_sweep()

    # ── Best candidate example rows ────────────────────────────────────────────
    print()
    print(HBAR70)
    print("EXAMPLE POLICY ROWS")
    print(HBAR70d)

    # Print for no-surcharge best (or A if none)
    if best_label:
        print_example_rows(best_pol, best_label, best_pm, best_ps, surcharge=0.0)
    else:
        # Fall back to candidate A
        _, pm_a, ps_a = CANDIDATES[0][0], CANDIDATES[0][1], CANDIDATES[0][2]
        pol_a = solve_policy(pm_a, ps_a)
        print_example_rows(pol_a, CANDIDATES[0][0], pm_a, ps_a, surcharge=0.0)

    # Print for surcharge best if different
    if best_surcharge_label and (best_surcharge_val != 0.0 or best_surcharge_label != best_label):
        print()
        print(f"  (with hull-threat surcharge +{best_surcharge_val:.1f}u)")
        print_example_rows(best_pol_s, best_surcharge_label, best_pm_s, best_ps_s,
                            surcharge=best_surcharge_val)

    # ── Verdict ────────────────────────────────────────────────────────────────
    print()
    print(HBAR70)
    print("VERDICT")
    print(HBAR70d)

    # Summarise baseline vs recommended
    live_pol = solve_policy_live()
    live_s   = option_shares(live_pol)
    print()
    print(f"  CURRENT (live, fixed 5/16, meters cosmetic):")
    print(f"    action={live_s['action']:.1%}  hold={live_s['hold']:.1%}  "
          f"recall={live_s['recall']:.1%}  [{liveness_label(live_s)}]")

    print()
    if best_label:
        print(f"  RECOMMENDED (no hull-threat surcharge): {best_label}")
        print(f"    action={best_shares['action']:.1%}  hold={best_shares['hold']:.1%}  "
              f"recall={best_shares['recall']:.1%}  [{liveness_label(best_shares)}]")
    else:
        print("  No zero-surcharge candidate passes — Recall never optimal without surcharge.")

    if best_surcharge_label and best_surcharge_val > 0:
        print()
        print(f"  WITH hull-threat surcharge: {best_surcharge_label} + surcharge={best_surcharge_val:.1f}u")
        print(f"    action={best_surcharge_shares['action']:.1%}  "
              f"hold={best_surcharge_shares['hold']:.1%}  "
              f"recall={best_surcharge_shares['recall']:.1%}  "
              f"[{liveness_label(best_surcharge_shares)}]")

    print()
    print("  Design note — the knob that unlocks Recall:")
    print(f"    Without a hull-threat surcharge, the cost of continuing = action or hold cost,")
    print(f"    and remaining yield (what Recall forfeits) is always ≥ those costs for")
    print(f"    moderate tail lengths. Adding a per-window surcharge representing hull-")
    print(f"    degradation risk (e.g. +4–6u) makes Recall optimal when remaining yield")
    print(f"    is low (late run, short tail) — precisely when a cautious player should bank.")

    print()
    print("  Worked example for design doc:")
    # serious window, late (f=0.75) 60-min run, low meter (λ=0.3), candidate A, no surcharge
    sev, lam, f_ex, tail_ex = "serious", 0.3, 0.75, 60
    pm_rec = CANDIDATES[0][1]  # candidate A minor range
    ps_rec = CANDIDATES[0][2]  # candidate A serious range
    if best_label:
        for lbl, pm, ps in CANDIDATES:
            if lbl == best_label:
                pm_rec, ps_rec = pm, ps
                break
    h_loss = hold_expected_loss(sev, lam, pm_rec, ps_rec)
    fut_h  = future_window_expected_cost(lam, f_ex, pm_rec, ps_rec)
    fut_a  = future_window_expected_cost(METER_AFTER_ACTION, f_ex, pm_rec, ps_rec)
    c_hold = h_loss + fut_h
    c_act  = ACTION_UNIT_COST + fut_a
    c_rec  = remaining_yield(tail_ex, f_ex)
    pol_rec = solve_policy(pm_rec, ps_rec)
    opt_rec = pol_rec[State(sev, lam, f_ex, tail_ex)]
    print(f"    \"Serious window at 75% elapsed of a 60-min run with λ=0.3 (low Signal Lock):")
    print(f"     Hold expects {c_hold:.1f}u lost (range lo={ps_rec[0]}+(1−0.3)×{ps_rec[1]-ps_rec[0]}={h_loss:.1f}u this window")
    print(f"     + {fut_h:.2f}u future), Action costs {c_act:.1f}u ({ACTION_UNIT_COST:.1f}u wear + {fut_a:.2f}u future,")
    print(f"     resets meter to 0.9), Recall forfeits {c_rec:.0f}u. Optimal: {opt_rec.upper()}.\"")

    print()
    print(HBAR70)
    print(f"Constants: ACTION_UNIT_COST = {MATCHING_ACTION_WEAR_CONDITION} × (60/55) = {ACTION_UNIT_COST:.4f}u")
    print(f"           Liveness targets: ≥{LIVENESS_MIN:.0%} and ≤{LIVENESS_MAX:.0%} per option")
    print(f"           State space: {len(SEVERITIES)} sev × {len(METER_LEVELS)} λ × "
          f"{len(RUN_FRACTIONS)} f × {len(TAIL_MINUTES)} tails = "
          f"{len(SEVERITIES)*len(METER_LEVELS)*len(RUN_FRACTIONS)*len(TAIL_MINUTES)} states")

if __name__ == "__main__":
    main()
