# Lesson 19 — Red Mesa Survey screen

> **Exercise:** Split survey out of the monolithic home page into Decision 008's second MVP screen. Wire **Decision 019** prospecting (`scanFamilyForPilot` / `sampleSpotForPilot`) instead of the legacy `redMesaSurvey` / `activeBloomSurvey` loaders. Family scan spends energy; page **load** is read-only preview.

**Prerequisite:** Lesson 18 (Pilot Home + session pilot), Lesson 22b (prospecting domain + db helpers).

**Out of scope:** Multiple regions, random bloom rotation UI, full Signal Detail polish (Lesson 7.3 adds more deploy preview), map/travel.

**Learning goal:** Understand **what the server sends for survey** vs what the client renders — and which fields belong on each resource card (and why).

---

## 1. Server load data for survey

Survey is **not** a static resource menu. The load function assembles a **read-only preview** from bloom rows + pilot progress:

| Load field | Source | Why |
|------------|--------|-----|
| `activeBloomId` / `activeBloomName` | `getActiveBloomId` | Player must know which spawn set is live |
| `selectedFamily` | URL `?family=` or default `conductive_metal` | Decision 021-D — one scanner, pick a family per scan |
| `surveyEnergy` | `pilot_survey_energy` + domain regen (display only) | Bounded hunting — no infinite rescans |
| `equippedScanner` | `getEquippedScannerForPilot` | Survey Clarity narrows unsampled spot bands |
| `resources[]` | `previewFamilyScanForPilot` | Cards for each spawn in the family |
| `recommendedResourceSlug` | Bloom #1 tutorial → `veyrith_copper` | Recommends, never forces |
| `hasCompletedTutorial` | Tutorial thumper claimed | Gates recommendation + push deploy |

**Important:** `previewFamilyScanForPilot` calls domain `buildFamilyScanPreview` — **no energy spend on load**. The `scanFamily` action calls `scanFamilyForPilot` which **does** spend energy (+ scanner wear + ledger later).

```text
GET /survey        → previewFamilyScanForPilot (read-only)
POST ?/scanFamily  → scanFamilyForPilot (−8 energy)
POST ?/sampleSpot  → sampleSpotForPilot (−12 energy, trickle, stat reveal)
```

---

## 2. What each resource card shows (and why)

Each card is one **named resource instance** in the active bloom for the selected family:

| Field | Shown when | Why |
|-------|------------|-----|
| `displayName` | Always | SWG identity — players choose named resources |
| `(recommended)` | `resourceSlug === recommendedResourceSlug` | Tutorial nudge toward Veyrith Copper without locking deploy |
| `concentrationMinPercent–MaxPercent` | Always | Bloom rotation **range hint** (Decision 019) — ceiling still earned per spot |
| `teachingNote` | Tutorial slugs | One-line comparison copy (Slag / Sorrel / Veyrith roles) |
| Stats | After first **sample** on that resource | "Sampling tells you what it's made of" |
| Stat hints + de-emphasis | After reveal | Zero-weight stats sink visually (Decision 018 §6) |
| Deposit spots | After family scan preview | Abstract hunt targets — no map |

Each **spot row**:

| Field | Unsampled | Sampled |
|-------|-----------|---------|
| Concentration | Band (min–max %) | Exact `trueConcentrationPercent` |
| Action | Sample button | **Deploy thumper →** link to `/deploy` |

Deploy requires a sampled spot — you cannot thump on a guess.

---

## 3. Tutorial path (Conductive Metal)

Decision 011 (amended by 021) first session on bloom #1:

1. Open `/survey` — family defaults to **Conductive Metal**.
2. **Scan family** (−8 energy) — lists Slag, Sorrel Vein Copper, Veyrith Copper + deposit spots.
3. **Sample** one or more spots (−12 each) — trickle grant + first-sample stat reveal.
4. Veyrith marked **(recommended)** — deploy link on a sampled Veyrith spot.
5. `/deploy` confirms concentration multiplier → deploy → return to Pilot Home for the run.

Keth Iron and Thornwake Crystal live in other families (Structural Alloy / Reactive Crystal) — the old three-signal tutorial UI is retired in favor of the CM family hunt.

---

## 4. Files touched

| File | Role |
|------|------|
| `packages/domain/src/survey/prospectingSampling.ts` | `buildFamilyScanPreview` (read-only) |
| `packages/db/src/queries/prospecting.ts` | `previewFamilyScanForPilot` |
| `apps/web/src/lib/surveyScreen.ts` | Family options, tutorial recommendation |
| `apps/web/src/lib/server/surveyLoad.ts` | Shared survey load bundle |
| `apps/web/src/routes/survey/+page.server.ts` | Load + `scanFamily` / `sampleSpot` actions |
| `apps/web/src/routes/survey/+page.svelte` | Survey UI |
| `apps/web/src/routes/deploy/+page.server.ts` | Minimal Signal Detail + deploy (Lesson 7.3 expands) |
| `apps/web/src/routes/+page.svelte` | Survey removed; link to `/survey` |

---

## 5. Verification

```bash
cd ~/development/async-frontier-mmo
pnpm check
pnpm --filter web build
```

Manual checklist:

1. Pilot Home → **Red Mesa Survey** — energy bar visible.
2. Scan Conductive Metal — three CM resources, spots with bands, stats hidden.
3. Sample a Veyrith spot — stats reveal, deploy link appears, trickle in inventory.
4. Deploy → Pilot Home shows active thumper on Veyrith.

---

## 6. Recap

**Learned:** Survey load is a read-only prospecting preview; scan/sample actions mutate energy, wear, reveals, and samples. Cards show range hints first, exact concentration and stats only after sampling.

**Next exercise:** Lesson 7.3 — expand Signal Detail / Deploy (`docs/lessons/25-signal-deploy-screen.md`): equipped parts, extraction tail choice, push toggle.

---

## Commit

```bash
git add apps/web packages/domain packages/db docs/lessons/19-red-mesa-survey-screen.md
git commit -m "feat: add Red Mesa Survey screen with prospecting flow"
```
