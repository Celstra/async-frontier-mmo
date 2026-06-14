export function foremanLine(input: {
	tutorialStep: string | null;
	milestoneLabel: string;
	hasOpenOrders: boolean;
	fabricatorUnlocked: boolean;
	orderReadyToTurnIn?: boolean;
	openOrderCount?: number;
	filledOrderCount?: number;
	pinnedOrderFamily?: string | null;
	pinnedResourceLabel?: string | null;
}): string {
	if (input.tutorialStep === 'prologue') {
		return 'Read the briefing, then review the foreman orders on this board.';
	}

	if (input.tutorialStep === 'first_orders' || input.tutorialStep === 'hunting') {
		if (input.pinnedOrderFamily && input.pinnedResourceLabel) {
			const familyLabel =
				input.pinnedOrderFamily === 'structural_alloy'
					? 'Structural Alloy'
					: input.pinnedOrderFamily === 'conductive_metal'
						? 'Conductive Metal'
						: input.pinnedOrderFamily === 'reactive_crystal'
							? 'Reactive Crystal'
							: input.pinnedOrderFamily;
			return `First order: ${familyLabel}. FIELD is tuned for ${input.pinnedResourceLabel} — scan the recommended signal.`;
		}
	}

	if (input.tutorialStep === 'assemble_rig') {
		return 'Parts are on the bench. Assemble your rig in WORKSHOP.';
	}

	if (input.tutorialStep === 'first_deploy') {
		return "Rig's ready. Deploy on the deposit you sampled — FIELD.";
	}

	if (input.tutorialStep === 'recall_lesson') {
		return 'RIG SECURED — fail-safe nominal. Hull integrity spent. I can patch that scavenged hull to thirty percent condition and integrity if you’re ready for another run.';
	}

	if (input.tutorialStep === 'hull_patch') {
		return 'Patch restores condition and integrity to thirty percent. Patched hull can limp through one short recovery run. Craft Reinforced Hull Plate to unlock real tails.';
	}

	if (input.tutorialStep === 'second_deploy') {
		return 'Second tutorial deploy must use the locked Keth Iron waypoint — claim should land around sixty units structural.';
	}

	if (input.tutorialStep === 'full_claim') {
		return 'Sixty units recovered. Workshop’s open — craft a Reinforced Hull Plate next so your rig can hold a real deployment length.';
	}

	if (input.tutorialStep === 'async_reveal') {
		return 'Longer deployments run while you’re gone. Pick a run length when you’re ready — I’ll top off your survey charge so you can scout fresh deposits while the rig works.';
	}

	if (input.tutorialStep === 'turn_in' || (input.hasOpenOrders && input.tutorialStep === 'hunting')) {
		return 'Turn in one stack per order. No mixing — I need clean lots.';
	}

	if (input.orderReadyToTurnIn) {
		return 'Stack’s complete on the board — turn in here before you head back to FIELD.';
	}

	if (
		input.openOrderCount &&
		input.filledOrderCount &&
		input.filledOrderCount > 0 &&
		input.openOrderCount > 0
	) {
		return `Half the lot’s in — ${input.filledOrderCount} filled, ${input.openOrderCount} open. Back to FIELD for the rest.`;
	}

	if (input.hasOpenOrders) {
		return `${input.milestoneLabel}. Sample a deposit, then bring back one stack per family.`;
	}

	if (input.fabricatorUnlocked && input.tutorialStep === 'done') {
		return 'Fabricator’s online. Workshop’s yours when you’re ready.';
	}

	return 'No open orders right now. Check back after the next bloom rotation.';
}
