export function foremanLine(input: {
	tutorialStep: string | null;
	milestoneLabel: string;
	hasOpenOrders: boolean;
	fabricatorUnlocked: boolean;
}): string {
	if (input.tutorialStep === 'prologue') {
		return 'Read the briefing, then review the foreman orders on this board.';
	}

	if (input.tutorialStep === 'first_orders') {
		return 'Pick a resource family from the foreman list and hunt it on FIELD — one stack per order, no mixing.';
	}

	if (input.tutorialStep === 'recall_lesson') {
		return 'RIG SECURED — fail-safe nominal. Hull integrity spent. I can patch that scavenged hull to thirty percent condition and integrity if you’re ready for another run.';
	}

	if (input.tutorialStep === 'hull_patch') {
		return 'Patch restores condition and integrity to thirty percent — enough for your five-minute run. After that, craft a Reinforced Hull Plate in WORKSHOP before you chase hour-long tails.';
	}

	if (input.tutorialStep === 'second_deploy') {
		return 'Second run on the patched hull — claim should land around sixty units. Craft a Reinforced Hull Plate and equip it on RIG before picking long async tails.';
	}

	if (input.tutorialStep === 'full_claim') {
		return 'Sixty units recovered. Workshop’s open — craft a Reinforced Hull Plate next so your rig can hold a real deployment length.';
	}

	if (input.tutorialStep === 'async_reveal') {
		return 'Longer deployments run while you’re gone. Your rig, your call — pick a run length when you’re ready.';
	}

	if (input.tutorialStep === 'turn_in' || (input.hasOpenOrders && input.tutorialStep === 'hunting')) {
		return 'Turn in one stack per order. No mixing — I need clean lots.';
	}

	if (input.hasOpenOrders) {
		return `${input.milestoneLabel}. Sample a deposit, then bring back one stack per family.`;
	}

	if (input.fabricatorUnlocked && input.tutorialStep === 'done') {
		return 'Fabricator’s online. Workshop’s yours when you’re ready.';
	}

	return 'No open orders right now. Check back after the next bloom rotation.';
}
