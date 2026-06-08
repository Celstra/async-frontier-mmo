import { resolveThumperState } from '@async-frontier-mmo/domain';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const deployedAt = new Date(now.getTime() - 30_000);

	const thumperDemo = resolveThumperState({
		deployedAt,
		durationSeconds: 60,
		now
	});

	return { thumperDemo };
};
