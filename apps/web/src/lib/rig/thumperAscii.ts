import { THUMPER_LARGE, THUMPER_COMPACT, THUMPER_DAMAGED } from '$lib/ascii';

export type ThumperAsciiSlot = {
	equipped: boolean;
	label?: string | null;
};

export type ThumperAsciiMode = 'rig' | 'deployed' | 'workshop';

export type BuildThumperAsciiInput = {
	hull: ThumperAsciiSlot;
	drill: ThumperAsciiSlot;
	pump: ThumperAsciiSlot;
	mode?: ThumperAsciiMode;
	/** Replaces the PUMP / HULL banner when set (e.g. live resource name). */
	header?: string | null;
	/** Status under the art — hull %, threat, MAX RUN, etc. */
	footer?: string | null;
	/** Show @ prospector for human scale (RIG / workshop). */
	showProspectorScale?: boolean;
	/** Show the damaged variant (hull-failsafe recall). */
	damaged?: boolean;
};

const WIDTH = 38;

function center(text: string): string {
	const trimmed = text.slice(0, WIDTH);
	if (trimmed.length >= WIDTH) return trimmed;
	const pad = WIDTH - trimmed.length;
	const left = Math.floor(pad / 2);
	return ' '.repeat(left) + trimmed + ' '.repeat(pad - left);
}

export function buildThumperAscii(input: BuildThumperAsciiInput): string {
	const isDeployed = input.mode === 'deployed';
	const showScale = input.showProspectorScale ?? !isDeployed;
	const damaged = input.damaged ?? false;

	const baseArt = isDeployed
		? damaged
			? THUMPER_DAMAGED
			: THUMPER_COMPACT
		: THUMPER_LARGE;

	const lines: string[] = [];

	if (showScale) {
		lines.push(center('@ you'));
		lines.push(center('|'));
	}

	if (input.header) {
		const label = `[ ${input.header.toUpperCase().slice(0, 20)} ]`;
		lines.push(center(label));
	}

	lines.push(...baseArt.split('\n'));

	if (input.footer) {
		lines.push(center(input.footer));
	}

	return lines.join('\n');
}

export function thumperSlotsFromRigParts(
	parts: Array<{ slot: 'drill' | 'pump' | 'hull'; itemId: string | null; displayName: string | null }>
): Pick<BuildThumperAsciiInput, 'hull' | 'drill' | 'pump'> {
	const bySlot = Object.fromEntries(parts.map((part) => [part.slot, part]));

	return {
		hull: {
			equipped: Boolean(bySlot.hull?.itemId),
			label: bySlot.hull?.displayName ?? null
		},
		drill: {
			equipped: Boolean(bySlot.drill?.itemId),
			label: bySlot.drill?.displayName ?? null
		},
		pump: {
			equipped: Boolean(bySlot.pump?.itemId),
			label: bySlot.pump?.displayName ?? null
		}
	};
}
