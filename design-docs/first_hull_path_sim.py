"""First-hull material path — validates Reinforced Hull Plate is reachable on the recommended session.

Constants are loaded from design-docs/domain_tuning_snapshot.json, generated from
packages/domain via:

    pnpm exec tsx design-docs/export_domain_tuning.ts

Re-run that export when tuning.ts or reinforcedHullPlate schematic changes.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
SNAPSHOT_PATH = HERE / "domain_tuning_snapshot.json"
EXPORT_SCRIPT = HERE / "export_domain_tuning.ts"

# Thumper yield math mirrors packages/domain/src/thumper/deployPreview.ts
DEFAULT_PROJECTED_RECOVERY = 60.0
SWG_BASE_CONCENTRATION = 67.0
EVENT_WASTE_FRACTION = 0.15

# Playtest waypoint concentrations (deterministic mids from bloom fixtures)
KETH_CONC = 75.0
SORREL_CONC = 67.0
GLIMMER_CONC = 78.0


def load_tuning() -> dict:
    if not SNAPSHOT_PATH.exists():
        print(f"missing {SNAPSHOT_PATH.name} — exporting from packages/domain…")
        subprocess.run(
            [
                "pnpm",
                "--filter",
                "@async-frontier-mmo/db",
                "exec",
                "tsx",
                "../../design-docs/export_domain_tuning.ts",
            ],
            cwd=REPO_ROOT,
            check=True,
        )
    return json.loads(SNAPSHOT_PATH.read_text())


TUNING = load_tuning()

SAMPLE_BASE_YIELD = TUNING["SAMPLE_BASE_YIELD"]
TUTORIAL_ORDER_SA_STACK = TUNING["TUTORIAL_ORDER_SA_STACK"]
TUTORIAL_ORDER_CM_STACK = TUNING["TUTORIAL_ORDER_CM_STACK"]
ORDER_RC = TUNING["NEXT_NEED_ORDER_RC_STACK"]
ORDER_CM = TUNING["NEXT_NEED_ORDER_CM_STACK"]
TUTORIAL_RUN_1_YIELD_FLOOR = TUNING["TUTORIAL_RUN_1_YIELD_FLOOR"]
TUTORIAL_RUN_2_YIELD = TUNING["TUTORIAL_RUN_2_YIELD"]
PATCHED_INTEGRITY = TUNING["PATCHED_HULL_INTEGRITY"]
HULL_CEILING_EXPONENT = TUNING["HULL_CEILING_EXPONENT"]
HULL_TIER_BASE = TUNING["HULL_TIER_BASE"]
HULL_SA = TUNING["HULL_SA"]
HULL_RC = TUNING["HULL_RC"]
SCAVENGED_INTEGRITY = 5
FIRST_ASYNC_TAIL_MIN = 15


def conc_mult(conc_pct: float) -> float:
    return max(0.5, min(1.5, conc_pct / SWG_BASE_CONCENTRATION))


def tail_mult(tail_min: float) -> float:
    return math.sqrt(tail_min / 60.0)


def projected_recovery(conc_pct: float, tail_min: float) -> float:
    return DEFAULT_PROJECTED_RECOVERY * conc_mult(conc_pct) * tail_mult(tail_min)


def max_run_minutes(tier: str, integrity: float) -> float:
    integ = max(0.0, min(100.0, integrity))
    base = HULL_TIER_BASE[tier]
    return base * (integ / 100.0) ** HULL_CEILING_EXPONENT


def patched_run_yield(conc_pct: float, planned_min: int = 15, waived: bool = False) -> int:
    ceiling = max_run_minutes("patched", PATCHED_INTEGRITY)
    proj = projected_recovery(conc_pct, planned_min)
    if waived or planned_min <= ceiling:
        return round(proj)
    frac = ceiling / planned_min
    return round(proj * frac)


def sample_yield(conc_pct: float) -> int:
    return max(1, round(SAMPLE_BASE_YIELD * conc_pct / 100.0))


def thump_yield(conc_pct: float, waived: bool = False) -> int:
    return round(patched_run_yield(conc_pct, 15, waived=waived) * (1 - EVENT_WASTE_FRACTION))


def complete_tutorial_order_via_hand_fill(conc_pct: float, stack_size: int) -> tuple[int, int]:
    """Sample until the foreman stack is filled, then turn in — returns (surplus_units, sample_count)."""
    banked = 0
    samples = 0
    while banked < stack_size:
        banked += sample_yield(conc_pct)
        samples += 1
    surplus = banked - stack_size
    return surplus, samples


def turn_in_units(stack_units: int, order_remaining: int, reserved_units: int = 0) -> tuple[int, int]:
    """Returns (units_consumed_from_stack, order_remaining_after)."""
    available = max(0, stack_units - reserved_units)
    delivered = min(available, order_remaining)
    return delivered, order_remaining - delivered


def simulate_recommended_first_session() -> dict:
    """Deterministic inventory walk mirroring the locked tutorial + reserve rules."""
    owns_hull_plate = False

    sa, sa_hand_samples = complete_tutorial_order_via_hand_fill(KETH_CONC, TUTORIAL_ORDER_SA_STACK)
    cm, cm_hand_samples = complete_tutorial_order_via_hand_fill(SORREL_CONC, TUTORIAL_ORDER_CM_STACK)
    rc = 0

    sa += TUTORIAL_RUN_1_YIELD_FLOOR
    sa += TUTORIAL_RUN_2_YIELD

    rc += thump_yield(GLIMMER_CONC, waived=True)

    rc_delivered, _ = turn_in_units(rc, ORDER_RC, reserved_units=HULL_RC)
    rc -= rc_delivered

    cm += sample_yield(SORREL_CONC) * 3
    cm_delivered, _ = turn_in_units(cm, ORDER_CM)
    cm -= cm_delivered

    sa_runs_after_tutorial = 0
    while sa < HULL_SA and sa_runs_after_tutorial < 12:
        sa += thump_yield(KETH_CONC, waived=False)
        sa_runs_after_tutorial += 1

    rc_runs_after_async = 0
    while rc < HULL_RC and rc_runs_after_async < 6:
        rc += thump_yield(GLIMMER_CONC, waived=False)
        rc_runs_after_async += 1

    craftable = sa >= HULL_SA and rc >= HULL_RC and not owns_hull_plate

    return {
        "sa": sa,
        "rc": rc,
        "cm": cm,
        "sa_hand_samples": sa_hand_samples,
        "cm_hand_samples": cm_hand_samples,
        "sa_runs_after_tutorial": sa_runs_after_tutorial,
        "rc_runs_after_async": rc_runs_after_async,
        "craftable": craftable,
        "tuning_source": TUNING.get("source"),
    }


def reinforced_hull_plate_craftable() -> bool:
    return simulate_recommended_first_session()["craftable"]


def print_ceiling_reference() -> None:
    print("=" * 78)
    print("HULL CEILING REFERENCE — validates playtest trip times")
    print(f"constants: {SNAPSHOT_PATH.name}")
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


def print_run_yields() -> None:
    print("=" * 78)
    print("PATCHED-HULL RUN YIELDS (integrity 30, planned 15-min tail)")
    print("=" * 78)
    print(f"{'resource':<22} {'conc%':>6} {'waived(full 15m)':>17} {'recalled(~7m)':>15}")
    print("-" * 78)
    for name, concs in [
        ("Keth Iron (SA)", [("MID", 75)]),
        ("Glimmerfall (RC)", [("obs", 78)]),
    ]:
        for lbl, c in concs:
            w = patched_run_yield(c, 15, waived=True)
            r = patched_run_yield(c, 15, waived=False)
            print(f"{name + ' ' + lbl:<22} {c:>6} {w:>17} {r:>15}")
        print()


def print_path_inventory(result: dict) -> None:
    print("=" * 78)
    print("RECOMMENDED PATH INVENTORY (post-tutorial + reserves + orders)")
    print("=" * 78)
    print(
        f"  Tutorial SA hand-fill: {result['sa_hand_samples']} samples → "
        f"{TUTORIAL_ORDER_SA_STACK}u order complete"
    )
    print(
        f"  Tutorial CM hand-fill: {result['cm_hand_samples']} samples → "
        f"{TUTORIAL_ORDER_CM_STACK}u order complete"
    )
    print(f"  Structural Alloy banked:  {result['sa']:>4}u  (hull needs {HULL_SA}u)")
    print(f"  Reactive Crystal banked:  {result['rc']:>4}u  (hull needs {HULL_RC}u)")
    print(f"  Conductive Metal banked:  {result['cm']:>4}u  (CM order {ORDER_CM}u, separate stack)")
    print(f"  Extra SA thumps after tutorial: {result['sa_runs_after_tutorial']}")
    print(f"  Extra RC thumps after async:  {result['rc_runs_after_async']}")
    print()


def print_verdict() -> None:
    result = simulate_recommended_first_session()
    craftable = result["craftable"]
    print("=" * 78)
    print("VERDICT")
    print("=" * 78)
    print_path_inventory(result)
    print(f"Reinforced Hull Plate craftable: {'yes' if craftable else 'no'}")
    if not craftable:
        print(
            f"  FAIL: need {HULL_SA} SA + {HULL_RC} RC after order turn-ins and RC reserve; "
            f"have {result['sa']} SA + {result['rc']} RC"
        )
        sys.exit(1)
    print("  PASS: single-stack totals meet Reinforced Hull Plate bill after recommended path.")


def main() -> None:
    print_ceiling_reference()
    print_run_yields()
    print_verdict()


if __name__ == "__main__":
    main()
