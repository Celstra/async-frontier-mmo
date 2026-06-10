export type LoopNavStageId = 'survey' | 'deploy' | 'run' | 'claim' | 'craft';

export type LoopNavStage = {
	id: LoopNavStageId;
	label: string;
	href: string;
	/** Deploy needs survey query params — never link from the header. */
	nonLink?: boolean;
};

/** Loop stages after Home (Home is rendered separately). */
export const LOOP_NAV_STAGES: LoopNavStage[] = [
	{ id: 'survey', label: 'Survey', href: '/survey' },
	{ id: 'deploy', label: 'Deploy', href: '/deploy', nonLink: true },
	{ id: 'run', label: 'Run', href: '/run' },
	{ id: 'claim', label: 'Claim', href: '/claim' },
	{ id: 'craft', label: 'Craft + Gear', href: '/craft' }
];

export function isNavStageActive(stage: LoopNavStage, pathname: string): boolean {
	return pathname === stage.href || pathname.startsWith(`${stage.href}/`);
}

export function isHomeActive(pathname: string): boolean {
	return pathname === '/';
}
