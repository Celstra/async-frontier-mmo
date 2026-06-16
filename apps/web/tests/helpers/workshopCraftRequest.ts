export function buildDrillHeadCraftForm(input: {
	idempotencyKey: string;
	slotInstanceIds: {
		cuttingBit: string;
		conductiveCoil: string;
		resonanceCrystal: string;
	};
	craftMode?: 'safe_craft' | 'careful_experiment';
}): Record<string, string> {
	const form: Record<string, string> = {
		schematicId: 'basic_drill_head',
		idempotencyKey: input.idempotencyKey,
		craftMode: input.craftMode ?? 'safe_craft',
		slot_cutting_bit: input.slotInstanceIds.cuttingBit,
		slot_conductive_coil: input.slotInstanceIds.conductiveCoil,
		slot_resonance_crystal: input.slotInstanceIds.resonanceCrystal,
		tuning_extraction_rate: '2',
		tuning_depth_access: '1',
		tuning_wear_control: '0'
	};

	if (input.craftMode === 'careful_experiment') {
		form.pulse_0_property = 'extraction_rate';
		form.pulse_0_push = 'careful';
		form.pulse_1_property = 'depth_access';
		form.pulse_1_push = 'standard';
	}

	return form;
}
