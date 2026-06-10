"""Run Duration & Economy Throughput Simulation — Decision 017 evidence.

Question: how long should a thumper run last, given 1 player = 1 thumper,
no combat side-layer, Farm RPG inspiration, and inflation risk from short timers?

Three time models:
  A) Pure short active runs (4 min foreground, unlimited repeats)
  B) Farm RPG long timer (4 h passive runs, claim on return)
  C) Hybrid: short active phase (prospect + deploy + windows, 3-5 min)
     then a player-chosen passive extraction tail (15 m / 1 h / 4 h / 8 h)
     with sublinear yield in tail duration. One concurrent run.

Economy regulators modeled:
  - Wear sink: each run wears parts; repair kits cost resources.
  - Concentration: prospecting cycles (active time) raise the yield multiplier.
  - Deposit depletion: each signal holds finite units; forces re-prospecting.

All constants are tuning knobs, sized so one casual claim ~ one recipe.
"""
import random, statistics
random.seed(7)

DAYS = 14
RECIPE_COST = 120         # units per craft (~1.2 casual claims; "2 claims ~ 1 craft" rule)
KIT_COST = 60             # units to craft a Field Repair Kit
KIT_RESTORE = 55          # Condition points restored per kit
WEAR_PER_RUN = 5          # base Condition loss across parts per run
WEAR_PER_WINDOW = 1.5
DEPOSIT = 500             # units per prospected signal
Y_1H = 45                 # units from a 1-hour tail at concentration 1.0
SUBLIN = 0.5              # yield ∝ (tail_hours ** SUBLIN)

def tail_yield(hours):    return Y_1H * (hours ** SUBLIN)

# concentration from prospecting cycles (each cycle ~45s active scan/sample)
CONC_RANGE = (0.30, 1.40)   # this rotation's rolled concentration range (per-resource roll)
def concentration(cycles):
    # more sampling cycles -> closer to this rotation's ceiling
    lo, hi = CONC_RANGE
    frac = [0.45, 0.65, 0.82, 0.93][min(cycles, 3)]
    return lo + (hi - lo) * frac + random.uniform(-.06, .06)

ARCH = {  # active minutes/day, check-ins/day
 "Casual (12 min, 2 logins)":  dict(mins=12,  logins=2),
 "Regular (35 min, 3 logins)": dict(mins=35,  logins=3),
 "Active (100 min, 5 logins)": dict(mins=100, logins=5),
}

def simulate(model, arch):
    mins, logins = ARCH[arch]["mins"], ARCH[arch]["logins"]
    gross = sink = runs = windows = decisions = active_used = 0.0
    deposit_left = 0
    for _ in range(DAYS):
        day_active = mins
        day_runs = 0
        if model == "A":
            # 4 min per run, +1.5 min prospecting every few runs (deposit)
            while day_active >= 4:
                if deposit_left < 35:
                    if day_active < 5.5: break
                    day_active -= 1.5; decisions += 2; deposit_left = DEPOSIT
                day_active -= 4
                c = concentration(1)
                q = min(35 * c, deposit_left); deposit_left -= q
                gross += q; runs += 1; day_runs += 1
                w = WEAR_PER_RUN + 2 * WEAR_PER_WINDOW
                sink += (w / KIT_RESTORE) * KIT_COST
                windows += 2; decisions += 4   # 2 windows + deploy + tuning-ish
        elif model == "B":
            # 4 h runs; one claim+redeploy per login while timer math allows
            possible = min(logins, 24 // 4 - 1)   # sleep eats slots
            for _ in range(possible):
                if day_active < 2: break
                day_active -= 2
                c = concentration(0)              # no prospecting layer in B
                q = tail_yield(4) * c
                gross += q; runs += 1; day_runs += 1
                w = WEAR_PER_RUN + 2 * WEAR_PER_WINDOW
                sink += (w / KIT_RESTORE) * KIT_COST
                windows += 2; decisions += 3
        else:  # C hybrid
            # actives favor short tails + prospecting; casuals favor long tails
            prefer = {2: 8, 3: 4, 5: 1}[logins]   # preferred tail hours
            while day_active >= 4 and day_runs < (logins if prefer >= 4 else 12):
                cycles = 3 if mins >= 100 else (2 if mins >= 35 else 0)
                cost = 3.5 + 0.75 * cycles
                if day_active < cost: break
                day_active -= cost
                if deposit_left < 40:
                    deposit_left = DEPOSIT; decisions += 2
                c = concentration(cycles)
                # first run of the day claims/redeploys an overnight 8 h tail
                tail = 8 if day_runs == 0 else (prefer if day_runs < logins else 0.25)
                q = min(tail_yield(tail) * c, deposit_left); deposit_left -= q
                gross += q; runs += 1; day_runs += 1
                w = WEAR_PER_RUN + 2 * WEAR_PER_WINDOW
                sink += (w / KIT_RESTORE) * KIT_COST
                windows += 2; decisions += 4 + cycles
        active_used += mins - max(day_active, 0)
    net = gross - sink
    return dict(runs=runs/DAYS, gross=gross/DAYS, sink=sink/DAYS, net=net/DAYS,
                crafts=(net/DAYS)/RECIPE_COST, sink_pct=100*sink/max(gross,1),
                dpm=decisions/max(active_used,1), util=100*active_used/(ARCH[arch]['mins']*DAYS))

print(f"{'M':<2} {'Archetype':<28} {'runs/d':>7} {'gross/d':>8} {'sink/d':>7} "
      f"{'net/d':>7} {'crafts/d':>9} {'sink%':>6} {'dec/min':>8} {'time-used%':>11}")
results = {}
for model in "ABC":
    for arch in ARCH:
        r = simulate(model, arch)
        results[(model, arch)] = r
        print(f"{model:<2} {arch:<28} {r['runs']:>7.1f} {r['gross']:>8.0f} {r['sink']:>7.0f} "
              f"{r['net']:>7.0f} {r['crafts']:>9.2f} {r['sink_pct']:>5.0f}% {r['dpm']:>8.2f} {r['util']:>10.0f}%")
    a = results[(model, "Active (100 min, 5 logins)")]["net"]
    c = results[(model, "Casual (12 min, 2 logins)")]["net"]
    print(f"    -> Active:Casual net ratio = {a/max(c,1):.1f}:1\n")

print("Reading guide:")
print(" - net/d vs RECIPE_COST(30): crafts/day a player can afford after maintenance")
print(" - sink%: share of gross consumed by wear/repair (anti-inflation pressure)")
print(" - decisions/active-min: tedium proxy; <0.5 = dead active time, >1.5 = engaged")
