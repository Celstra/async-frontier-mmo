/** FIRST_THUMP_SLICE_SPEC §6 + SLICE_IMPLEMENTATION_PLAN Phase 7 */
export const TUTORIAL_STEPS = [
	'prologue',
	'first_orders',
	'hunting',
	'turn_in',
	'fabricator_online',
	'assemble_rig',
	'first_deploy',
	'recall_lesson',
	'hull_patch',
	'second_deploy',
	'full_claim',
	'async_reveal',
	'done'
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export type TutorialScreenId = 'field' | 'settlement' | 'workshop' | 'rig';

const TUTORIAL_STEP_SET = new Set<string>(TUTORIAL_STEPS);

export function isTutorialStep(value: string | null | undefined): value is TutorialStep {
	return typeof value === 'string' && TUTORIAL_STEP_SET.has(value);
}

/** Which nav tab gets the Phase 0 “next action” highlight for this step. */
export function tutorialNextActionScreen(step: string | null): TutorialScreenId | null {
	switch (step) {
		case 'prologue':
			return 'settlement';
		case 'first_orders':
			return 'field';
		case 'turn_in':
		case 'fabricator_online':
		case 'recall_lesson':
		case 'hull_patch':
		case 'full_claim':
		case 'async_reveal':
			return 'settlement';
		case 'hunting':
		case 'first_deploy':
		case 'second_deploy':
			return 'field';
		case 'assemble_rig':
			return 'workshop';
		case 'done':
			return null;
		default:
			return null;
	}
}

/** Tutorial thumper scripting applies through second deploy / full claim. */
export function isScriptedTutorialThumperStep(step: string | null): boolean {
	return (
		step === 'first_deploy' ||
		step === 'recall_lesson' ||
		step === 'second_deploy' ||
		step === 'full_claim'
	);
}
