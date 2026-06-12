export type FieldResourceStats = {
	OQ: number;
	conductivity: number;
	hardness: number;
	heat_resistance: number;
	malleability: number;
};

export const FIELD_STAT_ROWS: ReadonlyArray<{
	key: keyof FieldResourceStats;
	label: string;
}> = [
	{ key: 'OQ', label: 'Overall quality' },
	{ key: 'conductivity', label: 'Conductivity' },
	{ key: 'hardness', label: 'Hardness' },
	{ key: 'heat_resistance', label: 'Heat resistance' },
	{ key: 'malleability', label: 'Malleability' }
];

export function fieldStatsFromInstance(instance: {
	statOq: number;
	statConductivity: number;
	statHardness: number;
	statHeatResistance: number;
	statMalleability: number;
}): FieldResourceStats {
	return {
		OQ: instance.statOq,
		conductivity: instance.statConductivity,
		hardness: instance.statHardness,
		heat_resistance: instance.statHeatResistance,
		malleability: instance.statMalleability
	};
}
