import itertools, statistics

R = {  # Decision 010 locked prototype stats
 "Keth Iron":            dict(fam="SA", OQ=520, Cond=220, Hard=650, HR=480, Mall=560),
 "Red Mesa Cond. Slag":  dict(fam="CM", OQ=340, Cond=610, Hard=310, HR=720, Mall=390),
 "Asterion Frame Alloy": dict(fam="SA", OQ=690, Cond=260, Hard=850, HR=610, Mall=760),
 "Pale Ember Crystal":   dict(fam="RC", OQ=680, Cond=520, Hard=360, HR=880, Mall=470),
 "Veyrith Copper":       dict(fam="CM", OQ=820, Cond=930, Hard=260, HR=540, Mall=620),
 "Thornwake Crystal":    dict(fam="RC", OQ=590, Cond=910, Hard=420, HR=210, Mall=160),
}
FAM = {f: [n for n, s in R.items() if s["fam"] == f] for f in ("SA", "CM", "RC")}

# slot index -> (slot name, family); weights: property -> list of (weight, slot_idx_or_'avgOQ', stat)
RECIPES = {
 "Basic Drill Head": dict(
   slots=[("Cutting Bit","SA"),("Conductive Coil","CM"),("Resonance Crystal","RC")],
   props={"Extraction Rate":[(.5,0,"Hard"),(.3,1,"Cond"),(.2,"avg","OQ")],
          "Depth Access":   [(.5,0,"Hard"),(.3,2,"HR"),  (.2,"avg","OQ")],
          "Wear Control":   [(.45,2,"HR"), (.35,0,"Mall"),(.2,"avg","OQ")]}),
 "Efficient Pump": dict(
   slots=[("Intake Manifold","CM"),("Flexible Housing","SA"),("Flow Crystal","RC")],
   props={"Recovery Efficiency":[(.45,0,"Cond"),(.35,1,"Mall"),(.2,"avg","OQ")],
          "Clog Resistance":    [(.45,1,"Mall"),(.3,1,"Hard"),(.25,"avg","OQ")],
          "Field Stability":    [(.45,2,"HR"),  (.35,0,"Cond"),(.2,"avg","OQ")]}),
 "Reinforced Hull Plate": dict(
   slots=[("Outer Plate","SA"),("Bracing Layer","SA"),("Bonding Matrix","RC")],
   props={"Max Condition":   [(.45,0,"Hard"),(.3,1,"Mall"),(.25,"avg","OQ")],
          "Damage Reduction":[(.5,0,"Hard"),(.3,2,"HR"),  (.2,"avg","OQ")],
          "Repairability":   [(.45,1,"Mall"),(.35,"avg","OQ"),(.2,0,"Hard")]}),
 "Survey Scanner Module Mk I": dict(
   slots=[("Conductive Core","CM"),("Crystal Lens","RC"),("Frame Mount","SA")],
   props={"Survey Clarity":    [(.6,0,"Cond"),(.25,1,"OQ"),(.15,"avg","OQ")],
          "Stat Hint Accuracy":[(.5,0,"Cond"),(.3,1,"HR"),(.2,"avg","OQ")],
          "Signal Range":      [(.55,0,"Cond"),(.25,1,"HR"),(.2,"avg","OQ")]}),
 "Field Repair Kit": dict(
   slots=[("Patch Alloy","SA"),("Control Filament","CM"),("Reactive Binder","RC")],
   props={"Condition Restored":[(.45,0,"Mall"),(.35,"avg","OQ"),(.2,0,"Hard")],
          "Integrity Safety":  [(.4,0,"Mall"),(.3,0,"Hard"),(.3,"avg","OQ")],
          "Field Reliability": [(.45,2,"HR"),(.35,1,"Cond"),(.2,"avg","OQ")]}),
}

def band(s):
    for lim, name in [(40,"Poor"),(55,"Basic"),(70,"Solid"),(85,"Strong"),(95,"Excellent")]:
        if s < lim: return name
    return "Exceptional"

def base_scores(recipe, combo):
    avgOQ = sum(R[r]["OQ"] for r in combo) / len(combo)
    out = {}
    for prop, terms in RECIPES[recipe]["props"].items():
        v = sum(w * (avgOQ if src == "avg" else R[combo[src]][stat]) for w, src, stat in terms)
        out[prop] = v / 10
    return out

def tuned(s, pts): return min(100, s * (1 + 0.05 * pts))

print("=" * 100)
print("ALL COMBOS — base scores (no tuning), Safe Craft")
print("=" * 100)
results = {}
for rec, spec in RECIPES.items():
    combos = list(itertools.product(*[FAM[f] for _, f in spec["slots"]]))
    rows = []
    for c in combos:
        sc = base_scores(rec, c)
        rows.append((c, sc))
    results[rec] = rows
    print(f"\n## {rec}  (slots: {', '.join(f'{n}[{f}]' for n,f in spec['slots'])})")
    props = list(spec["props"])
    print(f"{'combo':<70}" + "".join(f"{p[:18]:>20}" for p in props))
    for c, sc in sorted(rows, key=lambda r: -sum(r[1].values())):
        cs = " + ".join(x.split()[0] for x in c)
        print(f"{cs:<70}" + "".join(f"{sc[p]:>14.1f} {band(sc[p])[:4]:<5}" for p in props))

# Q1: Veyrith vs Slag for scanner
print("\n" + "=" * 100)
print("Q1 — Veyrith Copper vs Slag in Survey Scanner (best support resources, 3 pts Survey Clarity)")
for cm in FAM["CM"]:
    best = max((r for r in results["Survey Scanner Module Mk I"] if r[0][0] == cm),
               key=lambda r: r[1]["Survey Clarity"])
    s = best[1]["Survey Clarity"]
    print(f"  {cm:<22} base {s:5.1f} ({band(s)}) -> tuned+3 {tuned(s,3):5.1f} ({band(tuned(s,3))})  combo: {best[0]}")

# Q2: Is Thornwake ever tempting? Compare RC choices across every recipe/property
print("\nQ2 — Thornwake vs Pale Ember: does Thornwake EVER win a property, any recipe/combo?")
wins = 0; checks = 0
for rec, spec in RECIPES.items():
    rc_slots = [i for i, (_, f) in enumerate(spec["slots"]) if f == "RC"]
    if not rc_slots: continue
    for c, sc in results[rec]:
        if "Thornwake Crystal" not in c: continue
        alt = tuple("Pale Ember Crystal" if x == "Thornwake Crystal" else x for x in c)
        sc_alt = base_scores(rec, alt)
        for p in sc:
            checks += 1
            if sc[p] > sc_alt[p] + 0.05:
                wins += 1
                print(f"  WIN: {rec} / {p}: Thornwake {sc[p]:.1f} vs Pale Ember {sc_alt[p]:.1f}")
print(f"  Thornwake beats Pale Ember in {wins}/{checks} property comparisons.")

# Q3: tuning vs resource quality
print("\nQ3 — Can tuning close a resource gap? (3 pts on Survey Clarity, weak combo vs untuned best combo)")
best = max(results["Survey Scanner Module Mk I"], key=lambda r: r[1]["Survey Clarity"])
worst = min(results["Survey Scanner Module Mk I"], key=lambda r: r[1]["Survey Clarity"])
print(f"  Best combo untuned : {best[1]['Survey Clarity']:.1f}  {best[0]}")
print(f"  Worst combo +3 pts : {tuned(worst[1]['Survey Clarity'],3):.1f}  {worst[0]}")

# Tuning perceptibility: how often does 1 pt / 3 pts cross an output band?
cross1 = cross3 = n = 0
for rec in results:
    for c, sc in results[rec]:
        for p, s in sc.items():
            n += 1
            if band(tuned(s,1)) != band(s): cross1 += 1
            if band(tuned(s,3)) != band(s): cross3 += 1
print(f"\nTuning perceptibility: 1 pt changes band in {cross1}/{n} cases ({100*cross1/n:.0f}%), "
      f"3 pts in {cross3}/{n} ({100*cross3/n:.0f}%)")

# Q4: recipe differentiation — spread of best-combo profiles
print("\nQ4 — Within-recipe property spread (best combo): are properties differentiated?")
for rec in results:
    bestc = max(results[rec], key=lambda r: sum(r[1].values()))
    vals = list(bestc[1].values())
    print(f"  {rec:<30} spread {max(vals)-min(vals):5.1f}  ({', '.join(f'{v:.0f}' for v in vals)})")

# Within-recipe correlation across combos
print("\nProperty correlation across the 8 combos (high = properties move together, tuning choice low-stakes):")
for rec in results:
    props = list(RECIPES[rec]["props"])
    series = {p: [sc[p] for _, sc in results[rec]] for p in props}
    cors = []
    for a, b in itertools.combinations(props, 2):
        cor = statistics.correlation(series[a], series[b])
        cors.append(f"{a[:12]}~{b[:12]} {cor:+.2f}")
    print(f"  {rec:<30} {';  '.join(cors)}")

# Q5: Safe vs Careful Experiment
print("\nQ5 — Safe vs Careful Experiment (3 pts on top line of best scanner combo)")
s = tuned(best[1]["Survey Clarity"], 3)
print(f"  Safe Craft: {s:.1f} ({band(s)})")
print(f"  Careful   : 75% -> {min(100,s*1.03):.1f} ({band(min(100,s*1.03))}); 20% -> {s:.1f}; 5% -> {s:.1f} + minor flaw")
print(f"  EV gain   : +{0.75*(min(100,s*1.03)-s):.2f} pts; flaw risk 5%")

# Cap check
mx = max(tuned(sc[p],3) for rec in results for _, sc in results[rec] for p in sc)
print(f"\nMax achievable tuned score anywhere: {mx:.1f} (cap 100)")
