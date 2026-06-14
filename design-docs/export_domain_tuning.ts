/**
 * Writes domain_tuning_snapshot.json for Python sims — run from repo root:
 *   pnpm exec tsx design-docs/export_domain_tuning.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	FIRST_HULL_RESERVE,
	FIRST_HULL_SA_RESERVE,
	REINFORCED_HULL_PLATE,
	HULL_CEILING_EXPONENT,
	HULL_TIER_BASE,
	NEXT_NEED_ORDER_CM_STACK,
	NEXT_NEED_ORDER_RC_STACK,
	PATCHED_HULL_INTEGRITY,
	SAMPLE_BASE_YIELD,
	TUTORIAL_ORDER_CM_STACK,
	TUTORIAL_ORDER_SA_STACK,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_YIELD
} from '@async-frontier-mmo/domain';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = {
	source: 'packages/domain — re-export via design-docs/export_domain_tuning.ts',
	generatedBy: 'export_domain_tuning.ts',
	SAMPLE_BASE_YIELD,
	TUTORIAL_ORDER_SA_STACK,
	TUTORIAL_ORDER_CM_STACK,
	NEXT_NEED_ORDER_RC_STACK,
	NEXT_NEED_ORDER_CM_STACK,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_YIELD,
	PATCHED_HULL_INTEGRITY,
	HULL_CEILING_EXPONENT,
	HULL_TIER_BASE,
	HULL_SA: FIRST_HULL_SA_RESERVE,
	HULL_RC: FIRST_HULL_RESERVE.units,
	REINFORCED_HULL_PLATE_SLOTS: REINFORCED_HULL_PLATE.slots.map((slot) => ({
		id: slot.id,
		family: slot.requiredFamily,
		inputQuantity: slot.inputQuantity
	}))
};

writeFileSync(join(here, 'domain_tuning_snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`wrote ${join(here, 'domain_tuning_snapshot.json')}`);
