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
		return 'Pick a family from the foreman list and hunt it on FIELD — one stack per order, no mixing.';
	}

	if (input.tutorialStep === 'recall_lesson') {
		return 'RIG SECURED — fail-safe nominal. Hull integrity spent. I can patch that scavenged hull to thirty percent if you’re ready for another run.';
	}

	if (input.tutorialStep === 'hull_patch') {
		return 'Scavenge gets you thirty percent. Crafted hulls run for hours. Patch up and get back out there.';
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
