import { expect, test } from '@playwright/test';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import {
	cleanupWorkshopCraftPilotForSmoke,
	countPilotPlaytestEvents,
	getWorkshopBenchSlotInstanceIdsForSmoke,
	seedWorkshopCraftPilotForSmoke
} from './helpers/smokeDb';
import { buildDrillHeadCraftForm } from './helpers/workshopCraftRequest';

test.describe('workshop craft telemetry', () => {
	test.beforeAll(() => {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				'DATABASE_URL is required for workshop craft telemetry smoke (see docs/testing/browser-smoke-setup.md)'
			);
		}
	});

	test('idempotent craft replay emits craft_started and craft_completed once', async ({
		request,
		context,
		baseURL
	}) => {
		const pilotId = newSmokePilotId();
		await seedWorkshopCraftPilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		const benchIds = await getWorkshopBenchSlotInstanceIdsForSmoke();
		const idempotencyKey = `telemetry-replay-${Date.now()}`;
		const form = buildDrillHeadCraftForm({
			idempotencyKey,
			slotInstanceIds: {
				cuttingBit: benchIds.kethIron,
				conductiveCoil: benchIds.veyrithCopper,
				resonanceCrystal: benchIds.paleCrystal
			}
		});

		const craftUrl = `${baseURL}/workshop?/craft`;
		const headers = { Cookie: `pilot_id=${pilotId}` };

		try {
			const first = await request.post(craftUrl, { form, headers });
			expect(first.ok(), await first.text()).toBe(true);

			const second = await request.post(craftUrl, { form, headers });
			expect(second.ok(), await second.text()).toBe(true);

			expect(await countPilotPlaytestEvents(pilotId, 'craft_started')).toBe(1);
			expect(await countPilotPlaytestEvents(pilotId, 'craft_completed')).toBe(1);
			expect(await countPilotPlaytestEvents(pilotId, 'repeat_same_schematic')).toBe(0);
		} finally {
			await cleanupWorkshopCraftPilotForSmoke(pilotId);
		}
	});
});
