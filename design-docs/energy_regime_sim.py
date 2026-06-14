"""Energy Regime Simulation — Decision 022 evidence.

Question: Continuous-trickle-with-cap vs daily-reset across three visit archetypes.
Ryan's hypothesis: trickle+cap rewards 2–4 spaced visits/day without hard-gating a binger.

Constants re-used from packages/domain/src/survey/prospectingSampling.ts
and packages/domain/src/tuning.ts:
  SURVEY_ENERGY_CAP = 120   (raw energy units; ENERGY_CAP_SAMPLES=10 × SAMPLE_ENERGY_COST=12)
  SAMPLE_ENERGY_COST = 12   (per sample)
  ENERGY_REGEN_SAMPLES_PER_HOUR = 0.5  → regen raw = 0.5 × 12 = 6 raw/hr = 0.1 raw/min

Work in cost-normalised units: 1 unit = 1 sample = SAMPLE_ENERGY_COST raw energy.
  raw cap 120 → 10 normalised units (samples)
  raw regen 6/hr = 0.1/min → 0.5 samples/hr

Sweep:
  cap C   (samples) : 5, 6, 8, 10, 12, 15, 20
  rate r  (samples/hr): 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0

  Daily-reset baseline: grant min(r*24, C+4) once at midnight, unused expires.
  (Granting r*24 full — but we cap the grant to cap+4 to model "use or lose" pressure.)

Visit archetypes (16-hour waking day, samples take ~0.5 min each):
  BINGER : 1 visit × 60 min
  REGULAR: 3 visits × 15 min, evenly spaced (0h, 5.3h, 10.7h into day)
  CHECKER: 6 visits × 5 min, evenly spaced every 2.4h

Metrics per (regime, archetype, C, r):
  samples_taken      : energy- AND time-limited samples per day
  wasted             : regen lost to cap overflow (trickle) or grant expiry (reset)
  coverage           : fraction of visits arriving with ≥2 samples affordable
  fairness           : binger samples_taken ÷ checker samples_taken
"""

# ---------------------------------------------------------------------------
# Constants (mirroring the TypeScript source)
# ---------------------------------------------------------------------------
RAW_CAP_DEFAULT   = 120
SAMPLE_COST_RAW   = 12
REGEN_RAW_PER_MIN = 0.1
WAKING_HOURS      = 16   # simulation window per day

# Normalised: 1 unit = 1 sample
def to_norm(raw_energy: float) -> float:
    return raw_energy / SAMPLE_COST_RAW

RAW_DEFAULT_NORM_CAP  = to_norm(RAW_CAP_DEFAULT)          # ≈ 8.33
RAW_DEFAULT_NORM_RATE = to_norm(REGEN_RAW_PER_MIN * 60)   # ≈ 10 samples/hr

# Sampling time: 0.5 min per sample (30s per spec §8.3)
SAMPLE_TIME_MIN = 0.5

# ---------------------------------------------------------------------------
# Archetype definitions: list of (visit_start_hour, visit_duration_min)
# All within a 16-hour waking day.
# ---------------------------------------------------------------------------
def archetype_visits(name):
    if name == "BINGER":
        return [(0.0, 60.0)]
    elif name == "REGULAR":
        spacing = WAKING_HOURS / 3
        return [(i * spacing, 15.0) for i in range(3)]
    elif name == "CHECKER":
        spacing = WAKING_HOURS / 6
        return [(i * spacing, 5.0) for i in range(6)]
    else:
        raise ValueError(name)

ARCHETYPES = ["BINGER", "REGULAR", "CHECKER"]

# ---------------------------------------------------------------------------
# Simulation core — TRICKLE regime
# ---------------------------------------------------------------------------
def sim_trickle(cap, rate_per_hr, visits):
    """
    cap       : max samples storable (normalised)
    rate_per_hr: samples regenerated per hour
    visits    : [(start_hour, duration_min), ...]

    Returns (samples_taken, wasted).
    coverage_votes list is returned separately via sim_full.
    """
    rate_per_min = rate_per_hr / 60.0
    energy = cap  # start the day full (steady-state assumption)
    last_hour = 0.0
    samples_taken = 0.0
    wasted = 0.0
    coverage_votes = []  # True/False per visit: ≥2 affordable on arrival

    for start_hr, dur_min in visits:
        # Regen between last action and visit start
        elapsed_min = (start_hr - last_hour) * 60.0
        gained = elapsed_min * rate_per_min
        before_cap = energy + gained
        energy = min(before_cap, cap)
        wasted += max(before_cap - cap, 0.0)

        coverage_votes.append(energy >= 2.0)

        # Spend energy during visit (also time-limited)
        visit_minutes_left = dur_min
        while visit_minutes_left >= SAMPLE_TIME_MIN and energy >= 1.0:
            energy -= 1.0
            samples_taken += 1.0
            visit_minutes_left -= SAMPLE_TIME_MIN
            # Regen during the sample itself
            energy = min(energy + SAMPLE_TIME_MIN * rate_per_min, cap)

        last_hour = start_hr + dur_min / 60.0

    # Trickle continues after last visit to end of waking day — track overflow only
    elapsed_min = (WAKING_HOURS - last_hour) * 60.0
    before_cap = energy + elapsed_min * rate_per_min
    wasted += max(before_cap - cap, 0.0)

    return samples_taken, wasted, coverage_votes

# ---------------------------------------------------------------------------
# Simulation core — DAILY-RESET regime
# ---------------------------------------------------------------------------
def sim_reset(cap, rate_per_hr, visits):
    """
    Daily grant = min(rate_per_hr * 24, cap + 4).
    Unused energy at end of day expires (wasted).
    No trickle during the day.
    """
    daily_grant = min(rate_per_hr * 24.0, cap + 4.0)
    energy = daily_grant
    samples_taken = 0.0
    coverage_votes = []

    for _start_hr, dur_min in visits:
        coverage_votes.append(energy >= 2.0)

        visit_minutes_left = dur_min
        while visit_minutes_left >= SAMPLE_TIME_MIN and energy >= 1.0:
            energy -= 1.0
            samples_taken += 1.0
            visit_minutes_left -= SAMPLE_TIME_MIN

    # Whatever's left expires
    wasted = energy
    return samples_taken, wasted, coverage_votes

# ---------------------------------------------------------------------------
# Full sweep
# ---------------------------------------------------------------------------
CAPS  = [5, 6, 8, 10, 12, 15, 20]
RATES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0]

def run_sweep():
    """Return list of result dicts for every (cap, rate, regime, archetype)."""
    results = []
    for cap in CAPS:
        for rate in RATES:
            for archetype in ARCHETYPES:
                visits = archetype_visits(archetype)

                # --- Trickle ---
                st, wt, cv = sim_trickle(cap, rate, visits)
                coverage = sum(cv) / len(cv) if cv else 0.0
                results.append(dict(
                    regime="TRICKLE", cap=cap, rate=rate, archetype=archetype,
                    samples=st, wasted=wt, coverage=coverage,
                ))

                # --- Reset ---
                sr, wr, cvr = sim_reset(cap, rate, visits)
                coverager = sum(cvr) / len(cvr) if cvr else 0.0
                results.append(dict(
                    regime="RESET", cap=cap, rate=rate, archetype=archetype,
                    samples=sr, wasted=wr, coverage=coverager,
                ))
    return results

def get_fairness(results, regime, cap, rate):
    """Binger samples / Checker samples at given (regime, cap, rate)."""
    def lookup(arch):
        for r in results:
            if r["regime"] == regime and r["cap"] == cap and r["rate"] == rate and r["archetype"] == arch:
                return r["samples"]
        return 1e-9
    b = lookup("BINGER")
    c = lookup("CHECKER")
    return b / max(c, 1e-9)

# ---------------------------------------------------------------------------
# Target scoring: find configs that meet the design targets
# ---------------------------------------------------------------------------
FAIRNESS_LO = 0.6   # checker/regular should out-earn binger but not starve it
FAIRNESS_HI = 1.0   # binger should not dominate
COVERAGE_TARGET = 0.90   # ≥90% of visits arrive with ≥2 samples

def score_config(results, cap, rate):
    """
    Score a trickle config on:
    1. Fairness ratio in [0.60, 1.00)
    2. Every archetype coverage ≥ 90%
    3. Marginal gain of 4th+ visit is small (CHECKER earns slightly more than REGULAR)
    Returns a score (higher = better) and a pass dict.
    """
    fairness = get_fairness(results, "TRICKLE", cap, rate)
    archs = {}
    for arch in ARCHETYPES:
        for r in results:
            if r["regime"] == "TRICKLE" and r["cap"] == cap and r["rate"] == rate and r["archetype"] == arch:
                archs[arch] = r

    coverage_ok = all(archs[a]["coverage"] >= COVERAGE_TARGET for a in ARCHETYPES)
    fairness_ok = FAIRNESS_LO <= fairness < FAIRNESS_HI

    # "2-4 visits sweet spot": checker should earn more than binger, regular intermediate
    checker_over_binger = archs["CHECKER"]["samples"] > archs["BINGER"]["samples"]

    # Waste not excessive: checker shouldn't lose >25% of regen
    checker_waste_frac = archs["CHECKER"]["wasted"] / max(rate * WAKING_HOURS, 1e-9)
    waste_ok = checker_waste_frac < 0.25

    passes = dict(fairness=fairness_ok, coverage=coverage_ok,
                  checker_over_binger=checker_over_binger, waste_ok=waste_ok)
    score = sum(passes.values()) * 10
    # Bonus: fairness closer to 0.75
    score += max(0, 4 - abs(fairness - 0.75) * 20)
    return score, passes, fairness

# ---------------------------------------------------------------------------
# Printing helpers
# ---------------------------------------------------------------------------
def print_sweep_table(results):
    print("\n" + "="*90)
    print("FULL SWEEP — TRICKLE regime: samples/day by archetype")
    print(f"{'Cap':>4}  {'Rate':>5}  {'BINGER':>8}  {'REGULAR':>8}  {'CHECKER':>8}  "
          f"{'Fairness':>9}  {'Cov-B':>6}  {'Cov-R':>6}  {'Cov-C':>6}")
    print("-"*90)
    last_cap = None
    for cap in CAPS:
        if cap != last_cap and last_cap is not None:
            print()
        last_cap = cap
        for rate in RATES:
            row = {}
            for r in results:
                if r["regime"] == "TRICKLE" and r["cap"] == cap and r["rate"] == rate:
                    row[r["archetype"]] = r
            b = row.get("BINGER", {})
            reg = row.get("REGULAR", {})
            c = row.get("CHECKER", {})
            fair = b.get("samples", 0) / max(c.get("samples", 1e-9), 1e-9)
            mark = " *" if (0.6 <= fair < 1.0 and
                            b.get("coverage", 0) >= 0.9 and
                            reg.get("coverage", 0) >= 0.9 and
                            c.get("coverage", 0) >= 0.9) else "  "
            print(f"{cap:>4}  {rate:>5.1f}  "
                  f"{b.get('samples', 0):>8.1f}  {reg.get('samples', 0):>8.1f}  {c.get('samples', 0):>8.1f}  "
                  f"{fair:>9.2f}  "
                  f"{b.get('coverage', 0):>6.0%}  {reg.get('coverage', 0):>6.0%}  {c.get('coverage', 0):>6.0%}"
                  f"{mark}")
    print("  * = fairness 0.6-1.0 AND all coverage ≥90%")


def print_regime_comparison(results, cap, rate):
    print("\n" + "="*70)
    print(f"TRICKLE vs RESET — Cap={cap} samples, Rate={rate} samples/hr")
    print(f"{'Archetype':<10}  {'Regime':<7}  {'Samples/day':>12}  {'Wasted':>8}  {'Coverage':>9}  {'Fairness':>9}")
    print("-"*70)
    for arch in ARCHETYPES:
        for regime in ["TRICKLE", "RESET"]:
            for r in results:
                if (r["regime"] == regime and r["cap"] == cap
                        and r["rate"] == rate and r["archetype"] == arch):
                    fair = get_fairness(results, regime, cap, rate)
                    print(f"{arch:<10}  {regime:<7}  {r['samples']:>12.1f}  "
                          f"{r['wasted']:>8.1f}  {r['coverage']:>9.0%}  {fair:>9.2f}")


def print_marginal_visits(results, cap, rate):
    """Show how samples accumulate across the 6 CHECKER visits vs the 1 BINGER."""
    print("\n" + "="*60)
    print(f"MARGINAL VISIT VALUE (Trickle, Cap={cap}, Rate={rate})")
    print("Visit cadences from CHECKER (6 x 5min) vs REGULAR (3 x 15min):")

    # Re-run trickle with visit-by-visit accounting
    rate_per_min = rate / 60.0
    for archetype in ["CHECKER", "REGULAR"]:
        visits = archetype_visits(archetype)
        energy = cap
        last_hour = 0.0
        print(f"\n  {archetype}:")
        cumulative = 0.0
        for i, (start_hr, dur_min) in enumerate(visits):
            elapsed_min = (start_hr - last_hour) * 60.0
            gained = elapsed_min * rate_per_min
            before_cap = energy + gained
            energy = min(before_cap, cap)
            wasted_here = max(before_cap - cap, 0.0)

            visit_energy = energy
            visit_min_left = dur_min
            visit_samples = 0
            while visit_min_left >= SAMPLE_TIME_MIN and energy >= 1.0:
                energy -= 1.0
                visit_samples += 1.0
                visit_min_left -= SAMPLE_TIME_MIN
                energy = min(energy + SAMPLE_TIME_MIN * rate_per_min, cap)

            cumulative += visit_samples
            print(f"    Visit {i+1} @{start_hr:4.1f}h: arrived={visit_energy:.1f} smp  "
                  f"took={visit_samples:.0f}  wasted={wasted_here:.1f}  cumulative={cumulative:.0f}")
            last_hour = start_hr + dur_min / 60.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(__doc__)

    results = run_sweep()
    print_sweep_table(results)

    # Score all configs and find best
    best_score = -1
    best_cfg = None
    all_scored = []
    for cap in CAPS:
        for rate in RATES:
            sc, passes, fairness = score_config(results, cap, rate)
            all_scored.append((sc, cap, rate, passes, fairness))
            if sc > best_score:
                best_score = sc
                best_cfg = (cap, rate, passes, fairness)

    print("\n" + "="*70)
    print("CONFIG SCORES (Trickle only — passing all 4 targets earns 40 pts)")
    print(f"{'Cap':>4}  {'Rate':>5}  {'Score':>7}  {'Fair':>6}  {'FairOK':>7}  "
          f"{'CovOK':>6}  {'CkrWins':>8}  {'WasteOK':>8}")
    print("-"*70)
    for sc, cap, rate, passes, fairness in sorted(all_scored, key=lambda x: -x[0])[:20]:
        print(f"{cap:>4}  {rate:>5.1f}  {sc:>7.1f}  {fairness:>6.2f}  "
              f"{'yes' if passes['fairness'] else 'no':>7}  "
              f"{'yes' if passes['coverage'] else 'no':>6}  "
              f"{'yes' if passes['checker_over_binger'] else 'no':>8}  "
              f"{'yes' if passes['waste_ok'] else 'no':>8}")

    # Recommended config
    rec_cap, rec_rate, rec_passes, rec_fairness = best_cfg
    print(f"\n>>> RECOMMENDED: Cap={rec_cap} samples ({rec_cap * 12} raw energy), "
          f"Rate={rec_rate:.1f} samples/hr ({rec_rate * 12:.0f} raw energy/hr = "
          f"{rec_rate * 12 / 60:.2f}/min)")

    print_regime_comparison(results, rec_cap, rec_rate)
    print_marginal_visits(results, rec_cap, rec_rate)

    # Also show the live locked constants for reference
    print(f"\n--- Live locked constants (Decision 022, for reference) ---")
    print(f"    Raw cap 120 → {RAW_CAP_DEFAULT // SAMPLE_COST_RAW} samples  "
          f"(ENERGY_CAP_SAMPLES=10, SAMPLE_ENERGY_COST=12)")
    print(f"    Regen 0.5 samples/hr  (ENERGY_REGEN_SAMPLES_PER_HOUR=0.5, "
          f"= 6 raw/hr = 0.1 raw/min)")
    print_regime_comparison(results, 10, 0.5)

    # Verdict
    print("\n" + "="*70)
    print("DESIGNER HYPOTHESIS VERDICT")
    print("Hypothesis: trickle+cap rewards 2-4 spaced visits per day without")
    print("hard-gating a single-session binger.\n")
    rec_t_visits = archetype_visits("REGULAR")
    rec_c_visits = archetype_visits("CHECKER")
    # Fairness at recommended config
    fair_trickle = get_fairness(results, "TRICKLE", rec_cap, rec_rate)
    fair_reset   = get_fairness(results, "RESET",   rec_cap, rec_rate)

    # Coverage at rec
    def get_coverage(regime, arch):
        for r in results:
            if r["regime"] == regime and r["cap"] == rec_cap and r["rate"] == rec_rate and r["archetype"] == arch:
                return r["coverage"]
        return 0.0

    print(f"Recommended trickle config C={rec_cap}, r={rec_rate}:")
    print(f"  Fairness (binger/checker): trickle={fair_trickle:.2f}, reset={fair_reset:.2f}")
    print(f"  Coverage ≥2 on arrival:  B={get_coverage('TRICKLE','BINGER'):.0%}  "
          f"R={get_coverage('TRICKLE','REGULAR'):.0%}  "
          f"C={get_coverage('TRICKLE','CHECKER'):.0%}")
    all_cov = all(get_coverage("TRICKLE", a) >= 0.9 for a in ARCHETYPES)
    checker_wins = False
    for r in results:
        if r["regime"] == "TRICKLE" and r["cap"] == rec_cap and r["rate"] == rec_rate:
            if r["archetype"] == "CHECKER":
                checker_s = r["samples"]
            if r["archetype"] == "BINGER":
                binger_s = r["samples"]
    checker_wins = checker_s > binger_s

    verdict_parts = []
    if all_cov:
        verdict_parts.append("all archetypes see ≥2 samples on ≥90% of visits [PASS]")
    else:
        verdict_parts.append("coverage target NOT fully met [FAIL]")
    if FAIRNESS_LO <= fair_trickle < FAIRNESS_HI:
        verdict_parts.append(f"fairness {fair_trickle:.2f} in target range [PASS]")
    else:
        verdict_parts.append(f"fairness {fair_trickle:.2f} outside target [FAIL]")
    if checker_wins:
        verdict_parts.append("checker out-earns binger [PASS]")
    else:
        verdict_parts.append("binger out-earns checker [FAIL]")

    all_pass = all_cov and (FAIRNESS_LO <= fair_trickle < FAIRNESS_HI) and checker_wins
    print(f"\n  " + "\n  ".join(verdict_parts))
    if all_pass:
        print(f"\nVERDICT: Hypothesis CONFIRMED at C={rec_cap}, r={rec_rate:.1f}. "
              "Trickle+cap rewards spaced visits and does not hard-gate the binger.")
    else:
        print(f"\nVERDICT: Hypothesis partially supported — tune cap or rate further.")

    print(f"\nNOTE: The locked TypeScript constants are C=10 (120 raw), r=0.5 samples/hr "
          f"(Decision 022).\n"
          f"      This is deliberately below this sim's unconstrained-comfort recommendation "
          f"of C=20, r=1.0,\n"
          f"      enforcing the anti-substitution guard: trickle cannot substitute for "
          f"thumping at scale.\n"
          f"      The steady-state 'start at cap' assumption is enforced at the tutorial "
          f"boundary by a\n"
          f"      one-time graduation refill to cap (refillSurveyEnergyToCap in\n"
          f"      packages/db/src/queries/surveyEnergy.ts) triggered on the "
          f"async_reveal→done tutorial transition.")

if __name__ == "__main__":
    main()
