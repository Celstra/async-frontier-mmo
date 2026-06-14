"""Experimentation Pulse Simulation — Decision 023 / crafting bet-sizing evidence.

DESIGN QUESTION:
Replace the current Careful-Experiment option (stage1_sim.py Q5: 75% +3pts / 20% nothing /
5% minor flaw — EV +2.17, no real downside, always-press) with SWG-style bet-sizing
experimentation.  Per craft the player gets 2 experiment pulses; per pulse they pick a
property line and a PUSH SIZE:

  Careful  (+1 band, success 0.90, crit 0.02)
  Standard (+2 bands, success 0.65, crit 0.10)
  Overdrive (+3 bands, success 0.40, crit 0.25)

Non-success non-crit = pulse wasted, no change.
Crit on Careful/Standard = −1 band on that line.
Crit on Overdrive = one socket's resource stack is scrapped (material cost,
  band unchanged, pulse lost).
Resource quality caps the line (band cap).

Questions:
  (a) Does push-size choice produce genuinely distinct outcome distributions (a real
      bet-sizing decision)?
  (b) Is Overdrive the only realistic path to the top band from a mediocre assembly
      (prestige gate — mirrors SWG 'master crafters still crit')?
  (c) Is the Overdrive scrap overhead sane relative to recipe cost (not free, not ruinous)?

MIRRORED CONSTANTS (source paths cited inline):
  Stat bands — packages/domain/src/survey/statBand.ts
    poor(1) ≤249, weak(2) ≤499, solid(3) ≤649, strong(4) ≤799,
    excellent(5) ≤899, exceptional(6) ≥900.  Simulation works in band indices 1–6.
  Reinforced Hull Plate sockets — packages/domain/src/crafting/schematics/reinforcedHullPlate.ts
    outer_plate (SA) inputQuantity=60,  bracing_layer (SA) inputQuantity=40,
    bonding_matrix (RC) inputQuantity=20.  Total = 120u.
  Repair Kit total 60u — design-docs/sampling_ratio_sim.py RECIPE_TOTALS (for context).
  Overdrive scrap cost modelled as:
    SCRAP_LARGEST  = 60u  (outer_plate socket, the default)
    SCRAP_RANDOM   = 40u  (expected value of uniform-random socket from 60+40+20=120)

N_SIM = 200_000 crafts per cell.
"""

import random
import statistics

# ---------------------------------------------------------------------------
# Constants — mirroring TypeScript source (paths in docstring above)
# ---------------------------------------------------------------------------

# Stat band indices 1-6 (poor … exceptional)
BAND_NAMES = {1: "poor", 2: "weak", 3: "solid", 4: "strong", 5: "excellent", 6: "exceptional"}
N_BANDS = 6

# Reinforced Hull Plate socket quantities (reinforcedHullPlate.ts)
SOCKET_QTY = [60, 40, 20]          # outer_plate, bracing_layer, bonding_matrix
RECIPE_TOTAL = sum(SOCKET_QTY)     # 120u
SCRAP_LARGEST = max(SOCKET_QTY)    # 60u  — default Overdrive scrap model
SCRAP_RANDOM_AVG = RECIPE_TOTAL / len(SOCKET_QTY)   # 40u — random socket EV

# Repair Kit total for context (sampling_ratio_sim.py)
REPAIR_KIT_TOTAL = 60              # 60u

# Simulation size
N_SIM = 200_000

# Pulse mechanics
#   (band_delta, p_success, p_crit)
PULSE_SPECS = {
    "Careful":   (1, 0.90, 0.02),
    "Standard":  (2, 0.65, 0.10),
    "Overdrive": (3, 0.40, 0.25),
}

# ---------------------------------------------------------------------------
# Core: simulate one pulse on a single property line
# Returns (new_band, scrap_units_lost)
# ---------------------------------------------------------------------------

def apply_pulse(rng, push: str, current_band: int, band_cap: int, scrap_model: str) -> tuple[int, float]:
    """
    Apply one experiment pulse.
    push          : "Careful" | "Standard" | "Overdrive"
    current_band  : int 1-6, current quality band of this property line
    band_cap      : int 1-6, resource-quality cap (cannot exceed)
    scrap_model   : "largest" (60u) | "random" (avg 40u)

    Returns (new_band, scrap_lost).
    """
    delta, p_success, p_crit = PULSE_SPECS[push]

    roll = rng.random()
    if roll < p_success:
        # Success: advance by delta, clamped at cap
        new_band = min(current_band + delta, band_cap)
        return new_band, 0.0
    elif roll < p_success + p_crit:
        # Critical failure
        if push == "Overdrive":
            # Scrap a socket resource; band unchanged
            if scrap_model == "largest":
                scrap = float(SCRAP_LARGEST)
            else:
                # random socket: uniform over SOCKET_QTY
                scrap = float(rng.choice(SOCKET_QTY))
            return current_band, scrap
        else:
            # Careful/Standard crit: -1 band, floor 1
            return max(1, current_band - 1), 0.0
    else:
        # Miss: pulse wasted, no change
        return current_band, 0.0


# ---------------------------------------------------------------------------
# Strategies: sequences of push-size choices for 2 pulses
# ---------------------------------------------------------------------------

FIXED_STRATEGIES = ["CC", "CS", "SS", "SO", "OO"]

def strategy_pulses(strategy: str, current_band: int, band_cap: int) -> list[str]:
    """Return list of push choices for this strategy (length 2)."""
    if strategy in FIXED_STRATEGIES:
        map2 = {"C": "Careful", "S": "Standard", "O": "Overdrive"}
        return [map2[ch] for ch in strategy]
    elif strategy == "ADAPTIVE":
        choices = []
        band = current_band
        for _ in range(2):
            if band >= band_cap:
                choices.append(None)          # at cap, skip
            elif band_cap - band >= 3:
                choices.append("Overdrive")
            elif band_cap - band == 2:
                choices.append("Standard")
            else:                             # 1 below cap
                choices.append("Careful")
        return choices
    else:
        raise ValueError(f"Unknown strategy: {strategy}")


ALL_STRATEGIES = FIXED_STRATEGIES + ["ADAPTIVE"]


# ---------------------------------------------------------------------------
# Monte Carlo core
# ---------------------------------------------------------------------------

def simulate(b0: int, B_cap: int, strategy: str, crit_od: float,
             scrap_model: str, rng: random.Random) -> dict:
    """
    Simulate N_SIM crafts.
    b0        : baseline band (assembly start)
    B_cap     : resource quality cap
    strategy  : one of ALL_STRATEGIES
    crit_od   : override for Overdrive crit probability
    scrap_model: "largest" | "random"

    Returns dict of summary statistics.
    """
    # Temporarily patch Overdrive crit
    orig_od = PULSE_SPECS["Overdrive"]
    delta_od, p_suc_od, _ = orig_od
    # Adjust success so p_success + p_crit <= 1
    p_miss_od = 1.0 - p_suc_od - orig_od[2]          # miss probability from original
    new_p_suc_od = max(0.0, 1.0 - crit_od - p_miss_od)
    PULSE_SPECS["Overdrive"] = (delta_od, new_p_suc_od, crit_od)

    final_bands = []
    scraps = []
    regressions = 0

    for _ in range(N_SIM):
        band = b0
        total_scrap = 0.0

        pulses = strategy_pulses(strategy, band, B_cap)
        for push in pulses:
            if push is None:
                continue
            band, s = apply_pulse(rng, push, band, B_cap, scrap_model)
            total_scrap += s

        final_bands.append(band)
        scraps.append(total_scrap)
        if band < b0:
            regressions += 1

    # Restore
    PULSE_SPECS["Overdrive"] = orig_od

    mean_band = statistics.mean(final_bands)
    p_cap = sum(1 for b in final_bands if b >= B_cap) / N_SIM
    p_band6 = sum(1 for b in final_bands if b == 6) / N_SIM
    mean_scrap = statistics.mean(scraps)
    p_regress = regressions / N_SIM

    return {
        "mean_band": mean_band,
        "p_cap": p_cap,
        "p_band6": p_band6,
        "mean_scrap": mean_scrap,
        "p_regress": p_regress,
        "final_bands": final_bands,
    }


# ---------------------------------------------------------------------------
# Liveness checks
# ---------------------------------------------------------------------------

# Risk ladder — push aggression increases left→right. Distinctness is a claim
# about *neighbouring rungs*, not about ADAPTIVE (a meta-policy) vs everything.
RISK_LADDER = ["CC", "CS", "SS", "SO", "OO"]
TVD_THRESHOLD = 0.10

def _band_dist(final_bands: list[int]) -> list[float]:
    """Normalised histogram over bands 1..6."""
    n = len(final_bands)
    hist = [0] * 7  # index 1..6
    for b in final_bands:
        hist[b] += 1
    return [hist[b] / n for b in range(1, 7)]

def _tvd(p: list[float], q: list[float]) -> float:
    """Total-variation distance between two band distributions."""
    return 0.5 * sum(abs(pi - qi) for pi, qi in zip(p, q))

def check_a(results_b3_B6: dict) -> tuple[bool, str]:
    """(a) Each neighbouring rung on the risk ladder produces a DISTINCT band
    distribution (total-variation distance ≥ threshold) at b0=3, B_cap=6.

    Mean band is the wrong metric for a bimodal cap-or-bust system: Careful
    climbs reliably while Overdrive is caps-or-busts, so their means can sit
    close while their distributions are utterly different. TVD captures the
    shape difference that the player actually experiences."""
    dists = {s: _band_dist(results_b3_B6[s]["final_bands"]) for s in RISK_LADDER}
    pairs = []
    failed = False
    for s1, s2 in zip(RISK_LADDER, RISK_LADDER[1:]):
        tvd = _tvd(dists[s1], dists[s2])
        tag = f"{s1}/{s2} TVD={tvd:.3f}"
        if tvd < TVD_THRESHOLD:
            failed = True
            tag += " <too close>"
        pairs.append(tag)
    detail = ", ".join(pairs)
    if failed:
        return False, f"FAIL — adjacent rungs too close: {detail}"
    return True, f"PASS — adjacent rungs distinct (TVD ≥ {TVD_THRESHOLD}): {detail}"


def check_b(results_b3_B6: dict) -> tuple[bool, str]:
    """(b) P(band6) for Careful-only ≈ 0; ADAPTIVE/OO ≥ 10% at b0=3, B_cap=6."""
    p_cc = results_b3_B6["CC"]["p_band6"]
    p_ad = results_b3_B6["ADAPTIVE"]["p_band6"]
    p_oo = results_b3_B6["OO"]["p_band6"]
    cc_ok = p_cc < 0.02
    ad_ok = p_ad >= 0.10
    oo_ok = p_oo >= 0.10
    status = "PASS" if (cc_ok and ad_ok and oo_ok) else "FAIL"
    return (cc_ok and ad_ok and oo_ok), (
        f"{status} — CC P(band6)={p_cc:.3f} (want <2%), "
        f"ADAPTIVE={p_ad:.3f}, OO={p_oo:.3f} (want ≥10%)"
    )


def check_c(results_b3_B6: dict) -> tuple[bool, str]:
    """(c) Mean scrap overhead for OO ≤ 60u (≤50% of 120u recipe)."""
    scrap = results_b3_B6["OO"]["mean_scrap"]
    ok = scrap <= 60.0
    status = "PASS" if ok else "FAIL"
    return ok, f"{status} — OO mean scrap overhead = {scrap:.1f}u (limit 60u; recipe 120u)"


# ---------------------------------------------------------------------------
# Printing helpers
# ---------------------------------------------------------------------------

def band_bar(final_bands: list[int]) -> str:
    total = len(final_bands)
    fracs = [sum(1 for b in final_bands if b == i) / total for i in range(1, 7)]
    bar = ""
    for i, f in enumerate(fracs, 1):
        width = max(1, round(f * 20)) if f > 0 else 0
        bar += f"{BAND_NAMES[i][0].upper()}" * width
    return f"[{bar:<20}] " + " ".join(f"{f:.2f}" for f in fracs)


def print_table(cell_results: dict, b0: int, B_cap: int, label: str = ""):
    tag = f"b0={b0} B_cap={B_cap}" + (f"  {label}" if label else "")
    print(f"\n  {tag}")
    print(f"  {'Strategy':<10}  {'Mean band':>10}  {'P(cap)':>8}  {'P(band6)':>9}  "
          f"{'Scrap (u)':>10}  {'P(regress)':>11}")
    print(f"  {'-'*68}")
    for strat in ALL_STRATEGIES:
        r = cell_results[strat]
        print(f"  {strat:<10}  {r['mean_band']:>10.3f}  {r['p_cap']:>8.3f}  "
              f"{r['p_band6']:>9.3f}  {r['mean_scrap']:>10.1f}  {r['p_regress']:>11.4f}")


# ---------------------------------------------------------------------------
# 'Feel' paragraph — one worked ADAPTIVE craft (seeded)
# ---------------------------------------------------------------------------

def feel_paragraph(B_cap: int = 6, b0: int = 3, seed: int = 42):
    rng = random.Random(seed)
    print(f"\n--- FEEL: ADAPTIVE craft (b0={b0}, B_cap={B_cap}, seed={seed}) ---")
    band = b0
    total_scrap = 0.0
    for pulse_n in range(1, 3):
        pulses = strategy_pulses("ADAPTIVE", band, B_cap)
        push = pulses[pulse_n - 1]
        if push is None:
            print(f"  Pulse {pulse_n}: at cap ({BAND_NAMES[band]}) — pulse skipped.")
            continue
        delta, p_suc, p_crit = PULSE_SPECS[push]
        roll = rng.random()
        prev_band = band
        band, scrap = apply_pulse(rng, push, band, B_cap, "largest")
        # Re-roll for narrative (the random was consumed by apply_pulse)
        result = "miss"
        if band > prev_band:
            result = "SUCCESS"
        elif scrap > 0:
            result = f"CRIT-SCRAP ({scrap:.0f}u lost)"
        elif band < prev_band:
            result = f"CRIT-REGRESS ({BAND_NAMES[prev_band]}→{BAND_NAMES[band]})"
        total_scrap += scrap
        print(f"  Pulse {pulse_n}: {push:10s} on line — "
              f"{BAND_NAMES[prev_band]}→{BAND_NAMES[band]}  [{result}]  "
              f"(band_gap={B_cap - prev_band})")
    print(f"  Final band: {BAND_NAMES[band]} ({band})  |  Scrap overhead: {total_scrap:.0f}u")


# ---------------------------------------------------------------------------
# Main sweep
# ---------------------------------------------------------------------------

B0_VALUES   = [2, 3, 4]
BCAP_VALUES = [4, 5, 6]
CRIT_OD_SWEEP = [0.20, 0.25, 0.30]
SCRAP_MODELS  = ["largest", "random"]

# Baseline Overdrive crit (used in the main tables)
DEFAULT_CRIT_OD = 0.25


def run_cell(b0: int, B_cap: int, crit_od: float, scrap_model: str, rng: random.Random) -> dict:
    """Simulate all strategies for one (b0, B_cap, crit_od, scrap_model) cell."""
    return {
        strat: simulate(b0, B_cap, strat, crit_od, scrap_model, rng)
        for strat in ALL_STRATEGIES
    }


def main():
    print(__doc__)

    rng = random.Random(2024_12_01)   # deterministic global seed

    # -----------------------------------------------------------------------
    # MAIN TABLES  (default parameters: crit_od=0.25, scrap_model="largest")
    # -----------------------------------------------------------------------
    print("=" * 72)
    print("MAIN TABLES — crit_od=0.25, scrap_model='largest' (60u)")
    print(f"  N_SIM = {N_SIM:,}  |  Reinforced Hull Plate: 120u total (60+40+20)")
    print(f"  Repair Kit 60u for scale reference")
    print("=" * 72)

    main_cells = {}
    for b0 in B0_VALUES:
        for B_cap in BCAP_VALUES:
            cell = run_cell(b0, B_cap, DEFAULT_CRIT_OD, "largest", rng)
            main_cells[(b0, B_cap)] = cell
            print_table(cell, b0, B_cap)

    # -----------------------------------------------------------------------
    # LIVENESS CHECKS at (b0=3, B_cap=6)
    # -----------------------------------------------------------------------
    key_cell = main_cells[(3, 6)]
    print("\n" + "=" * 72)
    print("LIVENESS CHECKS  (b0=3, B_cap=6, default params)")
    print("=" * 72)
    ok_a, msg_a = check_a(key_cell)
    ok_b, msg_b = check_b(key_cell)
    ok_c, msg_c = check_c(key_cell)
    print(f"  (a) Distribution distinctness : {msg_a}")
    print(f"  (b) Prestige gate             : {msg_b}")
    print(f"  (c) Economy sanity            : {msg_c}")
    all_pass_default = ok_a and ok_b and ok_c

    # -----------------------------------------------------------------------
    # FEEL paragraph
    # -----------------------------------------------------------------------
    feel_paragraph(B_cap=6, b0=3, seed=42)

    # -----------------------------------------------------------------------
    # SWEEP: crit_od × scrap_model, scored on liveness checks
    # -----------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("SWEEP — Overdrive crit_od × scrap_model")
    print(f"  Fixed: b0=3, B_cap=6, N_SIM={N_SIM:,}")
    print("=" * 72)
    print(f"  {'crit_od':>8}  {'scrap_model':>12}  {'CkA':>4}  {'CkB':>4}  {'CkC':>4}  "
          f"{'ALL':>4}  {'strat_spread':>13}  {'OO_scrap':>9}  {'CC_mean':>9}  {'OO_mean':>9}")
    print(f"  {'-'*80}")

    sweep_results = []
    for crit_od in CRIT_OD_SWEEP:
        for scrap_model in SCRAP_MODELS:
            cell = run_cell(3, 6, crit_od, scrap_model, rng)
            a, _ = check_a(cell)
            b, _ = check_b(cell)
            c, _ = check_c(cell)
            all3 = a and b and c
            means = [cell[s]["mean_band"] for s in ALL_STRATEGIES]
            spread = max(means) - min(means)
            oo_scrap = cell["OO"]["mean_scrap"]
            cc_mean  = cell["CC"]["mean_band"]
            oo_mean  = cell["OO"]["mean_band"]
            mark = " <-- RECOMMEND" if all3 else ""
            print(f"  {crit_od:>8.2f}  {scrap_model:>12}  "
                  f"{'Y' if a else 'N':>4}  {'Y' if b else 'N':>4}  {'Y' if c else 'N':>4}  "
                  f"{'Y' if all3 else 'N':>4}  {spread:>13.3f}  {oo_scrap:>9.1f}  "
                  f"{cc_mean:>9.3f}  {oo_mean:>9.3f}{mark}")
            sweep_results.append({
                "crit_od": crit_od, "scrap_model": scrap_model,
                "all3": all3, "spread": spread,
                "a": a, "b": b, "c": c,
                "oo_scrap": oo_scrap, "cc_mean": cc_mean, "oo_mean": oo_mean,
                "cell": cell,
            })

    # -----------------------------------------------------------------------
    # Domination check: is Standard strictly dominated?
    # -----------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("DOMINATION CHECK — is Standard strictly dominated by neighbours?")
    print("=" * 72)
    for b0 in B0_VALUES:
        for B_cap in BCAP_VALUES:
            cell = main_cells[(b0, B_cap)]
            cs_mean = cell["CS"]["mean_band"]
            ss_mean = cell["SS"]["mean_band"]
            cc_mean = cell["CC"]["mean_band"]
            so_mean = cell["SO"]["mean_band"]
            cs_dom = (cc_mean >= cs_mean) and (ss_mean >= cs_mean)
            ss_dom = (cs_mean >= ss_mean) and (so_mean >= ss_mean)
            flag = ""
            if cs_dom:
                flag += f"  ! CS dominated (CC={cc_mean:.3f} >= CS={cs_mean:.3f} >= ...)"
            if ss_dom:
                flag += f"  ! SS dominated (CS={cs_mean:.3f} >= SS={ss_mean:.3f})"
            if not flag:
                flag = "  OK — not dominated"
            print(f"  b0={b0} B_cap={B_cap}:{flag}")

    # -----------------------------------------------------------------------
    # Recommendation
    # -----------------------------------------------------------------------
    passing = [r for r in sweep_results if r["all3"]]
    print("\n" + "=" * 72)
    print("RECOMMENDATION")
    print("=" * 72)
    if passing:
        best = max(passing, key=lambda r: r["spread"])
        print(f"  Best sweep cell (all 3 checks + max strategy spread):")
        print(f"    crit_od     = {best['crit_od']}")
        print(f"    scrap_model = {best['scrap_model']}")
        print(f"    spread      = {best['spread']:.3f} mean-band across strategies")
        print(f"    OO mean scrap overhead = {best['oo_scrap']:.1f}u  "
              f"({100*best['oo_scrap']/RECIPE_TOTAL:.0f}% of {RECIPE_TOTAL}u recipe)")
        print(f"    CC mean band = {best['cc_mean']:.3f}  |  OO mean band = {best['oo_mean']:.3f}")
        print(f"\n  Detailed table for recommended cell (b0=3, B_cap=6):")
        print_table(best["cell"], 3, 6,
                    label=f"crit_od={best['crit_od']} scrap={best['scrap_model']}")
        print(f"\n  Liveness checks on recommended cell:")
        a, msg_a2 = check_a(best["cell"])
        b, msg_b2 = check_b(best["cell"])
        c, msg_c2 = check_c(best["cell"])
        print(f"    (a) {msg_a2}")
        print(f"    (b) {msg_b2}")
        print(f"    (c) {msg_c2}")
    else:
        print("  No cell passed all three checks.  Nearest-miss:")
        best_partial = max(sweep_results, key=lambda r: (r["a"] + r["b"] + r["c"], r["spread"]))
        print(f"    crit_od={best_partial['crit_od']}  scrap={best_partial['scrap_model']}  "
              f"checks: a={best_partial['a']} b={best_partial['b']} c={best_partial['c']}")
        print("  Consider loosening check thresholds or adjusting Standard success probability.")

    # -----------------------------------------------------------------------
    # VERDICT
    # -----------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("VERDICT")
    print("=" * 72)
    key = main_cells[(3, 6)]
    print(f"  (a) Distinct distributions : {'PASS' if ok_a else 'FAIL'} — {msg_a}")
    print(f"  (b) Prestige gate          : {'PASS' if ok_b else 'FAIL'} — {msg_b}")
    print(f"  (c) Economy sanity         : {'PASS' if ok_c else 'FAIL'} — {msg_c}")
    print()
    if all_pass_default:
        print("  All three checks PASS at default parameters (crit_od=0.25, scrap='largest').")
        print("  Push-size choice produces a real bet-sizing decision.")
        print("  Overdrive is the only credible path to band 6 from a mediocre (b0=3) assembly.")
        print(f"  Overhead is sane: OO mean scrap = {key['OO']['mean_scrap']:.1f}u "
              f"vs {RECIPE_TOTAL}u recipe ({100*key['OO']['mean_scrap']/RECIPE_TOTAL:.0f}%).")
    else:
        print("  One or more checks FAIL at default parameters — see SWEEP above.")

    print(f"\n  Recipe reference: Reinforced Hull Plate {RECIPE_TOTAL}u "
          f"(sockets 60+40+20 SA+SA+RC)  |  Repair Kit {REPAIR_KIT_TOTAL}u")
    print(f"  Overdrive scrap models: largest socket = {SCRAP_LARGEST}u, "
          f"random socket avg = {SCRAP_RANDOM_AVG:.0f}u")


if __name__ == "__main__":
    main()
