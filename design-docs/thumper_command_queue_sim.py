"""Thumper command-queue simulation harness.

DESIGN QUESTION
===============
Before replacing the defense action menu, does an Armada-inspired command queue
create real planning tradeoffs without collapsing into a single obvious command?

This script is a product gate, not a balance oracle. It models the candidate
grammar:

- Small/starter thumper: 2 queued commands.
- Medium thumper: 3 queued commands.
- Large thumper: 4 queued commands.
- Each beat resolves the queued command first, then the field event.
- The player only fills the newest empty slot at the back of the queue.
- Commands are intentionally tiny: Drill, Bank, Brace, Vent.
- Scanner quality changes forecast precision, not raw yield.

Run:

    python3 design-docs/thumper_command_queue_sim.py
    python3 design-docs/thumper_command_queue_sim.py --runs 5000 --seed 20260621

Gate assumptions to inspect:

- "Cargo +N" must not imply "always Bank now"; Bank fires before that cargo arrives.
- A simple event-matching policy should underperform a planning policy.
- Bad scanner should be worse than good scanner, but not feel like pure random.
- Longer queues should add inertia; they need better forecast to feel fair.
"""

from __future__ import annotations

import argparse
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from statistics import mean, median


COMMANDS = ("Drill", "Bank", "Brace", "Vent")
EVENTS = ("Cargo", "Hull", "Heat", "Raid")
RUN_BEATS = 18
HEAT_LIMIT = 10
STARTING_HULL = 55
STARTING_HEAT = 3


@dataclass(frozen=True)
class FieldEvent:
    kind: str
    amount: int

    def label(self) -> str:
        sign = "+" if self.kind in {"Cargo", "Heat"} else "-"
        return f"{self.kind} {sign}{self.amount}"


@dataclass(frozen=True)
class ForecastToken:
    kind: str | None
    amount: int | None

    def label(self) -> str:
        if self.kind is None:
            return "?"
        if self.amount is None:
            return f"{self.kind} ?"
        sign = "+" if self.kind in {"Cargo", "Heat"} else "-"
        return f"{self.kind} {sign}{self.amount}"


@dataclass
class State:
    cargo: int = 0
    banked: int = 0
    hull: int = STARTING_HULL
    heat: int = STARTING_HEAT
    brace: int = 0
    lost: int = 0
    surge_count: int = 0
    wasted_brace_count: int = 0

    def clone(self) -> "State":
        return State(
            cargo=self.cargo,
            banked=self.banked,
            hull=self.hull,
            heat=self.heat,
            brace=self.brace,
            lost=self.lost,
            surge_count=self.surge_count,
            wasted_brace_count=self.wasted_brace_count,
        )


@dataclass
class RunResult:
    policy: str
    scanner: str
    queue_len: int
    banked: int
    cargo: int
    hull: int
    heat: int
    lost: int
    surge_count: int
    wasted_brace_count: int
    command_counts: Counter[str]
    command_sequence: tuple[str, ...]
    visible_unknown_ratio: float

    def repair_debt(self) -> float:
        hull_debt = max(0, STARTING_HULL - self.hull) * 0.65
        heat_debt = max(0, self.heat - STARTING_HEAT) * 0.25
        surge_debt = self.surge_count * 2.5
        loss_debt = self.lost * 0.2
        return hull_debt + heat_debt + surge_debt + loss_debt

    def score(self) -> float:
        return (
            self.banked
            + self.cargo * 0.25
            - self.repair_debt()
            - max(0, 42 - self.hull) * 0.35
        )


def generate_events(rng: random.Random, beats: int = RUN_BEATS) -> list[FieldEvent]:
    events: list[FieldEvent] = []
    heat_bias = 0
    for beat in range(beats):
        roll = rng.random()
        if beat in {4, 9, 14} and rng.random() < 0.62:
            kind = rng.choice(("Hull", "Raid", "Heat"))
        elif roll < 0.38:
            kind = "Cargo"
        elif roll < 0.62:
            kind = "Heat"
        elif roll < 0.82:
            kind = "Hull"
        else:
            kind = "Raid"

        if kind == "Cargo":
            amount = rng.randint(2, 4)
            heat_bias = max(0, heat_bias - 1)
        elif kind == "Heat":
            amount = rng.randint(2 + heat_bias, 4 + heat_bias)
            heat_bias = min(2, heat_bias + 1)
        else:
            amount = rng.randint(1, 3)

        events.append(FieldEvent(kind=kind, amount=amount))
    return events


def reveal_event(event: FieldEvent, scanner: str, distance: int, rng: random.Random) -> ForecastToken:
    """Return what the player can see for an event at a future queue distance."""
    if scanner == "poor":
        kind_chance = {0: 0.75, 1: 0.45, 2: 0.25, 3: 0.15}.get(distance, 0.1)
        amount_chance = {0: 0.2, 1: 0.08, 2: 0.0, 3: 0.0}.get(distance, 0.0)
    elif scanner == "basic":
        kind_chance = {0: 0.9, 1: 0.7, 2: 0.45, 3: 0.3}.get(distance, 0.2)
        amount_chance = {0: 0.55, 1: 0.3, 2: 0.12, 3: 0.05}.get(distance, 0.0)
    elif scanner == "good":
        kind_chance = {0: 1.0, 1: 0.9, 2: 0.72, 3: 0.55}.get(distance, 0.35)
        amount_chance = {0: 0.85, 1: 0.65, 2: 0.4, 3: 0.2}.get(distance, 0.1)
    else:
        raise ValueError(f"Unknown scanner: {scanner}")

    if rng.random() > kind_chance:
        return ForecastToken(kind=None, amount=None)
    if rng.random() > amount_chance:
        return ForecastToken(kind=event.kind, amount=None)
    return ForecastToken(kind=event.kind, amount=event.amount)


def forecast_for(
    events: list[FieldEvent],
    beat: int,
    queue_len: int,
    scanner: str,
    rng: random.Random,
) -> list[ForecastToken]:
    tokens: list[ForecastToken] = []
    for offset in range(queue_len):
        index = beat + offset
        if index >= len(events):
            tokens.append(ForecastToken(kind=None, amount=None))
        else:
            tokens.append(reveal_event(events[index], scanner, offset, rng))
    return tokens


def apply_command(state: State, command: str) -> None:
    if command == "Drill":
        state.cargo += 3
        state.heat += 2
    elif command == "Bank":
        moved = state.cargo
        state.cargo = 0
        state.banked += moved
    elif command == "Brace":
        if state.brace > 0:
            state.wasted_brace_count += 1
        state.brace = 2
    elif command == "Vent":
        state.heat = max(0, state.heat - 3)
        vent_loss = min(state.cargo, 1)
        state.cargo -= vent_loss
        state.lost += vent_loss
    else:
        raise ValueError(f"Unknown command: {command}")


def apply_event(state: State, event: FieldEvent) -> None:
    if event.kind == "Cargo":
        state.cargo += event.amount
    elif event.kind == "Heat":
        state.heat += event.amount
    elif event.kind in {"Hull", "Raid"}:
        if state.brace > 0:
            state.brace -= 1
            return
        if event.kind == "Hull":
            state.hull -= event.amount
        else:
            loss = min(state.cargo, event.amount)
            state.cargo -= loss
            state.lost += loss
            if loss < event.amount:
                state.hull -= 1
    else:
        raise ValueError(f"Unknown event: {event.kind}")

    if state.heat >= HEAT_LIMIT:
        state.surge_count += 1
        state.hull -= 2
        loss = min(state.cargo, 2)
        state.cargo -= loss
        state.lost += loss
        state.heat = 5


def visible_amount(token: ForecastToken, default: int) -> int:
    return token.amount if token.amount is not None else default


def unknown_event_for_planning() -> FieldEvent:
    # Average-ish uncertainty: enough risk that blind greed is not free.
    return FieldEvent("Heat", 2)


def token_to_event(token: ForecastToken) -> FieldEvent:
    if token.kind is None:
        return unknown_event_for_planning()
    default = 3 if token.kind in {"Cargo", "Heat"} else 2
    return FieldEvent(token.kind, visible_amount(token, default))


def evaluate_state(state: State) -> float:
    return (
        state.banked
        + state.cargo * 0.35
        + max(0, state.hull - 45) * 0.1
        - max(0, 45 - state.hull) * 1.2
        - state.heat * 0.24
        - state.surge_count * 3.5
        - state.lost * 0.4
    )


def rollout_score(
    state: State,
    queue: list[str],
    forecast: list[ForecastToken],
    candidate: str,
) -> float:
    sim_state = state.clone()
    sim_queue = [*queue, candidate]

    for offset, command in enumerate(sim_queue):
        apply_command(sim_state, command)
        if offset < len(forecast):
            apply_event(sim_state, token_to_event(forecast[offset]))
    return evaluate_state(sim_state)


def choose_command(
    policy: str,
    state: State,
    queue: list[str],
    forecast: list[ForecastToken],
    rng: random.Random,
) -> str:
    candidate_offset = min(len(queue), max(0, len(forecast) - 1))
    far_token = forecast[candidate_offset] if forecast else ForecastToken(None, None)

    if policy == "random":
        return rng.choice(COMMANDS)

    if policy == "greedy":
        if state.heat >= 9:
            return "Vent"
        if state.cargo >= 4:
            return "Bank"
        return "Drill"

    if policy == "event_matcher":
        if far_token.kind in {"Hull", "Raid"}:
            return "Brace"
        if far_token.kind == "Heat":
            return "Vent"
        if far_token.kind == "Cargo":
            return "Bank"
        return "Drill"

    if policy == "cautious":
        visible_kinds = {token.kind for token in forecast if token.kind is not None}
        if state.heat >= 7 or "Heat" in visible_kinds:
            return "Vent"
        if "Hull" in visible_kinds or "Raid" in visible_kinds:
            return "Brace"
        if state.cargo >= 3:
            return "Bank"
        return "Drill"

    if policy == "planner":
        scores = {
            command: rollout_score(state, queue, forecast, command)
            for command in COMMANDS
        }
        best_score = max(scores.values())
        best = [command for command, score in scores.items() if score == best_score]
        # Stable tie-breaker favors readability, not greed.
        for command in ("Bank", "Brace", "Vent", "Drill"):
            if command in best:
                return command

    if policy == "oracle":
        # The caller passes true events as fully revealed forecast for this policy.
        scores = {
            command: rollout_score(state, queue, forecast, command)
            for command in COMMANDS
        }
        return max(scores, key=scores.get)

    raise ValueError(f"Unknown policy: {policy}")


def run_one(
    *,
    seed: int,
    queue_len: int,
    scanner: str,
    policy: str,
) -> RunResult:
    event_rng = random.Random(seed)
    forecast_rng = random.Random(seed + 10_000)
    policy_rng = random.Random(seed + 20_000)
    events = generate_events(event_rng)
    state = State()
    queue: list[str] = []
    command_counts: Counter[str] = Counter()
    command_sequence: list[str] = []
    visible_unknown = 0
    visible_total = 0

    # Initial stack, like Armada setup: fill the whole command value.
    for _ in range(queue_len):
        forecast = forecast_for(events, 0, max(1, queue_len), scanner, forecast_rng)
        if policy == "oracle":
            forecast = [ForecastToken(event.kind, event.amount) for event in events[:queue_len]]
        visible_unknown += sum(1 for token in forecast if token.kind is None)
        visible_total += len(forecast)
        queue.append(choose_command(policy, state, queue or ["Drill"], forecast, policy_rng))

    for beat, event in enumerate(events):
        command = queue.pop(0)
        command_counts[command] += 1
        command_sequence.append(command)
        apply_command(state, command)
        apply_event(state, event)

        if beat < len(events) - 1:
            forecast = forecast_for(events, beat + 1, queue_len, scanner, forecast_rng)
            if policy == "oracle":
                forecast = [
                    ForecastToken(future.kind, future.amount)
                    for future in events[beat + 1 : beat + 1 + queue_len]
                ]
            visible_unknown += sum(1 for token in forecast if token.kind is None)
            visible_total += len(forecast)
            queue.append(choose_command(policy, state, queue or ["Drill"], forecast, policy_rng))

    # Claim converts remaining loose cargo at a lossy floor, so Bank still matters.
    state.banked += int(state.cargo * 0.45)
    state.cargo = 0

    return RunResult(
        policy=policy,
        scanner=scanner,
        queue_len=queue_len,
        banked=state.banked,
        cargo=state.cargo,
        hull=state.hull,
        heat=state.heat,
        lost=state.lost,
        surge_count=state.surge_count,
        wasted_brace_count=state.wasted_brace_count,
        command_counts=command_counts,
        command_sequence=tuple(command_sequence),
        visible_unknown_ratio=visible_unknown / max(1, visible_total),
    )


def summarize(results: list[RunResult]) -> list[dict]:
    groups: dict[tuple[str, int, str], list[RunResult]] = defaultdict(list)
    for result in results:
        groups[(result.scanner, result.queue_len, result.policy)].append(result)

    rows: list[dict] = []
    for (scanner, queue_len, policy), group in sorted(groups.items()):
        command_totals: Counter[str] = Counter()
        sequence_totals: Counter[tuple[str, ...]] = Counter()
        for result in group:
            command_totals.update(result.command_counts)
            sequence_totals.update([result.command_sequence])
        total_commands = sum(command_totals.values())
        top_command, top_count = command_totals.most_common(1)[0]
        top_sequence_count = sequence_totals.most_common(1)[0][1]
        rows.append(
            {
                "scanner": scanner,
                "queue": queue_len,
                "policy": policy,
                "banked_median": median(result.banked for result in group),
                "banked_mean": mean(result.banked for result in group),
                "score_mean": mean(result.score() for result in group),
                "hull_p10": sorted(result.hull for result in group)[max(0, int(len(group) * 0.1) - 1)],
                "surge_mean": mean(result.surge_count for result in group),
                "repair_debt_mean": mean(result.repair_debt() for result in group),
                "wasted_brace_mean": mean(result.wasted_brace_count for result in group),
                "unknown_pct": mean(result.visible_unknown_ratio for result in group) * 100,
                "top_command": top_command,
                "top_command_pct": (top_count / max(1, total_commands)) * 100,
                "unique_sequences": len(sequence_totals),
                "top_sequence_pct": (top_sequence_count / max(1, len(group))) * 100,
            }
        )
    return rows


def print_rows(rows: list[dict]) -> None:
    print("=" * 108)
    print("THUMPER COMMAND QUEUE SIM — forecast + committed command stack")
    print("=" * 108)
    print(
        f"{'scanner':<7} {'q':>1} {'policy':<13} {'bank med':>8} {'bank avg':>8} "
        f"{'score':>7} {'debt':>6} {'hull p10':>8} {'surge':>6} {'seq%':>6} {'?%':>6} {'top cmd':>9}"
    )
    for row in rows:
        print(
            f"{row['scanner']:<7} {row['queue']:>1} {row['policy']:<13} "
            f"{row['banked_median']:>8.1f} {row['banked_mean']:>8.1f} "
            f"{row['score_mean']:>7.1f} {row['repair_debt_mean']:>6.1f} "
            f"{row['hull_p10']:>8.1f} {row['surge_mean']:>6.2f} "
            f"{row['top_sequence_pct']:>5.1f}% "
            f"{row['unknown_pct']:>5.1f}% {row['top_command']:>5} {row['top_command_pct']:>4.0f}%"
        )


def print_gates(rows: list[dict]) -> None:
    print()
    print("DESIGN GATES")
    print("-" * 108)

    def find(scanner: str, queue: int, policy: str) -> dict:
        return next(
            row
            for row in rows
            if row["scanner"] == scanner and row["queue"] == queue and row["policy"] == policy
        )

    gate_failures: list[str] = []
    for scanner in ("poor", "basic", "good"):
        planner = find(scanner, 2, "planner")
        random_row = find(scanner, 2, "random")
        matcher = find(scanner, 2, "event_matcher")
        random_edge = planner["score_mean"] - random_row["score_mean"]
        matcher_edge = planner["score_mean"] - matcher["score_mean"]
        matcher_status = "PASS" if matcher_edge > 0 else "WARN"
        if random_edge <= 3:
            gate_failures.append(f"starter q2 {scanner} planner edge vs random too low")
        if matcher_edge <= 0:
            gate_failures.append(f"starter q2 {scanner} planner loses to event matcher")
        if planner["top_command_pct"] > 60:
            gate_failures.append(f"starter q2 {scanner} top command concentration too high")
        if planner["top_sequence_pct"] > 5:
            gate_failures.append(f"starter q2 {scanner} repeated sequence too high")
        print(
            f"starter q2 {scanner:<5}: planner score edge vs random "
            f"{random_edge:+.1f}; "
            f"vs event-matcher {matcher_edge:+.1f} [{matcher_status}]; "
            f"top command {planner['top_command']} {planner['top_command_pct']:.0f}%; "
            f"top seq {planner['top_sequence_pct']:.1f}%"
        )

    basic_q2 = find("basic", 2, "planner")
    basic_q3 = find("basic", 3, "planner")
    basic_q4 = find("basic", 4, "planner")
    print(
        "queue inertia basic scanner: "
        f"q2 score {basic_q2['score_mean']:.1f}, "
        f"q3 {basic_q3['score_mean']:.1f}, q4 {basic_q4['score_mean']:.1f}"
    )
    print(
        "scanner readability q2 planner: "
        f"poor ? {find('poor', 2, 'planner')['unknown_pct']:.0f}%, "
        f"basic ? {find('basic', 2, 'planner')['unknown_pct']:.0f}%, "
        f"good ? {find('good', 2, 'planner')['unknown_pct']:.0f}%"
    )
    if not (
        find("poor", 2, "planner")["unknown_pct"]
        > find("basic", 2, "planner")["unknown_pct"]
        > find("good", 2, "planner")["unknown_pct"]
    ):
        gate_failures.append("scanner unknown-rate gradient is not monotonic")
    greedy = find("basic", 2, "greedy")
    planner = find("basic", 2, "planner")
    greedy_edge = greedy["score_mean"] - planner["score_mean"]
    print(
        "greedy risk q2 basic: "
        f"score edge vs planner {greedy_edge:+.1f}; "
        f"hull p10 {greedy['hull_p10']:.0f} vs {planner['hull_p10']:.0f}; "
        f"surge {greedy['surge_mean']:.2f} vs {planner['surge_mean']:.2f}; "
        f"debt {greedy['repair_debt_mean']:.1f} vs {planner['repair_debt_mean']:.1f}"
    )
    if greedy_edge > 0:
        gate_failures.append("greedy drilling still beats planner on risk-adjusted score")

    if gate_failures:
        print("overall: WARN")
        for failure in gate_failures:
            print(f"- {failure}")
    else:
        print("overall: PASS - starter 2-slot queue clears Phase 0 tuning gates.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=1200)
    parser.add_argument("--seed", type=int, default=20260621)
    args = parser.parse_args()

    policies = ("random", "greedy", "event_matcher", "cautious", "planner", "oracle")
    scanners = ("poor", "basic", "good")
    queue_lengths = (2, 3, 4)
    results: list[RunResult] = []
    for scanner in scanners:
        for queue_len in queue_lengths:
            for policy in policies:
                for index in range(args.runs):
                    results.append(
                        run_one(
                            seed=args.seed + index,
                            queue_len=queue_len,
                            scanner=scanner,
                            policy=policy,
                        )
                    )

    rows = summarize(results)
    print_rows(rows)
    print_gates(rows)


if __name__ == "__main__":
    main()
