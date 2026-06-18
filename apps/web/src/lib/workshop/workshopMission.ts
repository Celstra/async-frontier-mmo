export type WorkshopMissionStep =
	| 'pick_schematic'
	| 'load_slots'
	| 'tune'
	| 'craft'
	| 'compare_reclaim';

export const WORKSHOP_MISSION_STEPS: ReadonlyArray<{
	id: WorkshopMissionStep;
	number: number;
	shortLabel: string;
	nowLabel: string;
}> = [
	{
		id: 'pick_schematic',
		number: 1,
		shortLabel: 'Pick schematic',
		nowLabel: 'Pick a schematic — start with Basic Drill Head.'
	},
	{
		id: 'load_slots',
		number: 2,
		shortLabel: 'Load slots',
		nowLabel: 'Load slots — fill every assembly socket.'
	},
	{
		id: 'tune',
		number: 3,
		shortLabel: 'Tune',
		nowLabel: 'Tune — spend all 3 tuning points on the lines you care about.'
	},
	{
		id: 'craft',
		number: 4,
		shortLabel: 'Craft / Experiment',
		nowLabel: 'Craft or Experiment — submit when the bench is ready.'
	},
	{
		id: 'compare_reclaim',
		number: 5,
		shortLabel: 'Compare / Keep / Reclaim',
		nowLabel: 'Compare your prototype, keep the best, or reclaim weak attempts.'
	}
] as const;

export const WORKSHOP_STEP_ANCHOR_ID: Record<WorkshopMissionStep, string> = {
	pick_schematic: 'workshop-step-pick-schematic',
	load_slots: 'workshop-step-load-slots',
	tune: 'workshop-step-tune',
	craft: 'workshop-step-craft',
	compare_reclaim: 'craft-result'
};

const WORKSHOP_STEP_SCROLL_FALLBACKS: Record<WorkshopMissionStep, string[]> = {
	pick_schematic: [],
	load_slots: [WORKSHOP_STEP_ANCHOR_ID.pick_schematic],
	tune: [WORKSHOP_STEP_ANCHOR_ID.load_slots, WORKSHOP_STEP_ANCHOR_ID.pick_schematic],
	craft: [
		WORKSHOP_STEP_ANCHOR_ID.tune,
		WORKSHOP_STEP_ANCHOR_ID.load_slots,
		WORKSHOP_STEP_ANCHOR_ID.pick_schematic
	],
	compare_reclaim: [
		'workshop-step-compare-history',
		WORKSHOP_STEP_ANCHOR_ID.craft,
		WORKSHOP_STEP_ANCHOR_ID.tune,
		WORKSHOP_STEP_ANCHOR_ID.pick_schematic
	]
};

export function scrollToWorkshopStep(step: WorkshopMissionStep): void {
	const anchorIds = [WORKSHOP_STEP_ANCHOR_ID[step], ...WORKSHOP_STEP_SCROLL_FALLBACKS[step]];

	for (const anchorId of anchorIds) {
		const element = document.getElementById(anchorId);
		if (!element) continue;

		element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		if (!element.hasAttribute('tabindex')) {
			element.setAttribute('tabindex', '-1');
		}
		element.focus({ preventScroll: true });
		return;
	}
}

export function missionStepMeta(step: WorkshopMissionStep) {
	return WORKSHOP_MISSION_STEPS.find((row) => row.id === step) ?? WORKSHOP_MISSION_STEPS[0];
}
