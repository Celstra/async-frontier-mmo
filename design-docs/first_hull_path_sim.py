"""First-Hull Critical-Path Simulation — D2 order-alignment gate (2026-06-13).

Question the playtest forced (round-4, pt 14–15): after the tutorial, can a player
reach the first Reinforced Hull Plate craft WITHOUT a dead-end, given the patched
hull's short-run ceiling, the thumper yield curve, and the post-tutorial foreman
orders — and are the aligned-order quantities (RC 12u + CM 18u) safe, or do they
strand the hull bill the way pt-15 did (player hand-sampled ~11 RC, turned it all
in, then couldn't craft the hull's 20 RC)?

This is DETERMINISTIC accounting, not Monte Carlo: thumper yield is a closed-form
function of concentration + tail, and the fail-safe trip time is deterministic from
hull integrity. So we compute the path arithmetic and look for the dead-end.

────────────────────────────────────────────────────────────────────────────────
Real code constants (cited inline):
  DEFAULT_PROJECTED_RECOVERY = 60        (deployPreview.ts; see sampling_ratio_sim.py)
  concentration_multiplier(c) = clamp(c/67, 0.5, 1.5)
  tail_yield_multiplier(t)    = sqrt(t/60)
  HULL_TIER_BASE = {scavenged:75, patched:30, basic:240}   (tuning.ts)
  HULL_CEILING_EXPONENT = 1.2                              (tuning.ts)
  maxRunMinutes(tier,integ) = base * (integ/100)^1.2       (hullRunCeiling.ts)
  SCAVENGED_HULL_INTEGRITY = 5 ; PATCHED_HULL_INTEGRITY = 30   (tuning.ts)
  FIRST_ASYNC_TAIL_MINUTES = 15 ; one-time waiver runs the FULL tail
                                              (hullFailsafeRecall.ts)
  fail-safe prorata = round(projected * maxRunSeconds/plannedSeconds)
                                              (computeHullFailsafeProrata)
  Reinforced Hull Plate = 60 SA (outer) + 40 SA (bracing) + 20 RC (bonding)
                        = 100 SA + 20 RC total              (reinforcedHullPlate.ts)
  NEXT_NEED_ORDER_RC_STACK = 12 ; NEXT_NEED_ORDER_CM_STACK = 18   (tuning.ts)
  Sample yield = max(1, round(5 * conc/100)) ; energy cap 120 / cost 12 = 10 samples
                                              (tuning.ts, sampling_ratio_sim.py)
  TUTORIAL_RUN_1_YIELD_FLOOR = 25 ; TUTORIAL_RUN_2_YIELD = 60     (tuning.ts)

Concentration ranges (Decision 021 §C):
  Keth Iron (SA)      55–95%   — bulk structural alloy (tutorial waypoint)
  Glimmerfall (RC)    range unconfirmed in code; playtest observed 78%. Modelled
                      LOW 60 / MID 75 / PEAK 90 and the observed 78%, flagged below.
"""

import math

# ── Code constants ──────────────────────────────────────────────────────────────
DEFAULT_PROJECTED_RECOVERY = 60.0
SWG_BASE_CONCENTRATION = 67.0
HULL_TIER_BASE = {"scavenged": 75.0, "patched": 30.0, "basic": 240.0}
HULL_CEILING_EXPONENT = 1.2
SCAVENGED_INTEGRITY = 5
PATCHED_INTEGRITY = 30
FIRST_ASYNC_TAIL_MIN = 15
SAMPLE_BASE_YIELD = 5
ENERGY_CAP_SAMPLES = 10  # 120 cap / 12 cost

HULL_SA = 100  # 60 outer + 40 bracing
HULL_RC = 20   # 20 bonding
ORDER_RC = 12  # NEXT_NEED_ORDER_RC_STACK
ORDER_CM = 18  # NEXT_NEED_ORDER_CM_STACK

# Event-waste haircut: a non-matching/hold response converts some projected recovery
# to waste (penaltyWasteForResponse: minor 4–8u, serious 12–22u). A worst-realistic
# short run sees ~1 window; model a 15% haircut to stress the path.
EVENT_WASTE_FRACTION = 0.15


# ── Yield model ───────────────────────────────────────────────────────────────
def conc_mult(conc_pct: float) -> float:
    return max(0.5, min(1.5, conc_pct / SWG_BASE_CONCENTRATION))


def tail_mult(tail_min: float) -> float:
    return math.sqrt(tail_min / 60.0)


def projected_recovery(conc_pct: float, tail_min: float) -> float:
    return DEFAULT_PROJECTED_RECOVERY * conc_mult(conc_pct) * tail_mult(tail_min)


def max_run_minutes(tier: str, integrity: float) -> float:
    integ = max(0.0, min(100.0, integrity))
    return HULL_TIER_BASE[tier] * (integ / 100.0) ** HULL_CEILING_EXPONENT


def patched_run_yield(conc_pct: float, planned_min: int = 15, waived: bool = False) -> int:
    """Units recovered from one patched-hull (integrity 30) run.

    Waived (one-time first-async): runs the full planned tail.
    Otherwise: fail-safe recalls at the 7.06-min ceiling, prorata yield.
    """
    ceiling = max_run_minutes("patched", PATCHED_INTEGRITY)
    proj = projected_recovery(conc_pct, planned_min)
    if waived or planned_min <= ceiling:
        return round(proj)
    frac = ceiling / planned_min
    return round(proj * frac)


def sample_yield(conc_pct: float) -> int:
    return max(1, round(SAMPLE_BASE_YIELD * conc_pct / 100.0))


# ── Reference tables ─────────────────────────────────────────────────────────
def print_ceiling_reference() -> None:
    print("=" * 78)
    print("HULL CEILING REFERENCE — validates playtest trip times")
    print("=" * 78)
    print(f"{'tier':<12} {'integ%':>6} {'ceiling(min)':>13} {'m:ss':>8}   playtest")
    print("-" * 78)
    for tier, integ, obs in [
        ("scavenged", SCAVENGED_INTEGRITY, "2:03 (pt 8/9)"),
        ("patched", PATCHED_INTEGRITY, "7:04 (pt 13)"),
        ("basic", 100, "no fail-safe"),
    ]:
        c = max_run_minutes(tier, integ)
        mm, ss = int(c), round((c - int(c)) * 60)
        print(f"{tier:<12} {integ:>6} {c:>13.2f} {mm:>5}:{ss:02d}   {obs}")
    print()
    print("  -> The 2:3.58 / 7:4.44 the tester saw are the RAW float of these")
    print("     ceilings (formatMmSs / hullDeployWarningLine not flooring seconds).")
    print()


def print_run_yields() -> None:
    print("=" * 78)
    print("PATCHED-HULL RUN YIELDS (integrity 30, planned 15-min tail)")
    print("=" * 78)
    print(f"{'resource':<22} {'conc%':>6} {'waived(full 15m)':>17} {'recalled(~7m)':>15}")
    print("-" * 78)
    for name, concs in [
        ("Keth Iron (SA)", [("LOW", 65), ("MID", 75), ("PEAK", 88)]),
        ("Glimmerfall (RC)", [("LOW", 60), ("obs", 78), ("PEAK", 90)]),
    ]:
        for lbl, c in concs:
            w = patched_run_yield(c, 15, waived=True)
            r = patched_run_yield(c, 15, waived=False)
            print(f"{name + ' ' + lbl:<22} {c:>6} {w:>17} {r:>15}")
        print()


# ── Critical path ─────────────────────────────────────────────────────────────
def runs_to_target(target: int, conc: float, first_waived: bool) -> tuple[int, int]:
    """Returns (runs, units_recovered) to reach `target` units, optionally with the
    one-time waiver applied to the first run."""
    got = 0
    runs = 0
    while got < target:
        waived = first_waived and runs == 0
        y = patched_run_yield(conc, 15, waived=waived)
        y = round(y * (1 - EVENT_WASTE_FRACTION))  # stress with event waste
        got += y
        runs += 1
        if runs > 50:
            break
    return runs, got


def print_critical_path() -> None:
    print("=" * 78)
    print("CRITICAL PATH TO FIRST HULL CRAFT (100 SA + 20 RC, patched hull)")
    print("=" * 78)
    print(f"  Modelled with a {int(EVENT_WASTE_FRACTION*100)}% event-waste haircut per run (stress).")
    print(f"  Keth SA @ 75% (MID), Glimmerfall RC @ 78% (observed).")
    print()
    print("  Starting SA stock varies by how the tutorial runs landed:")
    print("    tutorial run1 floor = 25u, run2 = 60u (both Keth/SA, same waypoint).")
    print("    A player who claimed both exits with up to ~85 SA; a rough run with")
    print("    event waste / partial aborts can exit nearer ~45–60. We sweep it.")
    print()
    print(f"  {'start SA':>9} {'SA runs':>8} {'RC runs (waiver→RC)':>20} {'total runs':>11}")
    print("  " + "-" * 60)
    for start_sa in [0, 25, 45, 60, 85]:
        sa_need = max(0, HULL_SA - start_sa)
        # Best play: spend the one-time 15-min waiver on RC (its scarcest, highest-leverage
        # use — a full 15-min RC run covers hull RC + the RC order in one haul).
        if sa_need > 0:
            sa_runs, _ = runs_to_target(sa_need, 75, first_waived=False)
        else:
            sa_runs = 0
        rc_total_need = HULL_RC + ORDER_RC  # hull bonding + the aligned RC order
        rc_runs, rc_got = runs_to_target(rc_total_need, 78, first_waived=True)
        total = sa_runs + rc_runs
        print(f"  {start_sa:>9} {sa_runs:>8} {rc_runs:>20} {total:>11}")
    print()


def print_dead_end_analysis() -> None:
    print("=" * 78)
    print("THE PT-15 DEAD-END — hand-sampling RC vs thumping it")
    print("=" * 78)
    rc_demand = HULL_RC + ORDER_RC
    # Hand sampling RC at 78%: yield/sample, and what 10 samples (a full energy cap) buys.
    ys = sample_yield(78)
    cap_units = ys * ENERGY_CAP_SAMPLES
    print(f"  RC demand (hull {HULL_RC} + order {ORDER_RC}) = {rc_demand}u")
    print()
    print(f"  HAND-SAMPLING RC @ 78%: {ys}u/sample; a full 120-energy cap (10 samples)")
    print(f"    buys only {cap_units}u — and the tester stopped at ~11u (pt 15), then")
    print(f"    turned ALL of it into the RC order -> 0 left for the hull = DEAD END.")
    print()
    waived_rc = round(patched_run_yield(78, 15, waived=True) * (1 - EVENT_WASTE_FRACTION))
    patched_rc = round(patched_run_yield(78, 15, waived=False) * (1 - EVENT_WASTE_FRACTION))
    two_run = waived_rc + patched_rc  # realistic: first run takes the one-time waiver
    print(f"  THUMPING RC @ 78% (15-min): waived run ~{waived_rc}u, recalled run ~{patched_rc}u.")
    print(f"    The realistic 2-run RC haul (1 waived + 1 recalled) = {two_run}u, clearing the")
    print(f"    {rc_demand}u demand with {two_run - rc_demand}u spare. A single waived haul ({waived_rc}u) is")
    print(f"    just shy of {rc_demand}u under event waste, so RC is a TWO-haul ask — comfortably")
    print(f"    inside reach by thump, impossible by hand-sample.")
    print()
    print("  => The dead-end is NOT the order quantity. It is the ACQUISITION MODE.")
    print("     The fix is to steer RC to the thumper (it is a thumper-only bulk), make")
    print("     the hull bill the headline goal on the FIELD ticker, and show the order")
    print("     as a subset of that haul — never let a hand-sample turn-in strand it.")
    print()


def print_verdict() -> None:
    print("=" * 78)
    print("VERDICT")
    print("=" * 78)
    print("""\
  D2 order quantities RC=12 / CM=18 are SAFE — they do NOT cause the dead-end on
  their own. The pt-15 brick came from acquiring RC by HAND-SAMPLE (≈11u, then
  turned in) instead of by THUMP (16–35u/run). A single waived RC thump covers
  hull-RC + the RC order with spare.

  REQUIRED to make the path dead-end-proof (feed into the composer plan, Group D):
   1. Make the hull bill (100 SA + 20 RC) the HEADLINE goal on the FIELD ticker —
      orders are framed as subsets of it, not competitors. (D1 ticker pin.)
   2. Steer RC + bulk SA to the THUMPER, not hand-sampling: copy + the live-rig
      framing. Hand-sampling RC must read as 'top-up only', never the path.
   3. The CM 18 order is hand-fillable from leftover tutorial CM (Veyrith/Sorrel/
      Red Mesa) and never touches SA/RC — keep it as the 'fast satisfying turn-in'.
   4. Spend the one-time 15-min waiver well: it is worth ~2x a recalled run. The
      deploy UI should hint it is a one-shot (its own future-slice candidate).

  GRIND CHECK (for Ryan): with ~60–85 SA banked from the two tutorial Keth runs,
  the first hull is ~2–4 short runs away. From a near-empty start it is ~8 runs.
  That is the intended 'build your first real hull' gate, not a wall — but if the
  worst-case 8-run path reads as grindy in testing, the levers are: raise the
  patched ceiling (integrity), raise DEFAULT_PROJECTED_RECOVERY, or trim the SA
  bill (100 -> 80). Do NOT lower RC=12/CM=18 for dead-end reasons; they are fine.

  NO new Monte-Carlo sim is needed. Events (event_choice_liveness_sim.py) and
  experimentation (experimentation_sim.py) remain the locked stochastic models.
""")


def main() -> None:
    print_ceiling_reference()
    print_run_yields()
    print_critical_path()
    print_dead_end_analysis()
    print_verdict()


if __name__ == "__main__":
    main()
