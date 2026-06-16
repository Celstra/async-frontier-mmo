"""Workshop Supply Simulation — Decision 024 / WORKSHOP_FIRST_IMPLEMENTATION_PLAN Phase 1.

DESIGN QUESTION:
Before coding reclaim percentages and supply-crate constants, can a workshop-only
playtest stay craftable for 60+ minutes without soft-locking or creating infinite
craft→reclaim material loops?

Mirrored from implementation plan §2–3 and domain recipes:
  Basic Drill Head      — 40 SA + 40 CM + 40 RC  (120u)
  Efficient Pump        — 40 CM + 40 SA + 40 RC  (120u)
  Reinforced Hull Plate — 60 SA + 40 SA + 20 RC  (120u; SA-heavy)

Starter grant: 180u × 9 named resources (3 per family).

Candidate mechanics swept:
  reclaim rate        — 25%, 35%, 50% (floor to 5u increment)
  timer crate cadence — 5, 10, 15 minutes
  craft-count crate   — every 4 completed crafts
  crate payload       — 60 / 75 / 90u per family (3 named stacks)
  emergency crate     — when no schematic is craftable

Overdrive scrap mirrors packages/domain/src/crafting/experimentation.ts:
  crit_od = 0.25 per Overdrive pulse; scrap = largest socket quantity.

Session model:
  N_SESSIONS Monte Carlo sessions × 60-minute horizon
  CRAFT_MINUTES = 3 per completed craft (active workshop pacing assumption)
  Craft pattern ROTATE cycles drill → pump → hull
  Reclaim: non-kept items reclaimed after each craft (1 kept favorite per schematic)
  Experiment mixes (two scenarios per review):
    ACCURATE  — 55% CC/CS (0 OD), 35% SS (0 OD), 10% SO/OO (1–2 OD)
    CONSERVATIVE — same as pre-review bug: medium wrongly used 1 OD pulse (high-scrap bound)

  Crate grant modes:
    FIXED  — always keth_iron / red_mesa_conductive_slag / pale_ember_crystal (Phase 1 default)
    VARIED — uniform random low/mid named resource per family (discovery-richness probe)

Run:  python3 design-docs/workshop_supply_sim.py
"""

from __future__ import annotations

import random
import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Literal, NamedTuple

# ---------------------------------------------------------------------------
# Constants — mirrored from plan §2 and schematic TS sources
# ---------------------------------------------------------------------------

STARTER_UNITS = 180
RECLAIM_ROUND = 5
CRAFT_MINUTES = 3
CRAFT_COUNT_CRATE_INTERVAL = 4
N_SESSIONS = 8_000
HORIZON_MINUTES = 60
TIME_CHECKPOINTS = (10, 20, 30, 60)

Family = Literal["structural_alloy", "conductive_metal", "reactive_crystal"]

RESOURCES: dict[str, Family] = {
    "keth_iron": "structural_alloy",
    "asterion_frame_alloy": "structural_alloy",
    "bendrel_ridge_alloy": "structural_alloy",
    "red_mesa_conductive_slag": "conductive_metal",
    "veyrith_copper": "conductive_metal",
    "sorrel_vein_copper": "conductive_metal",
    "pale_ember_crystal": "reactive_crystal",
    "thornwake_crystal": "reactive_crystal",
    "glimmerfall_shard": "reactive_crystal",
}

# Default slot picks — sensible bench-stock choices (one named resource per slot)
DEFAULT_SLOT_PICKS: dict[str, dict[str, str]] = {
    "basic_drill_head": {
        "cutting_bit": "keth_iron",
        "conductive_coil": "sorrel_vein_copper",
        "resonance_crystal": "pale_ember_crystal",
    },
    "efficient_pump": {
        "intake_manifold": "sorrel_vein_copper",
        "flexible_housing": "asterion_frame_alloy",
        "flow_crystal": "thornwake_crystal",
    },
    "reinforced_hull_plate": {
        "outer_plate": "asterion_frame_alloy",
        "bracing_layer": "bendrel_ridge_alloy",
        "bonding_matrix": "glimmerfall_shard",
    },
}

SCHEMATICS: dict[str, list[tuple[str, Family, int]]] = {
    "basic_drill_head": [
        ("cutting_bit", "structural_alloy", 40),
        ("conductive_coil", "conductive_metal", 40),
        ("resonance_crystal", "reactive_crystal", 40),
    ],
    "efficient_pump": [
        ("intake_manifold", "conductive_metal", 40),
        ("flexible_housing", "structural_alloy", 40),
        ("flow_crystal", "reactive_crystal", 40),
    ],
    "reinforced_hull_plate": [
        ("outer_plate", "structural_alloy", 60),
        ("bracing_layer", "structural_alloy", 40),
        ("bonding_matrix", "reactive_crystal", 20),
    ],
}

LARGEST_SOCKET_SCRAP: dict[str, int] = {
    schematic_id: max(qty for _, _, qty in slots)
    for schematic_id, slots in SCHEMATICS.items()
}

ROTATION = ["basic_drill_head", "efficient_pump", "reinforced_hull_plate"]

FAMILY_RESOURCES: dict[Family, list[str]] = {
    family: [slug for slug, fam in RESOURCES.items() if fam == family]
    for family in ("structural_alloy", "conductive_metal", "reactive_crystal")
}

# Fixed crate identities — Phase 1 baseline; Phase 2 may rotate low/mid bench picks.
CRATE_RESOURCES_FIXED: dict[Family, str] = {
    "structural_alloy": "keth_iron",
    "conductive_metal": "red_mesa_conductive_slag",
    "reactive_crystal": "pale_ember_crystal",
}

CrateMode = Literal["fixed", "varied"]

# Overdrive pulse mechanics (experimentation.ts / experimentation_sim.py)
P_OVERDRIVE_CRIT = 0.25


class ExperimentTier(NamedTuple):
    label: str
    weight: float
    overdrive_pulses: int | None  # None = sample SO(1) or OO(2) within tier


# ACCURATE: SS has zero Overdrive pulses.
EXPERIMENT_MIX_ACCURATE: list[ExperimentTier] = [
    ExperimentTier("CC/CS", 0.55, 0),
    ExperimentTier("SS", 0.35, 0),
    ExperimentTier("SO/OO", 0.10, None),  # 50% SO (1 OD), 50% OO (2 OD)
]

# CONSERVATIVE: pre-review bug — medium tier used 1 OD pulse (overstates scrap ~35% of crafts).
EXPERIMENT_MIX_CONSERVATIVE: list[ExperimentTier] = [
    ExperimentTier("CC/CS", 0.55, 0),
    ExperimentTier("SS-bugged", 0.35, 1),
    ExperimentTier("SO/OO", 0.10, None),
]

RECLAIM_CANDIDATES = [0.25, 0.35, 0.50]
TIMER_CADENCE_CANDIDATES = [5, 10, 15]
CRATE_PAYLOAD_CANDIDATES = [60, 75, 90]

# Locked Phase 2 constants — accepted product call (ACCURATE + FIXED evidence).
PRIMARY_RECLAIM_RATE = 0.35
PRIMARY_TIMER_MINUTES = 10
PRIMARY_CRATE_UNITS_PER_FAMILY = 75
PRIMARY_EMERGENCY_UNITS_PER_FAMILY = 30

# ---------------------------------------------------------------------------
# Inventory helpers
# ---------------------------------------------------------------------------


def starter_inventory() -> dict[str, int]:
    return {slug: STARTER_UNITS for slug in RESOURCES}


def floor_reclaim_units(consumed: int, rate: float) -> int:
    raw = consumed * rate
    return (int(raw) // RECLAIM_ROUND) * RECLAIM_ROUND


def family_totals(inv: dict[str, int]) -> dict[Family, int]:
    totals: dict[Family, int] = defaultdict(int)
    for slug, qty in inv.items():
        if qty > 0:
            totals[RESOURCES[slug]] += qty
    return totals


def schematic_family_needs(schematic_id: str) -> dict[Family, int]:
    needs: dict[Family, int] = defaultdict(int)
    for _, family, qty in SCHEMATICS[schematic_id]:
        needs[family] += qty
    return needs


def assign_slots(inv: dict[str, int], schematic_id: str) -> dict[str, str] | None:
    """Greedy slot assignment: prefer default pick, else highest surplus in family."""
    picks = DEFAULT_SLOT_PICKS[schematic_id]
    assignment: dict[str, str] = {}
    inv_work = dict(inv)

    for slot_id, family, qty in SCHEMATICS[schematic_id]:
        preferred = picks[slot_id]
        candidates = [
            slug
            for slug, fam in RESOURCES.items()
            if fam == family and inv_work.get(slug, 0) >= qty
        ]
        if not candidates:
            return None

        if preferred in candidates:
            chosen = preferred
        else:
            chosen = max(candidates, key=lambda slug: inv_work[slug])

        assignment[slot_id] = chosen
        inv_work[chosen] -= qty

    return assignment


def can_craft_schematic(inv: dict[str, int], schematic_id: str) -> bool:
    return assign_slots(inv, schematic_id) is not None


def any_craftable(inv: dict[str, int]) -> bool:
    return any(can_craft_schematic(inv, sid) for sid in ROTATION)


def consume_for_craft(inv: dict[str, int], schematic_id: str) -> tuple[dict[str, int], dict[str, str]]:
    """Debit inventory; return provenance consumed and slot assignment."""
    assignment = assign_slots(inv, schematic_id)
    if assignment is None:
        raise RuntimeError(f"cannot craft {schematic_id}")

    consumed: dict[str, int] = {}
    for slot_id, _, qty in SCHEMATICS[schematic_id]:
        resource = assignment[slot_id]
        inv[resource] -= qty
        consumed[resource] = consumed.get(resource, 0) + qty
    return consumed, assignment


def apply_overdrive_scrap(
    inv: dict[str, int],
    schematic_id: str,
    assignment: dict[str, str],
    scrap_units: int,
) -> dict[str, int]:
    """Debit scrap from largest socket resource used in this craft."""
    if scrap_units <= 0:
        return {}

    slots = SCHEMATICS[schematic_id]
    largest_slot = max(slots, key=lambda s: s[2])
    resource = assignment[largest_slot[0]]
    debit = min(scrap_units, inv.get(resource, 0))
    inv[resource] -= debit
    return {resource: debit}


def apply_reclaim(inv: dict[str, int], consumed: dict[str, int], rate: float) -> dict[str, int]:
    returned: dict[str, int] = {}
    for resource, units in consumed.items():
        back = floor_reclaim_units(units, rate)
        if back > 0:
            inv[resource] += back
            returned[resource] = back
    return returned


def roll_overdrive_pulses(rng: random.Random, mix: list[ExperimentTier]) -> int:
    roll = rng.random()
    cumulative = 0.0
    for tier in mix:
        cumulative += tier.weight
        if roll < cumulative:
            if tier.overdrive_pulses is not None:
                return tier.overdrive_pulses
            return 1 if rng.random() < 0.5 else 2
    return 0


def grant_crate(
    rng: random.Random,
    inv: dict[str, int],
    units_per_family: int,
    crate_mode: CrateMode,
) -> dict[str, int]:
    granted: dict[str, int] = {}
    for family in ("structural_alloy", "conductive_metal", "reactive_crystal"):
        if crate_mode == "fixed":
            resource = CRATE_RESOURCES_FIXED[family]
        else:
            resource = rng.choice(FAMILY_RESOURCES[family])
        inv[resource] += units_per_family
        granted[resource] = granted.get(resource, 0) + units_per_family
    return granted


def roll_overdrive_scrap(rng: random.Random, schematic_id: str, overdrive_pulses: int) -> int:
    scrap_per_crit = LARGEST_SOCKET_SCRAP[schematic_id]
    total = 0
    for _ in range(overdrive_pulses):
        if rng.random() < P_OVERDRIVE_CRIT:
            total += scrap_per_crit
    return total


# ---------------------------------------------------------------------------
# Session configuration
# ---------------------------------------------------------------------------


@dataclass
class ScenarioConfig:
    name: str
    experiment_mix: list[ExperimentTier]
    crate_mode: CrateMode
    description: str


@dataclass
class SupplyConfig:
    reclaim_rate: float
    timer_minutes: int
    crate_units_per_family: int
    scenario: ScenarioConfig
    emergency_units_per_family: int = 30

    def label(self) -> str:
        return (
            f"reclaim={self.reclaim_rate:.0%}  timer={self.timer_minutes}m  "
            f"crate={self.crate_units_per_family}u/family"
        )


SCENARIOS: list[ScenarioConfig] = [
    ScenarioConfig(
        name="ACCURATE + FIXED CRATES",
        experiment_mix=EXPERIMENT_MIX_ACCURATE,
        crate_mode="fixed",
        description=(
            "Primary evidence run. SS has zero Overdrive pulses. "
            "Fixed crate stacks (keth / slag / pale) — Phase 2 may rotate picks."
        ),
    ),
    ScenarioConfig(
        name="ACCURATE + VARIED CRATES",
        experiment_mix=EXPERIMENT_MIX_ACCURATE,
        crate_mode="varied",
        description=(
            "Discovery-richness probe: each crate grants a random named resource "
            "per family (uniform over 3 bench identities)."
        ),
    ),
    ScenarioConfig(
        name="CONSERVATIVE HIGH-SCRAP + FIXED CRATES",
        experiment_mix=EXPERIMENT_MIX_CONSERVATIVE,
        crate_mode="fixed",
        description=(
            "Upper-bound scrap stress: medium tier wrongly applies 1 Overdrive pulse "
            "(pre-review bug). Use to bracket constant safety."
        ),
    ),
]


@dataclass
class SessionMetrics:
    crafts_by_minute: dict[int, int] = field(default_factory=dict)
    soft_lock_before_timer: bool = False
    soft_lock_events: int = 0
    emergency_crates: int = 0
    timer_crates: int = 0
    craft_count_crates: int = 0
    net_crate_minted: int = 0
    net_reclaim_returned: int = 0
    net_craft_consumed: int = 0
    net_scrap_consumed: int = 0
    total_crafts: int = 0
    inventory_snapshots: list[int] = field(default_factory=list)
    hull_crafts: int = 0
    sa_remaining_end: int = 0


def simulate_session(rng: random.Random, cfg: SupplyConfig) -> SessionMetrics:
    inv = starter_inventory()
    metrics = SessionMetrics()
    minute = 0.0
    next_timer_at = float(cfg.timer_minutes)
    crafts_since_crate = 0
    rotation_idx = 0
    kept_items: dict[str, dict[str, int]] = {}  # schematic_id -> last kept provenance
    pending_reclaim: dict[str, int] | None = None
    pending_schematic: str | None = None

    crafts_at_checkpoint: dict[int, int] = {m: 0 for m in TIME_CHECKPOINTS}
    recorded_checkpoints: set[int] = set()

    def record_checkpoint() -> None:
        for cp in TIME_CHECKPOINTS:
            if cp not in recorded_checkpoints and minute >= cp:
                crafts_at_checkpoint[cp] = metrics.total_crafts
                recorded_checkpoints.add(cp)

    def open_crate(reason: str, units: int) -> None:
        nonlocal crafts_since_crate
        granted = grant_crate(rng, inv, units, cfg.scenario.crate_mode)
        metrics.net_crate_minted += sum(granted.values())
        if reason == "timer":
            metrics.timer_crates += 1
        elif reason == "craft_count":
            metrics.craft_count_crates += 1
        elif reason == "emergency":
            metrics.emergency_crates += 1

    while minute < HORIZON_MINUTES:
        record_checkpoint()

        if not any_craftable(inv):
            metrics.soft_lock_events += 1
            if minute < next_timer_at:
                metrics.soft_lock_before_timer = True
            open_crate("emergency", cfg.emergency_units_per_family)
            minute += 1
            continue

        schematic_id = ROTATION[rotation_idx % len(ROTATION)]
        rotation_idx += 1

        if not can_craft_schematic(inv, schematic_id):
            for offset in range(1, len(ROTATION)):
                alt = ROTATION[(rotation_idx + offset) % len(ROTATION)]
                if can_craft_schematic(inv, alt):
                    schematic_id = alt
                    break
            else:
                continue

        if pending_reclaim is not None and pending_schematic is not None:
            returned = apply_reclaim(inv, pending_reclaim, cfg.reclaim_rate)
            metrics.net_reclaim_returned += sum(returned.values())

        consumed, assignment = consume_for_craft(inv, schematic_id)
        metrics.net_craft_consumed += sum(consumed.values())
        metrics.total_crafts += 1
        crafts_since_crate += 1
        if schematic_id == "reinforced_hull_plate":
            metrics.hull_crafts += 1

        overdrive_pulses = roll_overdrive_pulses(rng, cfg.scenario.experiment_mix)
        scrap = roll_overdrive_scrap(rng, schematic_id, overdrive_pulses)
        scrap_debit = apply_overdrive_scrap(inv, schematic_id, assignment, scrap)
        metrics.net_scrap_consumed += sum(scrap_debit.values())

        if schematic_id in kept_items:
            pending_reclaim = consumed
            pending_schematic = schematic_id
        else:
            kept_items[schematic_id] = consumed
            pending_reclaim = None
            pending_schematic = None

        minute += CRAFT_MINUTES
        record_checkpoint()

        while minute >= next_timer_at:
            open_crate("timer", cfg.crate_units_per_family)
            next_timer_at += cfg.timer_minutes

        if crafts_since_crate >= CRAFT_COUNT_CRATE_INTERVAL:
            open_crate("craft_count", cfg.crate_units_per_family)
            crafts_since_crate = 0

        metrics.inventory_snapshots.append(sum(inv.values()))

    for cp in TIME_CHECKPOINTS:
        if cp not in recorded_checkpoints:
            crafts_at_checkpoint[cp] = metrics.total_crafts
    metrics.crafts_by_minute = crafts_at_checkpoint
    metrics.sa_remaining_end = family_totals(inv)["structural_alloy"]
    return metrics


# ---------------------------------------------------------------------------
# Reclaim-loop inflation test (deterministic, no RNG crates)
# ---------------------------------------------------------------------------


def reclaim_loop_net_gain(reclaim_rate: float, schematic_id: str, iterations: int = 50) -> int:
    """Craft + immediate reclaim repeatedly; return net units delta (should be <= 0)."""
    inv = starter_inventory()
    net_delta = 0
    for _ in range(iterations):
        if not can_craft_schematic(inv, schematic_id):
            break
        before = sum(inv.values())
        consumed, _ = consume_for_craft(inv, schematic_id)
        returned = apply_reclaim(inv, consumed, reclaim_rate)
        after = sum(inv.values())
        net_delta += after - before
        if sum(returned.values()) >= sum(consumed.values()):
            return net_delta
    return net_delta


# ---------------------------------------------------------------------------
# Aggregate reporting
# ---------------------------------------------------------------------------


@dataclass
class CellSummary:
    config: SupplyConfig
    crafts_p10: float
    crafts_p20: float
    crafts_p30: float
    crafts_p60: float
    p_soft_lock_before_timer: float
    net_crate_minted_mean: float
    net_reclaim_mean: float
    net_craft_consumed_mean: float
    net_scrap_mean: float
    inventory_median: float
    inventory_p95: float
    reclaim_loop_worst: int
    hull_sa_pressure: float
    score: float


def summarize_cell(rng: random.Random, cfg: SupplyConfig) -> CellSummary:
    sessions = [simulate_session(rng, cfg) for _ in range(N_SESSIONS)]

    crafts_p10 = statistics.mean(s.crafts_by_minute[10] for s in sessions)
    crafts_p20 = statistics.mean(s.crafts_by_minute[20] for s in sessions)
    crafts_p30 = statistics.mean(s.crafts_by_minute[30] for s in sessions)
    crafts_p60 = statistics.mean(s.crafts_by_minute[60] for s in sessions)

    p_soft = sum(1 for s in sessions if s.soft_lock_before_timer) / N_SESSIONS

    inv_all = [v for s in sessions for v in s.inventory_snapshots]
    inv_median = statistics.median(inv_all) if inv_all else 0
    inv_p95 = (
        sorted(inv_all)[int(0.95 * len(inv_all))] if inv_all else 0
    )

    loop_worst = max(
        reclaim_loop_net_gain(cfg.reclaim_rate, sid)
        for sid in ROTATION
    )

    hull_sa = statistics.mean(s.sa_remaining_end for s in sessions)

    starter_total = STARTER_UNITS * len(RESOURCES)
    inv_ratio = inv_median / starter_total

    score = crafts_p60
    score -= 120 * p_soft
    score -= 20 * max(0, loop_worst)
    score -= 35 * max(0, inv_ratio - 1.08)
    score -= 4 * max(0, 10 - cfg.timer_minutes)
    if crafts_p30 < 8:
        score -= (8 - crafts_p30) * 2

    return CellSummary(
        config=cfg,
        crafts_p10=crafts_p10,
        crafts_p20=crafts_p20,
        crafts_p30=crafts_p30,
        crafts_p60=crafts_p60,
        p_soft_lock_before_timer=p_soft,
        net_crate_minted_mean=statistics.mean(s.net_crate_minted for s in sessions),
        net_reclaim_mean=statistics.mean(s.net_reclaim_returned for s in sessions),
        net_craft_consumed_mean=statistics.mean(s.net_craft_consumed for s in sessions),
        net_scrap_mean=statistics.mean(s.net_scrap_consumed for s in sessions),
        inventory_median=inv_median,
        inventory_p95=inv_p95,
        reclaim_loop_worst=loop_worst,
        hull_sa_pressure=hull_sa,
        score=score,
    )


def print_starter_analysis() -> None:
    print("=" * 72)
    print("STARTER BUDGET — no reclaim/crates")
    print("=" * 72)
    for sid in ROTATION:
        needs = schematic_family_needs(sid)
        print(
            f"  {sid:<24}  SA={needs['structural_alloy']:>3}u  "
            f"CM={needs['conductive_metal']:>3}u  RC={needs['reactive_crystal']:>3}u  "
            f"total={sum(needs.values())}u"
        )
    print()
    print("  Full rotation (1× each) family drain:")
    rot_needs: dict[Family, int] = defaultdict(int)
    for sid in ROTATION:
        for fam, qty in schematic_family_needs(sid).items():
            rot_needs[fam] += qty
    starter_fam = {f: STARTER_UNITS * 3 for f in FAMILY_RESOURCES}
    for fam in ("structural_alloy", "conductive_metal", "reactive_crystal"):
        drain = rot_needs[fam]
        stock = starter_fam[fam]
        print(f"    {fam}: {drain}u consumed vs {stock}u starter ({drain/stock:.0%} of family stock)")
    print()
    print("  Reinforced Hull Plate is structural-alloy heavy (100u SA per craft).")
    print(f"  Starter SA family stock = {STARTER_UNITS * 3}u → ~{STARTER_UNITS * 3 // 100} hull-only crafts.")


def print_reclaim_table() -> None:
    print("\n" + "=" * 72)
    print("RECLAIM ROUNDING (5u increment)")
    print("=" * 72)
    print(f"  {'Consumed':>10}  {'25%':>6}  {'35%':>6}  {'50%':>6}")
    for consumed in (20, 40, 60):
        row = f"  {consumed:>10}"
        for rate in RECLAIM_CANDIDATES:
            row += f"  {floor_reclaim_units(consumed, rate):>6}"
        print(row)


def print_sweep_table(cells: list[CellSummary], scenario: ScenarioConfig) -> None:
    print("\n" + "=" * 72)
    print(f"SCENARIO: {scenario.name}")
    print(f"  {scenario.description}")
    print("=" * 72)
    print(f"PARAMETER SWEEP — {N_SESSIONS:,} sessions × {HORIZON_MINUTES}m  |  craft={CRAFT_MINUTES}m")
    print("=" * 72)
    header = (
        f"  {'reclaim':>7}  {'timer':>5}  {'crate':>5}  "
        f"{'craft60':>7}  {'soft%':>6}  {'loop':>4}  "
        f"{'net_in':>7}  {'net_out':>7}  {'inv_med':>7}  {'SA_end':>6}  {'score':>6}"
    )
    print(header)
    print("  " + "-" * (len(header) - 2))
    for c in sorted(cells, key=lambda x: -x.score):
        cfg = c.config
        net_in = c.net_crate_minted_mean + c.net_reclaim_mean
        net_out = c.net_craft_consumed_mean + c.net_scrap_mean
        mark = ""
        print(
            f"  {cfg.reclaim_rate:>6.0%}  {cfg.timer_minutes:>4}m  {cfg.crate_units_per_family:>4}u  "
            f"{c.crafts_p60:>7.1f}  {100*c.p_soft_lock_before_timer:>5.1f}%  "
            f"{c.reclaim_loop_worst:>4}  {net_in:>7.0f}  {net_out:>7.0f}  "
            f"{c.inventory_median:>7.0f}  {c.hull_sa_pressure:>6.0f}  {c.score:>6.1f}{mark}"
        )


def print_hull_spam_scenario(rng: random.Random, cfg: SupplyConfig) -> None:
    print("\n" + "=" * 72)
    print(f"HULL-SPAM STRESS — {cfg.label()}")
    print("=" * 72)

    soft_sessions = 0
    crafts_60 = []
    for _ in range(3_000):
        inv = starter_inventory()
        minute = 0.0
        next_timer = float(cfg.timer_minutes)
        crafts = 0
        crafts_since = 0
        saw_soft_before_timer = False
        while minute < HORIZON_MINUTES:
            if not can_craft_schematic(inv, "reinforced_hull_plate"):
                if minute < next_timer:
                    saw_soft_before_timer = True
                grant_crate(rng, inv, cfg.emergency_units_per_family, cfg.scenario.crate_mode)
                minute += 1
                continue
            _, _ = consume_for_craft(inv, "reinforced_hull_plate")
            crafts += 1
            crafts_since += 1
            minute += CRAFT_MINUTES
            while minute >= next_timer:
                grant_crate(rng, inv, cfg.crate_units_per_family, cfg.scenario.crate_mode)
                next_timer += cfg.timer_minutes
            if crafts_since >= CRAFT_COUNT_CRATE_INTERVAL:
                grant_crate(rng, inv, cfg.crate_units_per_family, cfg.scenario.crate_mode)
                crafts_since = 0
        crafts_60.append(crafts)
        if saw_soft_before_timer:
            soft_sessions += 1

    print(f"  Hull-only crafts in 60m (mean): {statistics.mean(crafts_60):.1f}")
    print(f"  Soft-lock before timer (no reclaim): {100*soft_sessions/3000:.1f}%")


def run_scenario(rng: random.Random, scenario: ScenarioConfig) -> tuple[list[CellSummary], CellSummary]:
    cells: list[CellSummary] = []
    for reclaim_rate in RECLAIM_CANDIDATES:
        for timer_minutes in TIMER_CADENCE_CANDIDATES:
            for crate_units in CRATE_PAYLOAD_CANDIDATES:
                cfg = SupplyConfig(
                    reclaim_rate=reclaim_rate,
                    timer_minutes=timer_minutes,
                    crate_units_per_family=crate_units,
                    scenario=scenario,
                )
                cells.append(summarize_cell(rng, cfg))

    print_sweep_table(cells, scenario)
    best = max(cells, key=lambda c: c.score)
    cfg = best.config

    print("\n" + "-" * 72)
    print(f"RECOMMENDED CELL — {scenario.name}")
    print("-" * 72)
    print(f"  {cfg.label()}")
    print(f"  Crafts @10/20/30/60m: {best.crafts_p10:.1f} / {best.crafts_p20:.1f} / "
          f"{best.crafts_p30:.1f} / {best.crafts_p60:.1f}")
    print(f"  Soft-lock before next timed crate: {100*best.p_soft_lock_before_timer:.2f}%")
    print(f"  Net crate mint (mean): {best.net_crate_minted_mean:.0f}u")
    print(f"  Net reclaim return (mean): {best.net_reclaim_mean:.0f}u")
    print(f"  Net craft consumed (mean): {best.net_craft_consumed_mean:.0f}u")
    print(f"  Net Overdrive scrap (mean): {best.net_scrap_mean:.0f}u")
    print(f"  Inventory median / p95: {best.inventory_median:.0f} / {best.inventory_p95:.0f}u")
    print(f"  SA family remaining @60m (mean): {best.hull_sa_pressure:.0f}u")
    print(f"  Reclaim-loop worst net delta: {best.reclaim_loop_worst}u")

    return cells, best


def print_verdict(scenario: ScenarioConfig, best: CellSummary) -> None:
    cfg = best.config
    soft_ok = best.p_soft_lock_before_timer < 0.01
    loop_ok = best.reclaim_loop_worst <= 0
    craft_ok = best.crafts_p60 >= 15
    starter_total = STARTER_UNITS * len(RESOURCES)
    inventory_stable = best.inventory_median <= starter_total * 1.05

    print(f"\n  [{scenario.name}]")
    print(f"  recommended_reclaim_pct       = {cfg.reclaim_rate:.0%}")
    print(f"  recommended_timer_minutes     = {cfg.timer_minutes}")
    print(f"  recommended_craft_count_crate = every {CRAFT_COUNT_CRATE_INTERVAL} completed crafts")
    if cfg.scenario.crate_mode == "fixed":
        print(f"  recommended_crate_payload     = {cfg.crate_units_per_family}u × 3 families "
              f"({CRATE_RESOURCES_FIXED['structural_alloy']}, "
              f"{CRATE_RESOURCES_FIXED['conductive_metal']}, "
              f"{CRATE_RESOURCES_FIXED['reactive_crystal']})")
    else:
        print(f"  recommended_crate_payload     = {cfg.crate_units_per_family}u × 3 families "
              f"(random low/mid named resource per family)")
    print(f"  recommended_emergency_crate   = {cfg.emergency_units_per_family}u × 3 families")
    print(f"  soft_lock_risk                = "
          f"{'LOW' if soft_ok else 'MODERATE'} ({100*best.p_soft_lock_before_timer:.2f}%)")
    print(f"  inflation_risk                = "
          f"{'LOW' if loop_ok and inventory_stable else 'ELEVATED'} "
          f"(reclaim-loop worst={best.reclaim_loop_worst}u; "
          f"median inventory {best.inventory_median:.0f}u vs {starter_total}u starter)")
    print(f"  crafts_60m_mean               = {best.crafts_p60:.1f}")
    print(f"  mean_overdrive_scrap          = {best.net_scrap_mean:.0f}u / session")
    status = "PASS" if soft_ok and loop_ok and craft_ok and inventory_stable else "REVIEW"
    print(f"  scenario_verdict              = {status}")


def primary_supply_config(scenario: ScenarioConfig) -> SupplyConfig:
    return SupplyConfig(
        reclaim_rate=PRIMARY_RECLAIM_RATE,
        timer_minutes=PRIMARY_TIMER_MINUTES,
        crate_units_per_family=PRIMARY_CRATE_UNITS_PER_FAMILY,
        emergency_units_per_family=PRIMARY_EMERGENCY_UNITS_PER_FAMILY,
        scenario=scenario,
    )


def print_primary_constants_bracket(
    rng: random.Random,
    accurate_scenario: ScenarioConfig,
    conservative_scenario: ScenarioConfig,
) -> None:
    """Compare ACCURATE vs CONSERVATIVE mix using the same locked supply constants."""
    primary_accurate = summarize_cell(rng, primary_supply_config(accurate_scenario))
    primary_conservative = summarize_cell(rng, primary_supply_config(conservative_scenario))

    print()
    print("  PRIMARY CONSTANTS (ACCURATE mix, fixed crates):")
    print(
        f"    reclaim={PRIMARY_RECLAIM_RATE:.0%}  timer={PRIMARY_TIMER_MINUTES}m  "
        f"crate={PRIMARY_CRATE_UNITS_PER_FAMILY}u/family  "
        f"scrap={primary_accurate.net_scrap_mean:.0f}u  "
        f"soft={100 * primary_accurate.p_soft_lock_before_timer:.2f}%  "
        f"craft60={primary_accurate.crafts_p60:.1f}"
    )
    print("  CONSERVATIVE SCRAP BOUND (primary constants, bugged medium tier):")
    print(
        f"    scrap={primary_conservative.net_scrap_mean:.0f}u  "
        f"(+{primary_conservative.net_scrap_mean - primary_accurate.net_scrap_mean:.0f}u vs accurate)  "
        f"soft={100 * primary_conservative.p_soft_lock_before_timer:.2f}%  "
        f"craft60={primary_conservative.crafts_p60:.1f}"
    )


def main() -> None:
    print(__doc__)
    rng = random.Random(2026_06_16)

    print_starter_analysis()
    print_reclaim_table()

    print("\n" + "=" * 72)
    print("EXPERIMENT MIX DEFINITIONS")
    print("=" * 72)
    for tier in EXPERIMENT_MIX_ACCURATE:
        od = "SO/OO sample 1–2" if tier.overdrive_pulses is None else str(tier.overdrive_pulses)
        print(f"  ACCURATE      {tier.label:<8} weight={tier.weight:.0%}  overdrive_pulses={od}")
    for tier in EXPERIMENT_MIX_CONSERVATIVE:
        od = "SO/OO sample 1–2" if tier.overdrive_pulses is None else str(tier.overdrive_pulses)
        print(f"  CONSERVATIVE  {tier.label:<8} weight={tier.weight:.0%}  overdrive_pulses={od}")

    print("\n" + "=" * 72)
    print("RECLAIM LOOP CHECK — craft + immediate reclaim (no crates)")
    print("=" * 72)
    for rate in RECLAIM_CANDIDATES:
        loops = {sid: reclaim_loop_net_gain(rate, sid) for sid in ROTATION}
        flag = "INFLATION" if any(v > 0 for v in loops.values()) else "OK"
        print(f"  {rate:.0%}  {loops}  [{flag}]")

    results: list[tuple[ScenarioConfig, CellSummary]] = []
    accurate_fixed_scenario = SCENARIOS[0]
    conservative_scenario = SCENARIOS[2]
    for scenario in SCENARIOS:
        _, best = run_scenario(rng, scenario)
        results.append((scenario, best))
        if scenario.name.startswith("ACCURATE + FIXED"):
            print_hull_spam_scenario(rng, primary_supply_config(scenario))

    print("\n" + "=" * 72)
    print("VERDICT")
    print("=" * 72)
    print("  Phase 2 should use ACCURATE mix evidence. CONSERVATIVE row brackets scrap overhead.")
    print("  Fixed crates are Phase 1 default; consider varied low/mid rotation for discovery.")
    print()
    for scenario, best in results:
        print_verdict(scenario, best)

    print_primary_constants_bracket(rng, accurate_fixed_scenario, conservative_scenario)
    print()
    print("  Phase 1 accepted — encode PRIMARY CONSTANTS in packages/domain (Phase 2).")


if __name__ == "__main__":
    main()
