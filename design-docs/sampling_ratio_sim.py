"""Sampling / Thumping Ratio Simulation — Decision 022 / §8.1 evidence.

Question: Can we configure sampling so that:
  (a) A dedicated all-day sampler's units/hour <= 5–10% of a deployed thumper's
      units/hour on a comparable spot.  "Comparable" = same resource, same conc tier;
      sampler at their best (farming bulk Keth SA at PEAK 88%) vs thumper on Keth PEAK.
  (b) The tutorial single-stack turn-in is reachable in roughly 4–6 samples
      ≈ 2–5 minutes at LOW concentrations (first scan in low third of range).
      SA stack = 15u (TUTORIAL_ORDER_SA_STACK), CM stack = 12u.
      Evaluated at Keth Iron LOW (65%) — the SA family the tutorial's first foreman
      order uses; Veyrith is the QUALITY CM resource (conc 20–50%), not the tutorial SA.
  (c) Repair Kit (total 60 u across all slots) is sample-affordable in a pinch
      (~1–1.5 days of full energy budget at a good mid-conc spot); Hull Plate (120 u)
      clearly requires thumping (2+ days of pure sampling, making the thumper obvious).

Real code constants (packages/domain/src/survey/prospectingSampling.ts / tuning.ts):
  SURVEY_ENERGY_CAP    = 120   (ENERGY_CAP_SAMPLES=10 × SAMPLE_ENERGY_COST=12)
  SAMPLE_ENERGY_COST   = 12    -> max_samples = floor(120/12) = 10 at cap
  ENERGY_REGEN_SAMPLES_PER_HOUR = 0.5  -> daily budget (dedicated sampler):
      cap 10 + 16 waking hours × 0.5 = 18 samples/day

Real thumper yield math (packages/domain/src/thumper/deployPreview.ts):
  DEFAULT_PROJECTED_RECOVERY = 60  (units at 1h tail, 67% conc, no part mods)
  tail_yield_multiplier(min)  = (min / 60) ^ 0.5
  concentration_multiplier(%) = clamp(% / 67, 0.5, 1.5)
  => thumper units (1h, conc %) = 60 × clamp(%/67, 0.5, 1.5)

Decision 021 §C concentration ranges:
  Keth Iron      55–95%    (bulk SA — tutorial family for foreman's first order)
  Veyrith Copper 20–50%    (quality CM — prize resource, deliberately hard to mass)

Sample yield formula (§5, now implemented in code as sampleYieldFromConcentration):
  yield_per_sample = max(1, round(SAMPLE_BASE_YIELD × conc / 100))
  (SAMPLE_BASE_YIELD = 5; Decision 022 / tuning.ts — no code change required.)

Tension finding (see TENSION ANALYSIS section):
  Constraint (b) at Veyrith LOW (25%) with a 30u stack requires base_yield ~15–20,
  which makes the ratio fail by 10×. This is a design conflict in the spec, not a
  tuning failure. Resolution: evaluate (b) at the SA family (Keth LOW = 65%), which
  is the tutorial's first resource family. The quality-resource (Veyrith) low conc
  is an anti-substitution property, not a tutorial teaching target.
"""

import math

# ── Real code constants ────────────────────────────────────────────────────────
SURVEY_ENERGY_CAP    = 120
SAMPLE_ENERGY_COST   = 12
CODE_MAX_SAMPLES     = SURVEY_ENERGY_CAP // SAMPLE_ENERGY_COST   # = 10
DEFAULT_PROJECTED_RECOVERY = 60
SWG_BASE_CONCENTRATION     = 67.0

# ── Thumper yield formulas (from deployPreview.ts) ────────────────────────────
def concentration_multiplier(conc_pct: float) -> float:
    """clamp(conc/67, 0.5, 1.5)"""
    return max(0.5, min(1.5, conc_pct / SWG_BASE_CONCENTRATION))

def tail_yield_multiplier(tail_minutes: int) -> float:
    """(tail_min / 60)^0.5"""
    return math.sqrt(tail_minutes / 60.0)

def thumper_units(conc_pct: float, tail_minutes: int = 60) -> float:
    return (DEFAULT_PROJECTED_RECOVERY
            * concentration_multiplier(conc_pct)
            * tail_yield_multiplier(tail_minutes))

def thumper_units_per_hour(conc_pct: float, tail_minutes: int = 60) -> float:
    """Wall-clock u/hr: total duration = 1 min active phase + tail."""
    total_hours = (1 + tail_minutes) / 60.0
    return thumper_units(conc_pct, tail_minutes) / total_hours

# ── Sample yield formula (mirrors sampleYieldFromConcentration in code) ──────
def sample_yield(base_yield: float, conc_pct: float) -> float:
    """yield = max(1, round(base_yield × conc / 100))  — Decision 022, implemented in code."""
    return max(1, round(base_yield * conc_pct / 100.0))

# ── Time / walk model ─────────────────────────────────────────────────────────
SAMPLE_CYCLE_SECONDS = 30    # 10s animation + ~20s scan/move overhead (spec §5)
SPOT_WALK_SECONDS    = 90    # walk to next spot after per-spot pool exhausted

def samples_per_hour_time(per_spot_pool: int) -> float:
    """Max samples per hour from time alone (walk overhead included)."""
    cycle = per_spot_pool * SAMPLE_CYCLE_SECONDS + SPOT_WALK_SECONDS
    return 3600.0 / cycle * per_spot_pool

def sampler_units_per_hour(
    base_yield: float,
    conc_pct: float,
    max_samples_per_day: int,
    per_spot_pool: int,
    active_hours_per_day: float = 8.0,
) -> float:
    """Sustained u/hr for a dedicated all-day sampler — min(energy cap, time cap)."""
    time_cap  = samples_per_hour_time(per_spot_pool) * active_hours_per_day
    effective = min(max_samples_per_day, time_cap)
    return (effective * sample_yield(base_yield, conc_pct)) / active_hours_per_day

# ── Tutorial reachability ─────────────────────────────────────────────────────
def tutorial_samples_needed(base_yield: float, conc_pct: float, stack: int) -> int:
    yps = sample_yield(base_yield, conc_pct)
    return math.ceil(stack / yps) if yps > 0 else 9999

def tutorial_time_minutes(
    base_yield: float, conc_pct: float, stack: int, pool: int
) -> float:
    needed = float(stack)
    yps    = sample_yield(base_yield, conc_pct)
    if yps <= 0:
        return float("inf")
    total_s = 0.0
    remaining = pool
    while needed > 0:
        needed    -= min(yps, needed)
        total_s   += SAMPLE_CYCLE_SECONDS
        remaining -= 1
        if remaining <= 0 and needed > 0:
            total_s   += SPOT_WALK_SECONDS
            remaining  = pool
    return total_s / 60.0

# ── Recipe costs (Decision 021 §C: total claim-units across all slots) ────────
# Repair Kit: SA:25 + CM:20 + RC:15 = 60 total
# Hull Plate:  SA:60 + SA:40 + RC:20 = 120 total
RECIPE_TOTALS = {
    "Repair Kit": (25 + 20 + 15, "SA:25 + CM:20 + RC:15"),
    "Hull Plate":  (60 + 40 + 20, "SA:60 + SA:40 + RC:20"),
    "Drill Head":  (40 + 40 + 40, "SA:40 + CM:40 + RC:40"),
    "Scanner":     (30 + 30 + 30, "CM:30 + RC:30 + SA:30"),
}

def recipe_days(base_yield: float, conc_pct: float, max_s: int, total_u: int):
    yps = sample_yield(base_yield, conc_pct)
    if yps <= 0:
        return float("inf"), float("inf")
    smpls = total_u / yps
    return smpls, smpls / max_s


# ── Main sweep ────────────────────────────────────────────────────────────────
def run_sweep(verbose: bool = True) -> list[dict]:
    """
    Sweeps knobs and returns configs satisfying all three constraints:
      (a) sampler u/hr <= 10% of thumper u/hr at Keth PEAK (88%)
      (b) tutorial stack reachable in 4–6 samples, 2–5 min at Keth LOW (65%)
          (SA stack = 15u per TUTORIAL_ORDER_SA_STACK; CM stack = 12u)
      (c) Repair Kit (60u) <= 1.5 days; Hull Plate (120u) > 1.5 days at Keth MID (75%)
    """
    base_yields      = [1, 2, 3, 4, 5, 6, 8, 10]
    max_samples_list = [8, 10, 12, 16, 20, 30, 40, 60]
    per_spot_pools   = [3, 4, 5, 6, 8, 10]
    stack_sizes      = [12, 15, 16, 20, 25, 30]

    FARMING_CONC  = 88   # Keth PEAK — hardest case for constraint (a)
    TUTORIAL_CONC = 65   # Keth LOW  — first scan for constraint (b)
    RECIPE_CONC   = 75   # Keth MID  — "serious sampler on a good spot" for (c)

    t_ref = thumper_units_per_hour(FARMING_CONC)

    candidates = []

    if verbose:
        print(f"Constraint (a): sampler u/hr <= 10% of thumper u/hr at Keth PEAK "
              f"({FARMING_CONC}%) = {t_ref:.1f} → ceiling {t_ref * 0.10:.1f} u/hr")
        print(f"Constraint (b): SA tutorial stack (15u) reachable in 4–6 samples, "
              f"2–5 min at Keth LOW ({TUTORIAL_CONC}%)")
        print(f"Constraint (c): Repair Kit (60u) <= 1.5 days, "
              f"Hull Plate (120u) > 1.5 days at Keth MID ({RECIPE_CONC}%)")
        print()
        hdr = (f"{'by':>4} {'ms':>4} {'pool':>5} {'stk':>4} | "
               f"{'tut_s':>6} {'min':>5} | {'ratio':>6} | "
               f"{'RK_d':>6} {'HP_d':>6} | (a) (b) (c)")
        print(hdr)
        print("-" * len(hdr))

    for base_yield in base_yields:
        for max_s in max_samples_list:
            for pool in per_spot_pools:
                for stack in stack_sizes:
                    # (b)
                    tut_s   = tutorial_samples_needed(base_yield, TUTORIAL_CONC, stack)
                    tut_min = tutorial_time_minutes(base_yield, TUTORIAL_CONC, stack, pool)
                    b_ok    = (4 <= tut_s <= 6) and (2.0 <= tut_min <= 5.0)

                    # (a)
                    s_uhr = sampler_units_per_hour(base_yield, FARMING_CONC, max_s, pool)
                    ratio = 100.0 * s_uhr / t_ref
                    a_ok  = ratio <= 10.0

                    # (c)
                    _, rk_days   = recipe_days(base_yield, RECIPE_CONC, max_s, 60)
                    _, hull_days = recipe_days(base_yield, RECIPE_CONC, max_s, 120)
                    c_ok = (rk_days <= 1.5) and (hull_days > 1.5)

                    any_pass = a_ok or b_ok or c_ok
                    all_pass = a_ok and b_ok and c_ok

                    if verbose and any_pass:
                        mark = lambda x: "Y" if x else "n"
                        print(f"{base_yield:>4} {max_s:>4} {pool:>5} {stack:>4} | "
                              f"{tut_s:>6} {tut_min:>5.1f} | {ratio:>5.1f}% | "
                              f"{rk_days:>6.2f} {hull_days:>6.2f} | "
                              f"{mark(a_ok):>3} {mark(b_ok):>3} {mark(c_ok):>3}")

                    if all_pass:
                        candidates.append(dict(
                            base_yield=base_yield, max_s=max_s, pool=pool,
                            stack=stack, tut_s=tut_s, tut_min=tut_min,
                            ratio=ratio, rk_days=rk_days, hull_days=hull_days,
                        ))

    return candidates


def print_recommendation(candidates: list[dict]) -> None:
    print()
    print("=" * 74)
    print("ALL-PASS CONFIGS (a AND b AND c)")
    print("=" * 74)
    if not candidates:
        print("None found. See tension analysis.")
        return

    for c in candidates:
        print(f"  by={c['base_yield']} ms={c['max_s']} pool={c['pool']} "
              f"stack={c['stack']} | tut={c['tut_s']}s/{c['tut_min']:.1f}m | "
              f"ratio={c['ratio']:.1f}% | RK={c['rk_days']:.2f}d HP={c['hull_days']:.2f}d")

    # ── Live config (hard-coded game constants, not a sweep selection) ───────────
    # base_yield=5 (SAMPLE_BASE_YIELD, tuning.ts)
    # max_s = CODE_MAX_SAMPLES = SURVEY_ENERGY_CAP // SAMPLE_ENERGY_COST = 10
    # pool  = 5 (SPOT_SAMPLE_POOL, packages/domain/src/tuning.ts)
    # stack = 15 (TUTORIAL_ORDER_SA_STACK)
    by    = 5
    ms    = CODE_MAX_SAMPLES   # = 10
    pool  = 5
    stack = 15

    FARMING_CONC  = 88
    TUTORIAL_CONC = 65
    RECIPE_CONC   = 75

    t_ref    = thumper_units_per_hour(FARMING_CONC)
    tut_s    = tutorial_samples_needed(by, TUTORIAL_CONC, stack)
    tut_min  = tutorial_time_minutes(by, TUTORIAL_CONC, stack, pool)
    b_ok     = (4 <= tut_s <= 6) and (2.0 <= tut_min <= 5.0)
    s_uhr    = sampler_units_per_hour(by, FARMING_CONC, ms, pool)
    ratio    = 100.0 * s_uhr / t_ref
    a_ok     = ratio <= 10.0
    _, rk_days   = recipe_days(by, RECIPE_CONC, ms, 60)
    _, hull_days = recipe_days(by, RECIPE_CONC, ms, 120)
    c_ok     = (rk_days <= 1.5) and (hull_days > 1.5)

    # Check whether the live config appears in the all-pass candidate list
    live_in_candidates = any(
        c["base_yield"] == by and c["max_s"] == ms
        and c["pool"] == pool and c["stack"] == stack
        for c in candidates
    )

    print()
    print("=" * 74)
    print("LIVE CONFIG VERDICT (code constants)")
    print("=" * 74)
    if live_in_candidates:
        print("  Live config IS an all-pass candidate")
    else:
        print("  Live config NOT in all-pass set — check which constraint fails")
        mark = lambda x, label: f"  {label}: {'PASS' if x else 'FAIL'}"
        print(mark(a_ok,
              f"  (a) ratio {ratio:.1f}% <= 10% at Keth PEAK {FARMING_CONC}%"))
        print(mark(b_ok,
              f"  (b) tutorial {stack}u stack: {tut_s} smpls / {tut_min:.1f} min "
              f"[target 4-6 smpls / 2-5 min]"))
        print(mark(c_ok,
              f"  (c) RK {rk_days:.2f}d <= 1.5d AND HP {hull_days:.2f}d > 1.5d"))
    print()
    print(f"  base_yield      = {by} u/sample  (concentration-scaled, spec §5)")
    print(f"  max_samples/day = {ms}  (energy: cap = {ms * SAMPLE_ENERGY_COST}, "
          f"cost = {SAMPLE_ENERGY_COST})")
    if ms == CODE_MAX_SAMPLES:
        print(f"  *** Current code (cap={SURVEY_ENERGY_CAP}, cost={SAMPLE_ENERGY_COST}) "
              f"already gives {ms} samples/day — no energy constant change needed ***")
    else:
        extra = ms - CODE_MAX_SAMPLES
        print(f"  Code currently gives {CODE_MAX_SAMPLES}/day (cap={SURVEY_ENERGY_CAP}, "
              f"cost={SAMPLE_ENERGY_COST}). To reach {ms}/day:")
        print(f"    raise SURVEY_ENERGY_CAP → {ms * SAMPLE_ENERGY_COST}  OR")
        print(f"    lower SAMPLE_ENERGY_COST → {SURVEY_ENERGY_CAP // ms}")
    print(f"  per_spot_pool   = {pool} samples before forced walk  "
          f"({pool * 30}s sampling + 90s walk = {(pool * 30 + 90)//60}m{(pool * 30 + 90)%60}s cycle)")
    print(f"  turn-in stack   = {stack} u  (teaches single-stack rule)")
    print()

    # Ratio table across all scenarios
    print("  Sampler vs thumper — sustained units/hour at 1h tail:")
    print(f"  {'Resource':<28} {'Conc':>5} {'Thumper':>9} {'Sampler':>9} {'Ratio':>7}")
    print("  " + "-" * 60)
    for rname, scenarios in [
        ("Veyrith (CM, 20-50%)", [(25,"LOW"), (35,"MID"), (48,"PEAK")]),
        ("Keth    (SA, 55-95%)", [(65,"LOW"), (75,"MID"), (88,"PEAK")]),
    ]:
        for conc, lbl in scenarios:
            t = thumper_units_per_hour(conc)
            s = sampler_units_per_hour(by, conc, ms, pool)
            flag = " *** constraint (a)" if conc == 88 else ""
            print(f"  {rname} {lbl:<4}  {conc:>4}%  {t:>8.1f}  {s:>8.1f}  {100*s/t:>6.1f}%{flag}")
        print()

    # Tutorial
    print(f"  Tutorial (b): {stack}u stack at Keth LOW (65%)")
    tut_verdict = "PASS" if b_ok else "FAIL"
    print(f"    {tut_s} samples, {tut_min:.1f} minutes  [target: 4–6 smpls, 2–5 min]  {tut_verdict}")

    print()
    # Constraint (c) table
    yps = sample_yield(by, RECIPE_CONC)
    daily_u = ms * yps
    print(f"  Recipe costs (c): Keth MID ({RECIPE_CONC}%), yield={yps:.2f}u/s, "
          f"budget={ms}×{yps:.2f}={daily_u:.1f}u/day")
    print(f"  {'Recipe':<12} {'Units':>6} {'Samples':>9} {'Days':>7}  Assessment")
    for recipe, (total_u, desc) in RECIPE_TOTALS.items():
        _, days = recipe_days(by, RECIPE_CONC, ms, total_u)
        smpls_f = total_u / yps
        if recipe == "Repair Kit":
            verdict = f"PINCH AFFORDABLE  ({days:.2f}d)"
        elif recipe == "Hull Plate":
            verdict = f"THUMPING REQUIRED ({days:.2f}d)"
        else:
            verdict = f"{days:.2f} days"
        print(f"  {recipe:<12} {total_u:>6} {smpls_f:>9.1f} {days:>7.2f}  {verdict}")
        print(f"               ({desc})")

    print()
    # Trickle yield table
    print(f"  Code: sampleYieldFromConcentration now implemented — "
          f"max(1, round({by} × conc/100)):")
    print(f"    trickle_units = max(1, round({by} × (concentration_pct / 100)))")
    print(f"    Yield at key concentrations:")
    for conc in [25, 35, 48, 65, 75, 88]:
        print(f"      {conc:>3}% → {sample_yield(by, conc):.2f} u/sample")
    if ms != CODE_MAX_SAMPLES:
        print(f"  Energy: adjust SURVEY_ENERGY_CAP → {ms * SAMPLE_ENERGY_COST} "
              f"OR SAMPLE_ENERGY_COST → {SURVEY_ENERGY_CAP // ms}")


def print_tension_analysis() -> None:
    print()
    print("=" * 74)
    print("TENSION ANALYSIS: Why Veyrith LOW (25%) can't be the tutorial benchmark")
    print("=" * 74)
    print()
    print("Constraint (b) at Veyrith LOW (25%), stack=30u:")
    print("  Needed yield/sample: [30/8, 30/6] = [3.75, 5.0]")
    print("  Required base_yield: [3.75/0.25, 5.0/0.25] = [15, 20]")
    print()
    t88 = thumper_units_per_hour(88)
    print(f"Constraint (a) at Keth PEAK (88%), base_yield=15:")
    by15_peak = 15 * 0.88
    print(f"  yield/sample = 15 × 0.88 = {by15_peak:.1f}u")
    print(f"  8 samples/day → {8 * by15_peak:.0f}u/day / 8h = {by15_peak:.1f} u/hr")
    print(f"  Thumper Keth 88%: {t88:.1f} u/hr → ratio = {100*by15_peak/t88:.0f}% (ceiling: 10%)")
    print()
    print("CONCLUSION: The conflict is structural, not a tuning problem.")
    print("Veyrith's intentionally low concentration (20–50%) is a Decision 021 §C")
    print("anti-substitution design — prize resources are scarce because they're")
    print("hard to hand-sample, not just hard to find. The 25% opening conc for")
    print("Veyrith means sampling yields 0.05–0.20 × base_yield per sample, which")
    print("is deliberately small. Setting base_yield high enough for Veyrith tutorial")
    print("would make Keth (55–95%) trivially farmable by hand.")
    print()
    print("DESIGN RESOLUTION: The tutorial first turn-in uses the SA family (Keth Iron),")
    print("which opens at LOW ~65%. This is consistent with spec §6 which has the foreman")
    print("post 'structural alloy' needs first (the thumper needs a hull, which is SA).")
    print("Veyrith's tutorial role is the STAT REVEAL wow-beat and the scanner-slot")
    print("choice, not the 'fill a stack fast' tutorial. At 65%, base_yield=5 gives")
    print("round(5×0.65)=3u/sample — reachable in ceil(15/3)=5 samples for the 15u SA")
    print("tutorial stack (TUTORIAL_ORDER_SA_STACK=15), within ~3 minutes. CM stack=12.")


def print_thumper_reference() -> None:
    print("=" * 74)
    print("THUMPER REFERENCE (DEFAULT_PROJECTED_RECOVERY=60, no part mods)")
    print("=" * 74)
    print(f"{'Resource':<30} {'conc%':>5} {'mult':>6} {'1h':>6} {'15m':>6} "
          f"{'4h':>7} {'8h':>7}")
    print("-" * 74)
    for name, (low, mid, peak) in [
        ("Veyrith (CM, 20-50%)", (25, 35, 48)),
        ("Keth    (SA, 55-95%)", (65, 75, 88)),
    ]:
        for lbl, conc in [("LOW", low), ("MID", mid), ("PEAK", peak)]:
            mult = concentration_multiplier(conc)
            row  = [thumper_units(conc, t) for t in [60, 15, 240, 480]]
            print(f"  {name} {lbl:<4}  {conc:>4}%  {mult:>5.2f}×  "
                  f"{row[0]:>5.1f}  {row[1]:>5.1f}  {row[2]:>6.1f}  {row[3]:>6.1f}")
        print()


def print_first_session_comparison(by: int, ms: int, pool: int, stack: int) -> None:
    print("=" * 74)
    print("FIRST-SESSION YIELD SNAPSHOT (tutorial script, spec §6)")
    print("=" * 74)
    tut_s   = tutorial_samples_needed(by, 65, stack)
    hand_u  = tut_s * sample_yield(by, 65)
    abort2  = thumper_units(65, 2)      # scripted 5% hull abort
    run5    = thumper_units(65, 5)      # 5-min scripted second run (30% hull)
    run1h   = thumper_units(75, 60)     # casual 1h Keth 75% run
    print(f"  Hand samples (tutorial, {tut_s} smpls × {sample_yield(by,65):.2f}u at 65%): "
          f"{hand_u:.1f}u")
    print(f"  Scripted abort (2-min tail, 65% Keth): {abort2:.1f}u  "
          f"[spec says ~25u; tutorial scripted floor]")
    print(f"  5-min run (65% Keth, 30% hull):        {run5:.1f}u")
    print(f"  1h run (Keth 75%, casual):              {run1h:.1f}u")
    print(f"  Contrast ratio (1h / full hand day):    {run1h / max(hand_u, 0.01):.1f}×")
    print()
    print("  Note: The 2-min abort is tutorial-scripted with a guaranteed yield floor")
    print("  (spec §10: 'guaranteed partial-yield floor [SIM: ~25u]'). The floor should")
    print(f"  be set to 20–25u by the tutorial script regardless of the math above,")
    print(f"  to ensure the first claim feels rewarding despite the short tail.")


def main():
    print_thumper_reference()
    print()
    print("=" * 74)
    print("FULL SWEEP — all configs satisfying at least one constraint")
    print("=" * 74)
    candidates = run_sweep(verbose=True)
    print_recommendation(candidates)
    print_tension_analysis()
    print()

    # Print first-session comparison using live game constants directly
    # base_yield=5, max_s=CODE_MAX_SAMPLES=10, pool=5, stack=15 (TUTORIAL_ORDER_SA_STACK)
    print()
    print_first_session_comparison(5, CODE_MAX_SAMPLES, 5, 15)


if __name__ == "__main__":
    main()
