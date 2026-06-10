<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageProps } from './$types';
	import type { ResourceStatCode } from 'shared';

	let { data, form }: PageProps = $props();

	const craftIdempotencyKey = crypto.randomUUID();

	const resourceStatCodes: ResourceStatCode[] = [
		'OQ',
		'conductivity',
		'hardness',
		'heat_resistance',
		'malleability'
	];
	const thumperDemo = $derived(
		form?.claimed ? null : (data.thumperDemo ?? form?.thumperDemo)
	);
	const openRun = $derived(
		form?.claimed ? null : (data.openRun ?? form?.openRun ?? null)
	);
	const eventWindows = $derived(form?.eventWindows ?? data.eventWindows ?? []);
	const runReadyToResolve = $derived(form?.runReadyToResolve ?? data.runReadyToResolve ?? false);
	const claimResult = $derived(form?.claimResult ?? null);
	const claimReward = $derived(form?.reward ?? null);
	const craftContext = $derived(form?.craftContext ?? data.craftContext);
	const craftOutcome = $derived(form?.craftOutcome ?? null);
	const scannerItems = $derived(form?.scannerItems ?? data.scannerItems ?? []);
	const equippedScanner = $derived(form?.equippedScanner ?? data.equippedScanner ?? null);
	const equipOutcome = $derived(form?.equipOutcome ?? null);
	const equippedThumperParts = $derived(
		form?.equippedThumperParts ?? data.equippedThumperParts ?? null
	);
	const thumperPartItems = $derived(form?.thumperPartItems ?? data.thumperPartItems ?? []);
	const equipThumperOutcome = $derived(form?.equipThumperOutcome ?? null);
	const tutorialSurvey = $derived(form?.tutorialSurvey ?? data.tutorialSurvey ?? null);
	const activeBloomSurvey = $derived(form?.activeBloomSurvey ?? data.activeBloomSurvey ?? null);
	const surveyMode = $derived(form?.surveyMode ?? data.surveyMode ?? 'tutorial');
	const activeBloomId = $derived(form?.activeBloomId ?? data.activeBloomId ?? 1);
	const bloomRotation = $derived(form?.bloomRotation ?? null);
	const hasCompletedTutorial = $derived(
		form?.hasCompletedTutorial ?? data.hasCompletedTutorial ?? false
	);

	function stacksForFamily(family: string) {
		return craftContext?.inventory.filter((stack) => stack.family === family) ?? [];
	}

	function defaultStackForSlot(slotId: string, family: string): string {
		const stacks = stacksForFamily(family);
		if (slotId === 'conductive_core') {
			const veyrith = stacks.find((stack) => stack.resourceSlug === 'veyrith_copper');
			if (veyrith) return veyrith.resourceInstanceId;
		}
		if (slotId === 'crystal_lens') {
			const pale = stacks.find((stack) => stack.resourceSlug === 'pale_ember_crystal');
			if (pale) return pale.resourceInstanceId;
		}
		if (slotId === 'frame_mount') {
			const keth = stacks.find((stack) => stack.resourceSlug === 'keth_iron');
			if (keth) return keth.resourceInstanceId;
		}
		if (
			slotId === 'intake_manifold' ||
			slotId === 'conductive_coil' ||
			slotId === 'conductive_core'
		) {
			const veyrith = stacks.find((stack) => stack.resourceSlug === 'veyrith_copper');
			if (veyrith) return veyrith.resourceInstanceId;
		}
		if (
			slotId === 'flexible_housing' ||
			slotId === 'cutting_bit' ||
			slotId === 'outer_plate' ||
			slotId === 'bracing_layer'
		) {
			const keth = stacks.find((stack) => stack.resourceSlug === 'keth_iron');
			if (keth) return keth.resourceInstanceId;
		}
		if (
			slotId === 'flow_crystal' ||
			slotId === 'resonance_crystal' ||
			slotId === 'bonding_matrix' ||
			slotId === 'crystal_lens'
		) {
			const pale = stacks.find((stack) => stack.resourceSlug === 'pale_ember_crystal');
			if (pale) return pale.resourceInstanceId;
		}
		return stacks[0]?.resourceInstanceId ?? '';
	}

	function thumperPartsForSlot(slot: 'drill' | 'pump' | 'hull') {
		return thumperPartItems.filter((item) => item.slot === slot);
	}

	function isEquippedThumperPart(itemId: string): boolean {
		if (!equippedThumperParts) return false;
		return (
			equippedThumperParts.drill?.itemId === itemId ||
			equippedThumperParts.pump?.itemId === itemId ||
			equippedThumperParts.hull?.itemId === itemId
		);
	}

	function suggestedTuningForSchematic(schematicId: string): Record<string, number> {
		return craftContext?.thumperPartSuggestedTuning?.[schematicId] ?? {};
	}
	const thumperSource = $derived(
		form?.claimed ? 'claim' : data.thumperDemo ? 'load' : form?.thumperDemo ? 'action' : 'load'
	);
	const canSubmitClaim = $derived(
		(openRun?.recalled === true || thumperDemo?.status === 'claimable') && runReadyToResolve
	);

	let displaySeconds = $state<number | null>(null);

	function optionLabel(optionId: string): string {
		return optionId === 'recall_early' ? 'Recall Early' : optionId;
	}

	function isActiveWindow(windowIndex: number): boolean {
		if (openRun?.recalled) {
			return false;
		}
		const prior = eventWindows.filter((window) => window.windowIndex < windowIndex);
		if (!prior.every((window) => window.responded)) {
			return false;
		}
		const current = eventWindows.find((window) => window.windowIndex === windowIndex);
		return current ? !current.responded : false;
	}

	$effect(() => {
		if (!thumperDemo || thumperDemo.status !== 'active') {
			displaySeconds = thumperDemo?.secondsRemaining ?? null;
			return;
		}

		displaySeconds = thumperDemo.secondsRemaining;

		let intervalId = setInterval(() => {
			if (displaySeconds === null) return;

			if (displaySeconds <= 1) {
				displaySeconds = 0;
				clearInterval(intervalId);
				void invalidateAll();
				return;
			}

			displaySeconds -= 1;
		}, 1000);

		return () => clearInterval(intervalId);
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if (tutorialSurvey || activeBloomSurvey) && !thumperDemo}
	<h2>
		Red Mesa survey
		{#if surveyMode === 'tutorial'}
			(first session)
		{:else}
			(bloom #{activeBloomId})
		{/if}
	</h2>
	{#if equippedScanner}
		<p>
			<small>
				Equipped: {equippedScanner.displayName} — Survey Clarity {equippedScanner.surveyClarityScore}
				(clearer stat readouts)
			</small>
		</p>
	{:else}
		<p><small>Basic Scanner Mk 0 — stat bands only until you equip a crafted scanner.</small></p>
	{/if}
	{#if surveyMode === 'tutorial' && tutorialSurvey}
		<ul>
			{#each tutorialSurvey.signals as signal}
				<li>
					<strong>{signal.displayName}</strong>
					{#if signal.recommended}(recommended){/if}
					— {signal.teachingNote}
					<ul>
						{#each signal.statHints as hint}
							<li>
								{hint.stat}: {hint.band}
								{#if hint.exactValue !== undefined}
									(exact {hint.exactValue})
								{/if}
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{:else if activeBloomSurvey}
		<p>
			<small>
				Spawnable resources in the active bloom. Archived stacks in your inventory keep their
				original provenance after rotation.
			</small>
		</p>
		<ul>
			{#each activeBloomSurvey.signals as signal}
				<li>
					<strong>{signal.displayName}</strong>
					{#if signal.resourceSlug === activeBloomSurvey.recommendedResourceSlug}
						(recommended)
					{/if}
					— concentration {signal.concentrationMinPercent}–{signal.concentrationMaxPercent}%
					<ul>
						{#each signal.statHints as hint}
							<li class:stat-deemphasized={!hint.emphasized}>
								{hint.stat}: {hint.band}
								{#if hint.exactValue !== undefined}
									(exact {hint.exactValue})
								{/if}
								{#if !hint.emphasized}
									<small> — low craft relevance</small>
								{/if}
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}

	{#if import.meta.env.DEV && hasCompletedTutorial}
		<form method="POST" action="?/rotateBloom">
			<button type="submit">Rotate bloom (dev)</button>
		</form>
		{#if bloomRotation?.status === 'rotated'}
			<p>
				<small>
					Rotated bloom #{bloomRotation.previousBloomId} → #{bloomRotation.newBloomId} (
					{bloomRotation.spawnedResourceCount} new resources).
				</small>
			</p>
		{/if}
	{/if}

	<form method="POST" action="?/deploy">
		<fieldset>
			<legend>Deploy thumper on signal</legend>
			{#if surveyMode === 'tutorial' && tutorialSurvey}
				{#each tutorialSurvey.signals as signal}
					<label>
						<input
							type="radio"
							name="targetResourceId"
							value={signal.resourceId}
							checked={signal.recommended}
						/>
						{signal.displayName}
					</label>
				{/each}
			{:else if activeBloomSurvey}
				{#each activeBloomSurvey.signals as signal}
					<label>
						<input
							type="radio"
							name="targetResourceId"
							value={signal.resourceSlug}
							checked={signal.resourceSlug === activeBloomSurvey.recommendedResourceSlug}
						/>
						{signal.displayName}
					</label>
				{/each}
			{/if}
		</fieldset>
		<label>
			<input type="checkbox" name="isPushRun" value="true" />
			Push run (3 event windows, higher projected recovery)
		</label>
		<p>
			<small>
				Push is ignored on your first scripted Veyrith tutorial deploy. Repeat and non-tutorial
				deploys may use it.
			</small>
		</p>
		<button type="submit">Deploy thumper</button>
	</form>
{:else if thumperDemo}
	<p>Thumper running on <strong>{openRun?.targetDisplayName ?? 'unknown signal'}</strong>.</p>
	{#if openRun?.isPushRun}
		<p><small>Push run — {eventWindows.length} event windows</small></p>
	{/if}
	{#if openRun?.recalled}
		<p><small>Run ended early — secured progress kept; claim when ready.</small></p>
	{/if}

	{#if eventWindows.length > 0}
		<h2>Event windows</h2>
		<ul>
			{#each eventWindows as window}
				<li>
					<strong>Window {window.windowIndex}:</strong> {window.complication}
					{#if window.responded}
						— responded: {optionLabel(window.chosenResponse ?? '')}
					{:else if isActiveWindow(window.windowIndex)}
						<form method="POST" action="?/respond" style="display: inline">
							<input type="hidden" name="windowIndex" value={window.windowIndex} />
							{#each window.responseOptions as option}
								<button
									type="submit"
									name="chosenResponse"
									value={option.id}
									disabled={!option.enabled}
									title={option.disabledReason ?? ''}
								>
									{optionLabel(option.id)}
								</button>
							{/each}
						</form>
						{#each window.responseOptions as option}
							{#if !option.enabled && option.disabledReason}
								<p><small>{option.disabledReason}</small></p>
							{/if}
						{/each}
					{:else if openRun?.recalled}
						— skipped after recall
					{:else}
						— waiting for earlier windows
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if canSubmitClaim}
	<form method="POST" action="?/claim">
		<button type="submit">Claim thumper</button>
	</form>
{:else if thumperDemo && !runReadyToResolve}
	<p>Resolve event windows or choose Recall Early before claiming.</p>
{:else if thumperDemo && !openRun?.recalled && thumperDemo.status !== 'claimable'}
	<p>Wait for the run timer or choose Recall Early to end the run.</p>
{/if}

{#if craftContext && !thumperDemo}
	<h2>Crafting workshop</h2>
	<p>
		<small>
			Fill each slot from owned stacks, spend exactly 3 tuning points, then Safe Craft or Careful
			Experiment.
		</small>
	</p>

	{#if craftContext.inventory.length > 0}
		<p><strong>Owned resources:</strong></p>
		<p>
			<small>
				Family-orphan stats are de-emphasized in survey readouts (Decision 018 §6). CM
				orphans: {craftContext.deemphasizedStatsByFamily?.conductive_metal?.join(', ') ?? 'none'}.
			</small>
		</p>
		<ul>
			{#each craftContext.inventory as stack}
				<li>{stack.displayName} × {stack.quantity} ({stack.family})</li>
			{/each}
		</ul>
	{/if}

	<h3>Craft {craftContext.scannerSchematic.displayName}</h3>
	<form method="POST" action="?/craftScanner">
		<input type="hidden" name="idempotencyKey" value={craftIdempotencyKey} />

		{#each craftContext.scannerSchematic.slots as slot}
			<fieldset>
				<legend>{slot.displayName} ({slot.requiredFamily})</legend>
				<select name="slot_{slot.id}" required>
					<option value="" disabled selected={stacksForFamily(slot.requiredFamily).length === 0}>
						Choose stack
					</option>
					{#each stacksForFamily(slot.requiredFamily) as stack}
						<option
							value={stack.resourceInstanceId}
							selected={stack.resourceInstanceId === defaultStackForSlot(slot.id, slot.requiredFamily)}
						>
							{stack.displayName} × {stack.quantity}
						</option>
					{/each}
				</select>
			</fieldset>
		{/each}

		<fieldset>
			<legend>Tuning (3 points total)</legend>
			{#each craftContext.scannerSchematic.properties as property}
				<label>
					{property.displayName}
					<input
						type="number"
						name="tuning_{property.id}"
						min="0"
						max="3"
						value={craftContext.scannerSuggestedTuning[property.id] ?? 0}
					/>
				</label>
			{/each}
		</fieldset>

		<fieldset>
			<legend>Craft mode</legend>
			<label>
				<input type="radio" name="craftMode" value="safe_craft" checked />
				Safe Craft
			</label>
			<label>
				<input type="radio" name="craftMode" value="careful_experiment" />
				Careful Experiment
			</label>
		</fieldset>

		<button type="submit">Craft scanner</button>
	</form>

	{#each craftContext.thumperPartSchematics as partSchematic}
		<h3>Craft {partSchematic.displayName}</h3>
		<form method="POST" action="?/craftThumperPart">
			<input type="hidden" name="schematicId" value={partSchematic.id} />
			<input
				type="hidden"
				name="idempotencyKey"
				value="{craftIdempotencyKey}-{partSchematic.id}"
			/>

			{#each partSchematic.slots as slot}
				<fieldset>
					<legend>{slot.displayName} ({slot.requiredFamily})</legend>
					<select name="slot_{slot.id}" required>
						<option value="" disabled selected={stacksForFamily(slot.requiredFamily).length === 0}>
							Choose stack
						</option>
						{#each stacksForFamily(slot.requiredFamily) as stack}
							<option
								value={stack.resourceInstanceId}
								selected={stack.resourceInstanceId ===
									defaultStackForSlot(slot.id, slot.requiredFamily)}
							>
								{stack.displayName} × {stack.quantity}
							</option>
						{/each}
					</select>
				</fieldset>
			{/each}

			<fieldset>
				<legend>Tuning (3 points total)</legend>
				{#each partSchematic.properties as property}
					<label>
						{property.displayName}
						<input
							type="number"
							name="tuning_{property.id}"
							min="0"
							max="3"
							value={suggestedTuningForSchematic(partSchematic.id)[property.id] ?? 0}
						/>
					</label>
				{/each}
			</fieldset>

			<fieldset>
				<legend>Craft mode</legend>
				<label>
					<input type="radio" name="craftMode" value="safe_craft" checked />
					Safe Craft
				</label>
				<label>
					<input type="radio" name="craftMode" value="careful_experiment" />
					Careful Experiment
				</label>
			</fieldset>

			<button type="submit">Craft {partSchematic.displayName}</button>
		</form>
	{/each}
{/if}

{#if equippedThumperParts}
	<h3>Equipped thumper parts</h3>
	<ul>
		<li>
			Drill:
			{#if equippedThumperParts.drill}
				{equippedThumperParts.drill.displayName} — condition
				{equippedThumperParts.drill.condition}, integrity {equippedThumperParts.drill.integrity}
			{:else}
				none
			{/if}
		</li>
		<li>
			Pump:
			{#if equippedThumperParts.pump}
				{equippedThumperParts.pump.displayName} — recovery
				{equippedThumperParts.pump.recoveryEfficiency}, condition
				{equippedThumperParts.pump.condition}
			{:else}
				none
			{/if}
		</li>
		<li>
			Hull:
			{#if equippedThumperParts.hull}
				{equippedThumperParts.hull.displayName} — condition
				{equippedThumperParts.hull.condition}, integrity {equippedThumperParts.hull.integrity}
			{:else}
				none
			{/if}
		</li>
	</ul>
{/if}

{#if thumperPartItems.length > 0}
	<h3>Thumper parts inventory</h3>
	<ul>
		{#each thumperPartItems as part}
			<li>
				{part.displayName} ({part.slot}) — condition {part.condition}, integrity {part.integrity}
				{#if part.recoveryEfficiency !== null}
					— recovery {part.recoveryEfficiency}
				{/if}
				{#if isEquippedThumperPart(part.id)}
					<strong>(equipped)</strong>
				{:else if part.slot}
					<form method="POST" action="?/equipThumperPart" style="display: inline">
						<input type="hidden" name="slot" value={part.slot} />
						<input type="hidden" name="itemId" value={part.id} />
						<button type="submit">Equip</button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if equipThumperOutcome}
	<p>
		{#if equipThumperOutcome.action === 'unequipped'}
			<strong>Unequipped {equipThumperOutcome.slot} slot.</strong>
		{:else}
			<strong>Equipped {equipThumperOutcome.displayName}</strong> in {equipThumperOutcome.slot}
			slot — condition {equipThumperOutcome.condition}, integrity {equipThumperOutcome.integrity}.
		{/if}
	</p>
{/if}

{#if scannerItems.length > 0}
	<h3>Survey scanners</h3>
	<ul>
		{#each scannerItems as scanner}
			<li>
				{scanner.displayName} — Survey Clarity {scanner.surveyClarity}
				{#if scanner.equipped}
					<strong>(equipped)</strong>
				{:else}
					<form method="POST" action="?/equipScanner" style="display: inline">
						<input type="hidden" name="itemId" value={scanner.id} />
						<button type="submit">Equip</button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if equipOutcome}
	<p>
		<strong>Equipped {equipOutcome.displayName}</strong> — Survey Clarity {equipOutcome.surveyClarity}.
		Re-read the survey above for clearer hints.
	</p>
{/if}

{#if craftOutcome}
	<h3>Craft result</h3>
	<p>{craftOutcome.explanation.summary}</p>
	<p><small>{craftOutcome.explanation.modeContribution}</small></p>
	<ul>
		{#each craftOutcome.explanation.properties as line}
			<li>
				<strong>{line.displayName}</strong>: {line.finalScore} ({line.finalBand}) — base
				{line.baseScore}, tuned {line.tunedScore}, {line.tuningPoints} tuning point(s). Top driver:
				{line.drivers[0]?.label} ({line.drivers[0]?.statValue}, {line.drivers[0]?.weightPercent}% weight).
			</li>
		{/each}
	</ul>
	{#if craftOutcome.item.hasMinorFlaw}
		<p><small>Minor flaw on crafted item.</small></p>
	{/if}
{/if}

{#if form?.claimed && claimResult}
	<p>
		<strong>Claim result ({claimResult.resolutionType}):</strong>
		{claimResult.recoveredQuantity} {claimResult.targetResourceId}
		(waste {claimResult.wasteQuantity}, forfeited {claimResult.forfeitedRecovery}) —
		{claimResult.explanation}
	</p>
	{#if claimReward}
		<p>
			<strong>Inventory:</strong> +{claimReward.quantityGranted}
			{claimReward.displayName} (stack total {claimReward.stackQuantity})
		</p>
	{/if}
{/if}

{#if import.meta.env.DEV}
	<p data-dev-note>
		<strong>Dev:</strong> resource stat codes from <code>shared</code>:
		{resourceStatCodes.join(', ')}
	</p>
	<p data-dev-note>
		<strong>Dev:</strong> thumper state from server ({thumperSource}):
		{#if form?.claimed}
			claimed
		{:else if thumperDemo}
			{thumperDemo.status},
			{#if thumperDemo.status === 'active'}
				{displaySeconds}s remaining (client display)
			{:else}
				{thumperDemo.secondsRemaining}s remaining
			{/if}
			{#if openRun}
				— target: {openRun.targetDisplayName} ({openRun.targetResourceId})
			{/if}
		{:else}
			no thumper deployed
		{/if}
	</p>
{/if}

<style>
	.stat-deemphasized {
		opacity: 0.55;
	}
</style>
