/** Hardcoded pilot for the learning scaffold until auth exists. */
export const DEMO_PILOT_ID = 'demo-pilot';

/** MVP player frames — verbs, not stat blocks (Decision 004 / BUILD_PLAN §5). */
export type FrameId = 'recon' | 'engineer' | 'vanguard';

export const FRAME_IDS = ['recon', 'engineer', 'vanguard'] as const satisfies readonly FrameId[];

export function isFrameId(value: string): value is FrameId {
	return (FRAME_IDS as readonly string[]).includes(value);
}

export function parseFrameId(value: string): FrameId {
	if (!isFrameId(value)) {
		throw new Error(`Invalid frame id: ${value}`);
	}
	return value;
}

/** Resource property stat codes — locked MVP set (see MVP_SCOPE_REFERENCE.md). */
export type ResourceStatCode =
	| 'OQ'
	| 'conductivity'
	| 'hardness'
	| 'heat_resistance'
	| 'malleability';
