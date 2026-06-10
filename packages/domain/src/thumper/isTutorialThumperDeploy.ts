import type { NamedResourceId } from '../resources/types.js';

const TUTORIAL_TARGET: NamedResourceId = 'veyrith_copper';

/** Decision 011 — only the pilot's first Veyrith deploy uses the scripted tutorial. */
export function isTutorialThumperDeploy(input: {
	targetResourceId: NamedResourceId;
	hasCompletedTutorial: boolean;
}): boolean {
	return input.targetResourceId === TUTORIAL_TARGET && !input.hasCompletedTutorial;
}
