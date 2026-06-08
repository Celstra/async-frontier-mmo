export type ResolveThumperStateInput = {
	deployedAt: Date;
	durationSeconds: number;
	now: Date;
};

export type ResolveThumperStateResult = {
	status: 'active' | 'claimable';
	secondsRemaining: number;
};

export function resolveThumperState(input: ResolveThumperStateInput): ResolveThumperStateResult {
	const endsAtMs = input.deployedAt.getTime() + input.durationSeconds * 1000;
	const remainingMs = endsAtMs - input.now.getTime();

	if (remainingMs > 0) {
		return {
			status: 'active',
			secondsRemaining: Math.ceil(remainingMs / 1000)
		};
	}

	return {
		status: 'claimable',
		secondsRemaining: 0
	};
}
