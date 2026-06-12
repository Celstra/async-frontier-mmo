/** Tutorial rig assembly — slot worn or crafted thumper parts into the chassis (slice Phase 5). */

export type ChassisAssemblySlotId = 'hull' | 'drill' | 'pump';

export type ChassisAssemblySlot = {
	id: ChassisAssemblySlotId;
	displayName: string;
	partSlot: ChassisAssemblySlotId;
};

export type ChassisAssemblyDefinition = {
	id: string;
	displayName: string;
	description: string;
	slots: ChassisAssemblySlot[];
};

export const THUMPER_CHASSIS_ASSEMBLY: ChassisAssemblyDefinition = {
	id: 'thumper_chassis_assembly',
	displayName: 'Settlement Thumper Rig',
	description:
		'Slot the foreman’s worn drill, pump, and scavenged hull into the chassis sockets. This is your first deployable rig.',
	slots: [
		{ id: 'hull', displayName: 'Hull Socket', partSlot: 'hull' },
		{ id: 'drill', displayName: 'Drill Socket', partSlot: 'drill' },
		{ id: 'pump', displayName: 'Pump Socket', partSlot: 'pump' }
	]
};
