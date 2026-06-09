# Firefall Thumper Research — Larger Thumpers, Group vs Personal, and Economy Adaptation

> Purpose: Preserve the targeted research around how larger thumpers helped in Firefall, what their trade-offs were, and how that should inform personal vs group thumpers in the async text/pixel MMO design.

---

## 1. Research question

Ryan asked:

- Did bigger Firefall thumpers mainly trade higher output for more enemies/bugs attacking them?
- What were the positives of bigger thumpers?
- If this project has personal and group thumpers, should output scale with number of helpers/contributors?
- Would scaling group output by player count cause inflation?

---

## 2. Primary source pages checked

- Firefall Archive — **Thumper**  
  https://firefall-archive.fandom.com/wiki/Thumper

- Firefall Archive — **Thumping**  
  https://firefall-archive.fandom.com/wiki/Thumping

- Firefall Archive — **Scan Hammer**  
  https://firefall-archive.fandom.com/wiki/Scan_Hammer

- Firefall Archive — **Resource Collection**  
  https://firefall-archive.fandom.com/wiki/Resource_Collection

- Firefall Archive — **Stock Thumper**  
  https://firefall-archive.fandom.com/wiki/Stock_Thumper

- Firefall Archive — **Improved Thumper**  
  https://firefall-archive.fandom.com/wiki/Improved_Thumper

- Firefall Archive — **Advanced Thumper**  
  https://firefall-archive.fandom.com/wiki/Advanced_Thumper

Note: Firefall archival sources are patch-era and sometimes internally inconsistent because Firefall changed over time. Treat numbers as design evidence, not exact canonical final-state balance.

---

## 3. What bigger thumpers did in Firefall

### 3.1 Positives

Bigger/better thumpers helped by providing:

1. **More resource capacity**
   - Firefall's Thumper page says thumpers had limited resource capacity and came in various sizes.
   - Larger thumpers increased resource capacity.

2. **More total resources before exhausting a vein**
   - Resource Collection page says Squad Thumpers were better if possible because the total reward before exhausting the vein was higher.

3. **Better group efficiency**
   - Personal thumpers split the load among squad members.
   - Squad thumpers were intended for 4–5 players and rewarded group play much more strongly.

4. **Completion bonus**
   - Thumper page says reaching 100% capacity yielded double resources and an XP bonus for the defending squad.

5. **More enemy/biomaterial/salvage opportunities**
   - Thumping page says thumping was popular for farming biomaterials because many enemies spawned while the thumper was active.
   - Resource Collection page says thumping gives metallic ores from successful thumper return, plus raw biomaterial from creatures and salvage from enemies spawned while active.

6. **More social/public participation**
   - Passing players connected to the SIN tower could locate nearby thumping squads and help defend.
   - Assisting with a thump earned a resource reward from the Accord.

### 3.2 Negatives / trade-offs

Bigger thumpers also brought:

1. **More difficult hostile spawns**
   - Thumper page says increasing resource capacity also increased thumper HP and the difficulty of hostile spawns.

2. **More enemies**
   - Resource Collection page says Squad Thumpers spawned many more enemies than Personal Thumpers.

3. **Thumper destruction risk**
   - Firefall pages warn that explosive Aranhas and Chosen Juggernauts could destroy thumpers.
   - The Thumper page says if you do not guard it, you may be shopping for a new thumper.

4. **Higher crafting/build costs**
   - Legacy pages show higher-tier thumpers cost more and took longer to build.
   - Stock Thumper: 250 capacity, 10,000 health, recommended 1–2 players, 3 min, cheap/simple.
   - Improved Thumper: 1,500 capacity, 12,500 health, recommended 3–4 players, 4 min, costs more components/resources.
   - Advanced Thumper: 4,500 capacity, 15,000 health, recommended 4–5 players, 5 min, much more expensive components/resources.

---

## 4. Important Firefall payout behavior

Two related but slightly different pieces appear in the archival pages:

### Personal thumpers

- Personal thumper resources were split among defending squad members.
- Example from Thumper page: if two players recalled a Stock Personal Thumper at full capacity, the base payout per person would be 125 from a 250-capacity thumper.
- The page also describes a completion bonus where reaching 100% gives each member additional resources, making the per-player payout better than a simple split.

### Squad thumpers

- Squad thumpers were intended for 4–5 players.
- One archival statement says resources gathered by Squad Thumpers were distributed evenly among squad members.
- Another Resource Collection statement says when using a Squad Thumper, each squad member received the full amount; example: a 5-person squad takes home a 500 Iron load, personal thumper gives 100 each, squad thumper gives 500 each.
- The Thumper page also says a Stock Squad Thumper at full capacity gave each squad member a base payout of 300 units no matter squad size.

### Interpretation

Firefall appears to have used group thumpers as a **strong multiplayer reward multiplier**, not just a bigger shared container.

That made sense in an action MMO/shooter context because:

- More players meant more enemies could be handled.
- Enemy spawns were part of the fun.
- Group activity needed strong rewards.
- Firefall was not trying to simulate an SWG-style closed player economy with long-term scarcity in exactly the same way.

For this project, duplicating that literally is dangerous.

---

## 5. Economy analysis for this project

### 5.1 Would group output scaling cause inflation?

It depends on what is being scaled.

#### Dangerous model: duplicated full resource payout

```text
Node yields 500 rare ore.
5 players join.
Each receives 500 rare ore.
Total new ore = 2,500.
```

This is inflationary if resources feed crafting/economy directly.

Problems:

- Grouping multiplies scarce resources instead of sharing them.
- Guilds/alts can farm huge amounts.
- Rare resource discoveries become less rare.
- Prices collapse unless sinks are extremely aggressive.
- It undermines SWG-style stockpiling/scarcity.

This model is probably wrong for the core economy.

#### Safer model: fixed node output + helper rewards

```text
Node yields 500 rare ore.
5 players join.
500 rare ore is split by contribution.
Helpers also earn XP/faction/common salvage/contract pay.
Total rare ore = 500.
```

This protects scarcity but may feel stingy if joining reduces everyone's payout.

#### Best-fit model: contribution unlocks efficiency, not linear duplication

```text
Base node yield: 500 rare ore.
More contributors improve extraction efficiency up to a cap:
- 1 player: 55% recovered = 275 ore
- 2 players: 70% recovered = 350 ore
- 3 players: 82% recovered = 410 ore
- 4 players: 92% recovered = 460 ore
- 5 players: 100% recovered = 500 ore

Rare ore remains capped by the node.
Helpers also earn secondary rewards.
```

This lets groups feel better without multiplying resources infinitely.

#### Good compromise: group thumpers access bigger/harder nodes

Instead of multiplying payout per person, group thumpers can:

- Tap deeper/harder deposits personal thumpers cannot access.
- Extract higher concentration pockets.
- Improve purity/reduce waste.
- Reduce failure risk if enough players contribute.
- Generate more secondary loot from enemies/events.
- Fill public/regional objectives.

This preserves economy scarcity while making group play meaningful.

---

## 6. Recommended personal vs group thumper design

### Personal thumpers

Purpose:

- Solo progression.
- Reliable, low-management async play.
- Small/medium deposits.
- Good for common and uncommon resources.

Output model:

- Owner receives the output.
- Optional helpers get minor secondary rewards, not big rare-resource shares.
- Low event intensity.

### Group thumpers

Purpose:

- Social extraction event.
- Higher-tier/deeper deposits.
- Shared contribution board.
- More danger and more part wear.
- Regional/community loop.

Output model:

Use **capped node output with contribution-based allocation**, not duplicated full payouts.

Recommended design:

```text
node_max_yield = fixed amount based on deposit size/concentration
recovery_percent = function(thumper tier, part quality, number of meaningful contributors, event success)
actual_yield = node_max_yield * recovery_percent
participant_share = actual_yield * contribution_weight
secondary_rewards = XP/faction/common salvage/biomaterials/contracts
```

### Contributor scaling

Contributors should increase:

- Recovery percentage.
- Chance to reach 100% completion.
- Defense success.
- Reduced part damage.
- Secondary enemy loot.
- Faction/contract payout.
- Public event progress.

Contributors should **not** linearly multiply rare resource creation.

---

## 7. Proposed group thumper reward model

### Reward buckets

Separate rewards into buckets:

1. **Primary scarce resource**
   - Fixed/capped by node.
   - Split by contribution.
   - Used for crafting economy.

2. **Secondary combat/event rewards**
   - Biomaterials, salvage, faction, XP, credits.
   - Can scale more generously with participants.
   - Helps group play feel good without flooding the rare-resource market.

3. **Owner/deployer reward**
   - The deployer risked the thumper and parts.
   - Owner gets a reserved share or deployment fee.
   - Owner may also set contract terms.

4. **Public/regional progress**
   - Everyone contributes to zone unlocks, invasion defense, faction goals, or settlement projects.

### Example

```text
Deposit: Veyrith Copper pocket
Node max yield: 1,000 units
Group thumper with 1 player: 55% recovery = 550 units
Group thumper with 3 players: 82% recovery = 820 units
Group thumper with 5 players: 100% recovery = 1,000 units

Split:
- Owner/deployer reserve: 20%
- Remaining 80% split by contribution score
- All participants also get salvage/faction/XP from events
```

This feels better than a pure split because adding players increases total recovered yield, but it does not create unlimited resources.

---

## 8. Recommended MVP implementation

Do not launch with full group-thumper complexity.

### MVP personal thumper

- Stock Personal only.
- Owner receives output.
- One simple wear calculation.
- One simple attack/jam event.

### MVP group thumper test

Add a single **Prototype Group Thumper** later:

- Requires 2–5 contributors.
- Fixed node max yield.
- Contributors increase recovery percent up to cap.
- Output split by contribution.
- Owner gets reserve share.
- Helpers get XP/faction/secondary salvage.
- Parts take more wear than personal thumper.

### Success criteria

Group thumpers are working if:

- People want to join them.
- Owners feel rewarded for deploying expensive equipment.
- Helpers feel rewarded without needing equal rare-resource output.
- Rare resources remain scarce.
- Grouping feels like efficiency/risk reduction, not an exploit.

---

## 9. Final recommendation

Firefall's bigger thumpers were positive because they offered:

- larger capacity,
- higher resource payoff,
- group efficiency,
- completion bonuses,
- more enemy/biomaterial/salvage opportunities,
- and public/social defense hooks.

The trade-off was:

- more enemies,
- harder spawns,
- thumper destruction risk,
- higher costs,
- and need for more players.

For this project:

> Group thumpers should scale through **recovery efficiency, deposit access, secondary rewards, and public progress**, not through uncapped per-player duplication of scarce resources.

That preserves the SWG-like economy while keeping Firefall's group fantasy.
