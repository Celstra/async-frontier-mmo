"""Bloom Variance Monte Carlo — Decision 018 evidence.
SWG-verified model: stats rolled randomly per spawn within family caps (uniform
assumed; distribution is a tuning knob). Recipe weights include Decision 016 A+B.
"""
import random, statistics, itertools
random.seed(42)
N = 10000
STATS = ["OQ", "Cond", "Hard", "HR", "Mall"]

# Family stat caps (min, max). Chosen so the locked Decision 006 bloom is a valid roll.
CAPS = {
 "CM": dict(OQ=(1,1000), Cond=(300,1000), Hard=(1,600),  HR=(1,800),    Mall=(1,800)),
 "SA": dict(OQ=(1,1000), Cond=(1,400),    Hard=(400,1000),HR=(1,700),   Mall=(200,900)),
 "RC": dict(OQ=(1,1000), Cond=(200,1000), Hard=(1,600),  HR=(200,1000), Mall=(1,500)),
}
SIG = {"CM": "Cond", "SA": "Hard", "RC": "HR"}  # family signature stat

# Recipes with Decision 016 amendments (slot index 0/1/2; "avg" = avg OQ)
RECIPES = {
 "Drill": (["SA","CM","RC"], {
   "ExtractionRate":[(.5,0,"Hard"),(.3,1,"Cond"),(.2,"avg","OQ")],
   "DepthAccess":[(.5,0,"Hard"),(.3,2,"HR"),(.2,"avg","OQ")],
   "WearControl":[(.45,2,"HR"),(.35,0,"Mall"),(.2,"avg","OQ")]}),
 "Pump": (["CM","SA","RC"], {
   "RecoveryEff":[(.45,0,"Cond"),(.35,1,"Mall"),(.2,"avg","OQ")],
   "ClogResist":[(.45,1,"Mall"),(.3,1,"Hard"),(.25,"avg","OQ")],
   "FieldStability":[(.45,2,"HR"),(.35,0,"Cond"),(.2,"avg","OQ")]}),
 "HullPlate": (["SA","SA","RC"], {
   "MaxCondition":[(.45,0,"Hard"),(.3,1,"Mall"),(.25,"avg","OQ")],
   "DamageReduction":[(.5,0,"Hard"),(.3,2,"HR"),(.2,"avg","OQ")],
   "Repairability":[(.45,1,"Mall"),(.35,"avg","OQ"),(.2,0,"Hard")]}),
 "Scanner": (["CM","RC","SA"], {
   "SurveyClarity":[(.6,0,"Cond"),(.25,1,"Cond"),(.15,"avg","OQ")],      # 016-A
   "StatHintAcc":[(.5,0,"Cond"),(.3,1,"HR"),(.2,"avg","OQ")],
   "SignalRange":[(.55,0,"Cond"),(.25,1,"HR"),(.2,"avg","OQ")]}),
 "RepairKit": (["SA","CM","RC"], {
   "CondRestored":[(.45,0,"Mall"),(.35,"avg","OQ"),(.2,0,"Hard")],
   "IntegritySafety":[(.4,0,"Hard"),(.3,2,"HR"),(.3,"avg","OQ")],        # 016-B
   "FieldReliability":[(.45,2,"HR"),(.35,1,"Cond"),(.2,"avg","OQ")]}),
}

def roll(fam):
    return {s: random.randint(*CAPS[fam][s]) for s in STATS}

def band(s):
    for lim, name in [(40,"Poor"),(55,"Basic"),(70,"Solid"),(85,"Strong"),(95,"Excellent")]:
        if s < lim: return name
    return "Exceptional"

def bloom_best(bloom):
    """bloom = {'CM':[r1,r2],'SA':[...],'RC':[...]}. Return per-property best base score,
    and per-property (best - worst) combo gap."""
    best, gap = {}, {}
    for rec, (fams, props) in RECIPES.items():
        combos = list(itertools.product(*[bloom[f] for f in fams]))
        for p, terms in props.items():
            scores = []
            for c in combos:
                avg = sum(r["OQ"] for r in c) / len(c)
                v = sum(w * (avg if s == "avg" else c[s][st]) for w, s, st in terms) / 10
                scores.append(v)
            best[f"{rec}.{p}"] = max(scores)
            gap[f"{rec}.{p}"] = max(scores) - min(scores)
    return best, gap

# Monte Carlo
bloom_peak = []          # best property score anywhere in the bloom
exciting = mediocre = floor = 0
veyrith_tier = sig900 = 0
scanner_best = []
gaps_all = []
peak_by_line = {f"{r}.{p}": [] for r, (_, ps) in RECIPES.items() for p in ps}
for _ in range(N):
    bloom = {f: [roll(f), roll(f)] for f in ("CM", "SA", "RC")}
    best, gap = bloom_best(bloom)
    peak = max(best.values())
    bloom_peak.append(peak)
    scanner_best.append(best["Scanner.SurveyClarity"])
    gaps_all.append(statistics.mean(gap.values()))
    for k, v in best.items(): peak_by_line[k].append(v)
    if peak >= 85: exciting += 1
    if peak < 70: mediocre += 1
    if peak < 55: floor += 1
    if any(r["Cond"] >= 900 and r["OQ"] >= 800 for r in bloom["CM"]): veyrith_tier += 1
    if any(r[SIG[f]] >= 900 for f in bloom for r in bloom[f]): sig900 += 1

pct = lambda x: 100 * x / N
q = statistics.quantiles(bloom_peak, n=100)
print(f"Blooms simulated: {N} (uniform rolls within family caps; Decision 016 weights)\n")
print(f"Best-craft-anywhere per bloom: median {statistics.median(bloom_peak):.1f}, "
      f"p10 {q[9]:.1f}, p90 {q[89]:.1f}, min {min(bloom_peak):.1f}, max {max(bloom_peak):.1f}")
print(f"Exciting bloom  (any property ≥85 Excellent possible): {pct(exciting):.1f}%")
print(f"Mediocre bloom  (nothing above Solid, peak <70):       {pct(mediocre):.1f}%")
print(f"Floor bloom     (nothing above Basic, peak <55):       {pct(floor):.2f}%")
print(f"\nScarcity:")
print(f"  'Veyrith-tier' CM in bloom (Cond≥900 & OQ≥800):      {pct(veyrith_tier):.1f}%  (~1 in {N/max(1,veyrith_tier):.0f} blooms)")
print(f"  Any resource ≥900 in its family signature stat:      {pct(sig900):.1f}%")
print(f"  (Locked first bloom's Veyrith Copper would be a top-{100-pct(sum(1 for s in scanner_best if s < 83.8)):.0f}% scanner bloom)")
exc_scanner = sum(1 for s in scanner_best if s >= 85)
print(f"  Bloom supports an Excellent base Survey Clarity:      {pct(exc_scanner):.1f}%")
print(f"\nDoes choice matter on mediocre blooms?")
med_gaps = [g for g, pk in zip(gaps_all, bloom_peak) if pk < 70]
print(f"  Mean best-vs-worst combo gap, all blooms:    {statistics.mean(gaps_all):.1f} pts")
if med_gaps:
    print(f"  Mean gap on mediocre blooms only:            {statistics.mean(med_gaps):.1f} pts")
print(f"\nPer-line p50/p95 of best achievable base score:")
for k, vals in peak_by_line.items():
    vq = statistics.quantiles(vals, n=20)
    print(f"  {k:<26} p50 {statistics.median(vals):5.1f}   p95 {vq[18]:5.1f}")

# Orphan-stat audit (which displayed stats are never read directly by any recipe slot of that family)
read = {f: set() for f in CAPS}
for rec, (fams, props) in RECIPES.items():
    for p, terms in props.items():
        for w, s, st in terms:
            if s != "avg": read[fams[s]].add(st)
print("\nOrphan-stat audit (never read directly; OQ always counts via average):")
for f in CAPS:
    orphans = [s for s in STATS if s not in read[f] and s != "OQ"]
    print(f"  {f}: reads {sorted(read[f])}; orphan display stats: {orphans or 'none'}")
