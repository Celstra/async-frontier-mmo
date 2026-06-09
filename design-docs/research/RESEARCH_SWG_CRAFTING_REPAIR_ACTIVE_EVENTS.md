# SWG Crafting, Repair Kits, and Active Event Design Notes

> **MVP final review note, 2026-06-09:** this is a research/rationale document. The locked MVP source of truth is `../DESIGN_BIBLE.md` plus `../DECISION_LOG.md`. Where older candidate wording conflicts with Decisions 001–015, the locked MVP wins.
> Purpose: Respond to Ryan's correction that repair should not be a generic instant full restore, and capture how SWG-like resource allocation / experimentation can inform crafted repair kits and live thumper mini-games.

---

## 1. Design question

Ryan raised three important points:

1. **Repair kits should be crafted items**, not magic buttons.
   - They should use named resources.
   - Their resource properties should matter.
   - Better repair kits should produce better repair outcomes.
   - Repair should not automatically mean `100% restored`.

2. The game should support both:
   - **deploy-and-return async play**, like Farm RPG / idle-friendly thumpers;
   - **active live engagement**, where a player who stays in the experience has meaningful mini-game/event choices.

3. SWG crafting was praised because players had to think.
   - Its resource allocation / experimentation layer is worth adapting.
   - The goal is not a spreadsheet wall, but decisions like: "Do I tune this repair kit for restored condition, low integrity damage, efficiency, or field reliability?"

---

## 2. SWG crafting details worth preserving

Useful source base:

- Raph Koster, "Designing a Living Society in SWG, part one" — https://www.raphkoster.com/2015/04/21/designing-a-living-society-in-swg-part-one/
- Raph Koster, "Designing a Living Society in SWG, part two" — https://www.raphkoster.com/2015/04/22/designing-a-living-society-in-swg-part-two/
- Existing project note: `research/RESEARCH_SWG_RESOURCE_CRAFTING_FEEDBACK.md`
- Existing project note: `research/RESEARCH_DURABILITY_AND_FRAME_MODULES.md`

Important sourced ideas from Koster's SWG postmortem/comment discussion:

- SWG's economy was built around weak-tie interdependence.
- Everything was set up to take damage and decay.
- Repair was intended to require resources, and even repair tools were consumed.
- Specific stats on resources affected specific crafted item stats.
- Crafters gambled with experimentation points.
- Players discovered, hoarded, and arbitraged rare resources because great named resources were historically scarce.
- The system allowed crafters and brands to become famous because great resources + good experimentation could produce server-notable items.

The takeaway for this project:

> Crafting should be a small optimization puzzle where resource choice, allocation, crafter skill, and risk determine the final item — including repair kits.

---

## 3. SWG-like crafting flow to adapt

Do not copy SWG's full complexity at MVP. Adapt the shape:

```text
Choose schematic
  -> fill ingredient/resource slots
  -> preview weighted properties
  -> allocate tuning points between item properties
  -> accept safe result or risk experimentation
  -> produce prototype / item / batch recipe
```

### Schematic

A schematic defines:

- resource family requirements;
- quantity requirements;
- which resource stats matter;
- item properties that can be tuned;
- maximum experimentation/tuning lines;
- required station/tool/module.

Future/deeper repair-kit schematic example, not the locked MVP schematic:

```text
Field Repair Kit
Requires:
- 4x Structural Alloy
- 2x Reactive Sealant
- 1x Conductive Filament
- optional: preserved maintenance arm / drone core / faction patch compound

Tunable properties:
- Condition Restored
- Integrity Safety
- Kit Efficiency
- Field Reliability
- Compatibility Range
```

### Resource slot weighting

Each property should have a readable weighted formula. The UI should show this openly.

Locked MVP Field Repair Kit substitution, using only the five MVP stats:

```text
Condition Restored = 45% Patch Alloy Malleability + 35% average OQ + 20% Patch Alloy Hardness
Integrity Safety   = 40% Patch Alloy Malleability + 30% Patch Alloy Hardness + 30% average OQ
Field Reliability  = 45% Reactive Binder Heat Resistance + 35% Control Filament Conductivity + 20% average OQ
```

Future/deeper repair/refining example, not MVP:

```text
Condition Restored = 45% Malleability + 35% OQ + 20% Chemical Purity
Integrity Safety   = 40% Malleability + 30% Hardness + 30% OQ
Field Reliability  = 45% Heat Resistance + 35% Conductivity + 20% OQ
Compatibility      = 40% Chemical Purity + 30% Malleability + 30% OQ
```

This creates a real decision:

- A highly malleable alloy makes the kit better at restoring Condition.
- A high-hardness/quality structural alloy helps avoid Integrity damage during repair.
- Conductive/heat-resistant components help the kit work under field pressure.
- Chemical Purity may matter later for sealants, contamination, biological modules, and delicate salvage; it is not part of the locked MVP stat set.

### Allocation / experimentation

After adding resources, the crafter receives a small number of tuning points.

For MVP, use the locked safer version of SWG experimentation:

```text
3 tuning points total
Safe Craft
Careful Experiment
```

Future systems may add 5-point or 7-point specialist crafting, but that is not MVP scope.

Each point can be assigned to one property line:

```text
[++] Condition Restored
[+]  Integrity Safety
[ ]  Kit Efficiency
[ ]  Field Reliability
[ ]  Compatibility Range
```

Then the crafter chooses:

- **Safe Craft** — predictable, lower ceiling.
- **Careful Experiment** — modest upside, small chance of flaw.
- **Risky Experiment** — post-MVP only; not part of the locked MVP.

This preserves the SWG appeal — thinking and gambling — without requiring the player to understand ten hidden stats.

---

## 4. Repair kit design rule

Repair kits should not be:

```text
click kit -> item = 100% repaired
```

They should be:

```text
crafted repair kit + repair context + target item damage profile
  -> partial condition restoration
  -> possible integrity protection or integrity loss
  -> kit consumption
  -> repair history/provenance
```

### Repair outcome model

A repair attempt can produce:

- Condition restored;
- kit durability/charge consumed;
- optional resource/subcomponent consumed;
- chance to avoid additional Integrity loss;
- chance to recover some lost Integrity only if using overhaul-grade materials;
- possible flaw if the kit is mismatched or low quality.

Example outcome:

```text
Repair Kit: Red Mesa Field Patch Mk II
Target: Quiet Bore Pump, 38/92 Condition, 92 Integrity
Result:
- Restores +31 Condition
- New Condition: 69/92
- No Integrity loss
- Kit consumed
- Repair history: patched by AsterWorks kit, made from Veyrith Alloy
```

### Why not always 100%

If repair always restores to full, the repair economy collapses into a generic consumable tax.

Better questions:

- Is this kit tuned for a large repair burst or gentle integrity-safe repair?
- Is the kit compatible with the target module family?
- Is this a clean workshop repair or a risky field repair during an active event?
- Is the player willing to spend rare historical resources on a better repair outcome?
- Should this item be repaired again, overhauled, rebuilt, or salvaged?

---

## 5. Repair kit categories

Start with one kit in MVP, but design room for categories.

| Kit type | Role | Main resource stats | Best used for |
|---|---|---|---|
| Field Patch Kit | emergency Condition repair | Malleability, OQ, Heat Resistance | live thumper events, quick recovery |
| Precision Repair Kit | lower Integrity risk | Malleability, Chemical Purity, Conductivity | frame modules, sensors, trophy kits |
| Structural Brace Kit | hull/chassis repair | Hardness, Malleability, OQ | thumper hulls, stabilizers |
| Thermal Refit Kit | heat/engine repair | Heat Resistance, Conductivity, OQ | power cores, cooling systems |
| Calibration Kit | performance retuning, not raw repair | Conductivity, Chemical Purity, OQ | scanners, uplinks, signal tools |
| Overhaul Kit | expensive Integrity restoration | OQ, matching resource family, optional rare augment | workshop rebuilds, beloved gear |

### MVP kit

For MVP, use just:

```text
Field Repair Kit
```

with three exposed properties:

```text
Condition Restored
Integrity Safety
Field Reliability
```

That is enough to teach the core idea without overbuilding.

---

## 6. Repair context matters

The same kit should perform differently depending on context.

### Workshop repair

- Better preview.
- Lower Integrity risk.
- Can use station bonuses.
- Can use matching resources or subcomponents.
- Slower / requires returning from the field.

### Field repair

- Available during active thumper events.
- Faster.
- Higher kit consumption.
- Lower maximum repair amount.
- Higher chance of Integrity loss if the kit is poor or mismatched.
- Can prevent catastrophic failure if timed well.

### Emergency field repair

- Used when the thumper/module is near failure.
- Can save the event.
- High chance of temporary flaw or Integrity loss.
- Should feel like a dramatic choice, not routine maintenance.

---

## 7. Active live mini-games / engagement layer

The design should support two legitimate play styles:

```text
Async player: deploy thumper -> leave -> come back -> claim/repair/plan
Active player: deploy thumper -> stay -> respond to live events -> improve outcome
```

The active player should get better agency and some efficiency, but not so much extra output that offline players feel punished.

### Guardrail

Do not make live play multiply scarce resource output uncontrollably.

Active play should improve:

- resource integrity;
- condition preservation;
- event completion chance;
- secondary loot/salvage odds;
- contamination reduction;
- threat control;
- early warning;
- repair efficiency;
- personal mastery/fun.

Active play should not simply duplicate the same node cap.

### Live thumper event structure

A thumper deployment can have phases:

```text
1. Setup / signal lock
2. Extraction ramp-up
3. Complication window
4. Push-or-recall decision
5. Claim / salvage / repair aftermath
```

During a deployment, active players may see short event prompts:

- pump clog;
- heat spike;
- threat tunnel;
- signal drift;
- cargo rupture;
- rare vein ping;
- raider scan;
- unstable strata;
- sensor ghost;
- recall window.

### Example active mini-games

These are text/menu mini-games, not twitch combat. The key rule is tradeoff: every option should help one meter while costing or risking another. If `tune` or `boost` is always right, the event is badly designed.

#### Signal tuning / signal drift

The signal starts drifting away from the best part of the pocket.

| Choice | Upside | Cost / risk |
|---|---|---|
| Tune signal | improves Resource Integrity / keeps extraction on target | consumes action window; sensor wear; less attention for heat/threat this tick |
| Boost signal | chance to reveal rare pocket or increase Recovery Efficiency | raises Noise/Threat; beacon wear; raider scan chance |
| Ignore drift | preserves action, sensor condition, and low signal profile | may lose purity or rare-pocket chance |

Outcome affects:

- survey clarity;
- rare-pocket detection;
- contamination risk;
- threat escalation;
- sensor/uplink wear.

Relevant modules:

- Scanner Array;
- Signal/Uplink Module;
- Conductivity-heavy resources.

#### Pump pressure balancing

Player chooses whether to reduce pressure, hold pressure, or overdrive.

Outcome affects:

- recovery efficiency;
- pump wear;
- clog chance;
- resource integrity.

Relevant parts:

- Pump;
- Hopper/Sifter;
- Field Repair Kit if it goes wrong.

#### Heat management

Player routes power or vents heat.

Outcome affects:

- extraction speed;
- power-core wear;
- cooling-system condition;
- emergency shutdown risk.

Relevant resources:

- Heat Resistance;
- Conductivity;
- OQ.

#### Threat suppression / combat helper role

Player assigns frame action to suppress, distract, fortify, hunt the source, protect cargo, disable raider tech, or call for help.

This is the first roadmap home for combat-focused players: they can join thumper events as defenders/suppressors before the game has a separate combat loop. Public help should be scoped as a **combat distress board**: helpers answer threat events and earn combat-side rewards, but they do not control the owner's extraction, repair, recall, overdrive, or component-risk choices.

Outcome affects:

- hull damage;
- threat escalation;
- secondary combat salvage;
- thumper completion chance;
- trophy recovery;
- combat gear wear;
- reward split / helper slots.

Relevant modules:

- Threat Suppression Module;
- Salvage Harness;
- Trophy Recovery Kit;
- Signal/Uplink Module.

#### Field repair choice

Player chooses repair intensity:

```text
Patch lightly: small repair, very low integrity risk
Standard repair: moderate repair, normal kit use
Hard patch: large repair, higher kit use/integrity risk
Emergency bypass: saves event, likely temporary flaw
```

This is where crafted repair-kit quality matters directly.

---

## 8. Recommended player-facing framing

Do not tell the player:

```text
Repair Kit: restores 100 durability.
```

Tell the player:

```text
Field Repair Kit
Made from: future example Veyrith Alloy + Pale Ember Sealant
Tuned for: Condition Restored ++, Field Reliability +
Best on: Hull plates, pumps, stabilizers
Weak on: delicate sensors
Expected workshop repair: +28-36 Condition, low Integrity risk
Expected field repair: +18-28 Condition, moderate Integrity risk under heat
```

This makes repair kits part of the same fantasy as every other crafted item.

---

## 9. MVP implementation recommendation

Do this early, but keep it small.

### MVP data fields

```text
Item
- condition_current
- integrity_max
- item_family
- damage_profile
- crafted_from_resource_ids

RepairKit
- kit_family
- condition_restore_score
- integrity_safety_score
- field_reliability_score
- compatibility_tags
- crafted_from_resource_ids
- crafter_id
```

### MVP repair formula shape

Use transparent ranges rather than exact hidden math:

```text
base_restore = kit.condition_restore_score × compatibility × context_modifier
integrity_risk = target.damage_severity - kit.integrity_safety_score + field_pressure
field_success = kit.field_reliability_score + operator_bonus - event_pressure
```

The UI can show:

```text
Expected repair: +18-25 Condition
Integrity risk: Low
Kit match: Good
Context: Field / under heat pressure
```

### MVP active event design

Final locked MVP thumper runs use four complication types and four matching response actions:

| Complication | Matching response |
|---|---|
| **Signal Drift** | **Signal Tune** |
| **Hull Damage** | **Field Repair** |
| **Threat Surge** | **Suppress Threat** |
| **Pump Strain** | **Clear Pump Problem** |

Default runs have 2 event windows; high-risk/push runs may have up to 3. **Recall Early** is always available as a universal safety/resolution choice and is not counted as an event action. Heat Spike, rare vein pings, raider scans, and deeper live mini-games are post-MVP candidates.

---

## 10. Final recommendation

Ryan's correction is right:

> Repair kits should be crafted, resource-quality-driven, and outcome-variable. They should be repair tools with identity, not generic full-heal consumables.

The best adaptation is:

```text
named resources -> crafted repair kit properties
repair kit properties -> partial repair / integrity safety / field reliability
active event context -> pressure and risk
crafter/player choice -> allocation and experimentation
repair history -> provenance and economy memory
```

This gives repair the same SWG-like thinking as crafting gear, while also creating live thumper mini-games for players who want to stay engaged.
