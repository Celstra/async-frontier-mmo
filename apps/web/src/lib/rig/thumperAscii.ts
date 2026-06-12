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
	/** Status under the ground line — hull %, threat, MAX RUN, etc. */
	footer?: string | null;
	/** Show @ prospector for human scale (RIG / workshop). */
	showProspectorScale?: boolean;
};

const WIDTH = 46;

function center(text: string): string {
	const trimmed = text.slice(0, WIDTH);
	if (trimmed.length >= WIDTH) {
		return trimmed;
	}
	const pad = WIDTH - trimmed.length;
	const left = Math.floor(pad / 2);
	return ' '.repeat(left) + trimmed + ' '.repeat(pad - left);
}

function hullTank(state: ThumperAsciiSlot): string {
	return state.equipped ? '[██]' : '[  ]';
}

function pumpManifold(state: ThumperAsciiSlot): string {
	return state.equipped ? '|||' : '| |';
}

function drillStem(state: ThumperAsciiSlot): string {
	return state.equipped ? '|||' : '| |';
}

function drillAngledRow(state: ThumperAsciiSlot): string {
	if (state.equipped) {
		return '\\  DRILL||   /';
	}
	return '\\  [  ] | |   /';
}

function groundLine(drill: ThumperAsciiSlot): string {
	const stem = drill.equipped ? '|||||' : '| | |';
	return `~~~~~~~${stem}~~~~~~~`;
}

function rigBanner(mode: ThumperAsciiMode | undefined, header: string | null | undefined): string {
	if (header) {
		const label = header.toUpperCase().slice(0, 12);
		return `/  ${label.padEnd(12)} \\`;
	}
	if (mode === 'deployed') {
		return '/  LIVE RUN    \\';
	}
	if (mode === 'workshop') {
		return '/  CHASSIS      \\';
	}
	return '/  PUMP  HULL   \\';
}

export function buildThumperAscii(input: BuildThumperAsciiInput): string {
	const hull = hullTank(input.hull);
	const pump = pumpManifold(input.pump);
	const stem = drillStem(input.drill);
	const showScale = input.showProspectorScale ?? input.mode !== 'deployed';

	const lines: string[] = [];

	if (showScale) {
		lines.push(center('@  you'));
		lines.push(center('|'));
	}

	lines.push(
		center('.----+----.'),
		center(rigBanner(input.mode, input.header)),
		center(`|   ${pump}  ${hull}  |`),
		center(`|   ${pump}  ${hull}  |`),
		center(drillAngledRow(input.drill)),
		center(` \\   ${stem}   /`),
		center(`  \\  ${stem}  /`),
		center(groundLine(input.drill))
	);

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
