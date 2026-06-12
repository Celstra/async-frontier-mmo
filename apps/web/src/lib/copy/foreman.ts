export function foremanLine(input: {
	tutorialStep: string | null;
	milestoneLabel: string;
	hasOpenOrders: boolean;
	fabricatorUnlocked: boolean;
}): string {
	if (input.fabricatorUnlocked) {
		return 'Fabricator’s online. Workshop’s yours when you’re ready.';
	}

	if (input.tutorialStep === 'prologue') {
		return 'Read the briefing, then review the foreman orders on this board.';
	}

	if (input.tutorialStep === 'first_orders') {
		return 'Pick a family from the foreman list and hunt it on FIELD — one stack per order, no mixing.';
	}

	if (input.tutorialStep === 'turn_in' || (input.hasOpenOrders && input.tutorialStep === 'hunting')) {
		return 'Turn in one stack per order. No mixing — I need clean lots.';
	}

	if (input.hasOpenOrders) {
		return `${input.milestoneLabel}. Sample a deposit, then bring back one stack per family.`;
	}

	return 'No open orders right now. Check back after the next bloom rotation.';
}
