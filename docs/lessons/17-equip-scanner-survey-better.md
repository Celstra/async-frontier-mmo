# Lesson 17 — Equip Survey Scanner Module Mk I and survey clearer

> **Exercise:** Minimal equip flow for the crafted scanner; the next Red Mesa survey shows **better information** (bands → exact stat values) scaled by the item's **Survey Clarity** score — without mutating bloom resource stats.

**Prerequisite:** Lessons 15–16 (schematic engine, craft scanner end-to-end).

**Out of scope:** Full gear slots, multiple modules per frame, repair UI, other thumper parts.

**Learning goal:** **Survey better** means **information improvement**, not raw stat mutation. The scanner changes what the pilot *reads*, not what exists in the ground.

---

## 1. Information vs mutation

| What changes | What does not |
|--------------|----------------|
| Survey hint presentation (bands → exact values) | `resource_instances` stats |
| Number of revealed stat hints (scales with Survey Clarity) | Bloom resource definitions |
| Pilot's equipped scanner reference | Named resource personalities |

The domain reads the same `getRedMesaResource(...).stats` when revealing exact values — it only *displays* them when clarity is high enough.

---

## 2. What gets clearer after equipping

**Without scanner (Basic Scanner Mk 0):**

- Three first-session signals (Keth Iron, Veyrith Copper, Thornwake Crystal)
- Per-stat **bands** only (Poor → Exceptional on the 1–1000 scale)
- No exact internal values

**With crafted Survey Scanner Module Mk I:**

- Same three signals and same bands
- **Exact stat values** appear on the top N hints per signal, where N scales with crafted **Survey Clarity** (0–100 property score):

| Survey Clarity band | Exact hints per signal |
|---------------------|------------------------|
| Poor / Basic (0–54) | 0 |
| Solid (55–69) | 1 |
| Strong (70–84) | 2 |
| Excellent / Exceptional (85–100) | 3 |

A better-crafted scanner (more tuning on Survey Clarity, better Conductivity resources) → higher Survey Clarity score → more exact readouts. That proves **better parts change behavior**.

---

## 3. Domain API

| Symbol | Role |
|--------|------|
| `surveyRedMesaFirstSession(equipment?)` | Base survey; optional `{ surveyClarityScore }` |
| `exactStatHintCountForSurveyClarity(score)` | Band → hint count |
| `applySurveyClarityToResult(survey, score)` | Pure enrichment on hints |

`SurveyStatHint` gains optional `exactValue` when revealed.

---

## 4. Server equip flow (minimal)

```text
POST ?/equipScanner
  → validate item belongs to pilot + schematic survey_scanner_mk_i
  → UPDATE pilots SET equipped_scanner_item_id = item.id
  → ledger item_equipped
  → reload survey with item.property_scores.survey_clarity
```

**Load:** `getEquippedScannerForPilot` → pass clarity into `surveyRedMesaFirstSession`. Client only renders `survey.signals[].statHints`.

One equipped scanner per pilot (`pilots.equipped_scanner_item_id`) — no full gear system yet.

---

## 5. TDD proofs

| # | Test | What it proves |
|---|------|----------------|
| 1 | No equipment → zero `exactValue` hints | Basic clarity |
| 2 | Low vs mid vs high Survey Clarity → 0 / 3 / 9 total exact hints | Scales with crafted property |
| 3 | Exact values match catalog stats; bands unchanged | Information only, no stat mutation |

---

## 6. Files touched

```text
packages/domain/src/survey/surveyClarity.ts
packages/domain/src/survey/surveyClarity.test.ts
packages/domain/src/survey/redMesaSurvey.ts
packages/domain/src/survey/types.ts
packages/db/src/queries/scannerEquipment.ts
packages/db/src/schema/pilots.ts
packages/db/drizzle/0013_pilot_equipped_scanner.sql
apps/web/src/routes/+page.server.ts
apps/web/src/routes/+page.svelte
```

---

## 7. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm --filter @async-frontier-mmo/domain test
pnpm check
pnpm --filter @async-frontier-mmo/db db:migrate
pnpm --filter web build
```

**Manual path:** craft scanner → equip → refresh survey → see exact Conductivity on Veyrith when Survey Clarity is Solid+.

---

## 8. What you learned

- Equip changes **read quality**, not world stats.
- Survey Clarity property score directly controls hint depth.
- Server authoritative: client displays `survey` from load/action; domain math is pure and testable.

**Next exercise (Lesson 5.4):** Add drill, pump, and hull plate schematics as data only — no new engine code.
