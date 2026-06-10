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
	const survey = $derived(form?.survey ?? data.survey);

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
		return stacks[0]?.resourceInstanceId ?? '';
	}
	const thumperSource = $derived(
		form?.claimed ? 'claim' : data.thumperDemo ? 'load' : form?.thumperDemo ? 'action' : 'load'
	);
	const canClaimRun = $derived(openRun?.claimResolutionAvailable === true);
	const canSubmitClaim = $derived(
		canClaimRun && (openRun?.recalled === true || thumperDemo?.status === 'claimable') && runReadyToResolve
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

{#if survey && !thumperDemo}
	<h2>Red Mesa survey (first session)</h2>
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
	<ul>
		{#each survey.signals as signal}
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

	<form method="POST" action="?/deploy">
		<fieldset>
			<legend>Deploy thumper on signal</legend>
			{#each survey.signals as signal}
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
{:else if thumperDemo && canClaimRun && !runReadyToResolve}
	<p>Resolve event windows or choose Recall Early before claiming.</p>
{:else if thumperDemo?.status === 'claimable' && !canClaimRun}
	<p>Seeded run claim resolution is not available yet. Practice responding to event windows.</p>
{:else if thumperDemo && canClaimRun && !openRun?.recalled && thumperDemo.status !== 'claimable'}
	<p>Wait for the run timer or choose Recall Early to end the run.</p>
{/if}

{#if craftContext && !thumperDemo}
	<h2>Craft {craftContext.schematic.displayName}</h2>
	<p>
		<small>
			Fill each slot from owned stacks, spend exactly 3 tuning points, then Safe Craft or Careful
			Experiment.
		</small>
	</p>

	{#if craftContext.inventory.length > 0}
		<p><strong>Owned resources:</strong></p>
		<ul>
			{#each craftContext.inventory as stack}
				<li>{stack.displayName} × {stack.quantity} ({stack.family})</li>
			{/each}
		</ul>
	{/if}

	<form method="POST" action="?/craftScanner">
		<input type="hidden" name="idempotencyKey" value={craftIdempotencyKey} />

		{#each craftContext.schematic.slots as slot}
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
			{#each craftContext.schematic.properties as property}
				<label>
					{property.displayName}
					<input
						type="number"
						name="tuning_{property.id}"
						min="0"
						max="3"
						value={craftContext.suggestedTuning[property.id] ?? 0}
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
