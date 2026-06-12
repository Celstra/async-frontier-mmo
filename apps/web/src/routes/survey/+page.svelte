<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import SurveyEnergyMeter from '$lib/SurveyEnergyMeter.svelte';
	import {
		FAMILY_SCAN_ENERGY_COST,
		SAMPLE_ENERGY_COST
	} from '@async-frontier-mmo/domain';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Merge action + load; gate cards on paid family scan (Decision 019). */
	const hasFamilyScan = $derived(form?.hasFamilyScan ?? data.hasFamilyScan);
	const resources = $derived(
		hasFamilyScan ? (form?.resources ?? data.resources) : []
	);
	const surveyEnergy = $derived(form?.surveyEnergy ?? data.surveyEnergy);
	const surveyEnergyCap = $derived(data.surveyEnergyCap);
	const surveyEnergyOutlook = $derived(data.surveyEnergyOutlook);
	const selectedFamily = $derived(form?.selectedFamily ?? data.selectedFamily);
	const message = $derived(form?.message ?? null);
	const sampleOutcome = $derived(form?.sampleOutcome ?? null);

	/** Spot that triggered the latest sampleSpot submission — for inline flash placement. */
	let lastSampledSpotId = $state<string | null>(null);
	let lastSampledResourceId = $state<string | null>(null);

	function trackSampleTarget(resourceInstanceId: string, spotId: string) {
		lastSampledResourceId = resourceInstanceId;
		lastSampledSpotId = spotId;
	}

	function deployHref(resourceInstanceId: string, spotId: string): string {
		const params = new URLSearchParams({ resourceInstanceId, spotId });
		return `/deploy?${params.toString()}`;
	}
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Red Mesa Survey</h1>
<p>
	{data.activeBloomName}
	{#if data.isTutorialSurvey}
		— first session: scan <strong>Conductive Metal</strong>, sample spots, then deploy on recommended
		Veyrith Copper when ready.
	{/if}
</p>

{#if data.equippedScanner}
	<p>
		<small>
			Equipped: {data.equippedScanner.displayName} — Survey Clarity
			{data.equippedScanner.surveyClarityScore} (tighter concentration bands on unsampled spots)
		</small>
	</p>
{:else}
	<p><small>Basic Scanner Mk 0 — wider concentration bands until you craft and equip a scanner.</small></p>
{/if}

<section class="energy-section" aria-label="Survey energy">
	<SurveyEnergyMeter
		energy={surveyEnergy}
		cap={surveyEnergyCap}
		outlook={surveyEnergyOutlook}
	/>
</section>

<form method="GET" action="/survey">
	<label>
		Resource family
		<select name="family" onchange={(event) => event.currentTarget.form?.requestSubmit()}>
			{#each data.familyOptions as option}
				<option value={option.id} selected={option.id === selectedFamily}>{option.label}</option>
			{/each}
		</select>
	</label>
</form>

{#if message && !sampleOutcome}
	<p class="flash flash--error">{message}</p>
{/if}

<form
	method="POST"
	action="?/scanFamily"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			await invalidateAll();
		};
	}}
>
	<input type="hidden" name="family" value={selectedFamily} />
	{#if surveyEnergyOutlook.canScanNow}
		<button type="submit">Scan {familyDisplayLabel(selectedFamily)} family — costs {FAMILY_SCAN_ENERGY_COST} energy</button>
	{:else}
		<button type="submit" disabled>
			Need {FAMILY_SCAN_ENERGY_COST} energy — ready in {surveyEnergyOutlook.minutesUntilNextScan}m
		</button>
	{/if}
</form>

{#if !hasFamilyScan}
	<p><em>Scan a family to reveal resources and deposit spots. Costs {FAMILY_SCAN_ENERGY_COST} energy.</em></p>
{:else}
	<p>
		<small>
			Stats stay hidden until you take a sample. Greyed-out stats don't matter for any current
			schematic.
		</small>
	</p>
{/if}

{#if hasFamilyScan}
	{#if resources.length === 0}
		<p>No spawnable resources in this family for the active bloom.</p>
	{:else}
	<ul class="resource-cards">
		{#each resources as resource}
			<li class="resource-card">
				<h2>
					{resource.displayName}
					{#if resource.recommended}
						<small>(recommended)</small>
					{/if}
				</h2>
				<p>
					Concentration range this bloom: {resource.concentrationMinPercent}–{resource.concentrationMaxPercent}%
				</p>
				{#if resource.teachingNote}
					<p><small>{resource.teachingNote}</small></p>
				{/if}

				{#if !resource.statsVisible}
					<p><em>Stats hidden — sample any deposit spot once to reveal.</em></p>
				{:else if resource.statHints}
					<ul>
						{#each resource.statHints as hint}
							<li class:stat-deemphasized={!hint.emphasized}>
								{hint.stat}: {hint.band}
								{#if !hint.emphasized}
									<small> — low craft relevance</small>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				<h3>Deposit spots</h3>
				{#if message && sampleOutcome && lastSampledResourceId === resource.resourceInstanceId}
					<p class="flash flash--error">{message}</p>
				{/if}
				<ul class="spot-list">
					{#each resource.spots as spot}
						<li>
							Spot {spot.spotIndex + 1} —
							{#if spot.yieldBand === 'exhausted'}
								<strong>Exhausted</strong>
							{:else if spot.sampled && spot.trueConcentrationPercent !== null}
								<strong>{spot.trueConcentrationPercent}%</strong> (sampled) · {spot.yieldBandLabel}
								<a href={deployHref(resource.resourceInstanceId, spot.spotId)}>Deploy thumper →</a>
							{:else}
								{spot.concentrationBandMinPercent}–{spot.concentrationBandMaxPercent}% (estimate)
								<form
									method="POST"
									action="?/sampleSpot"
									style="display: inline"
									use:enhance={() => {
										return async ({ update }) => {
											await update();
											await invalidateAll();
										};
									}}
									onsubmit={() => trackSampleTarget(resource.resourceInstanceId, spot.spotId)}
								>
									<input type="hidden" name="family" value={selectedFamily} />
									<input type="hidden" name="resourceInstanceId" value={resource.resourceInstanceId} />
									<input type="hidden" name="spotId" value={spot.spotId} />
									{#if surveyEnergyOutlook.canSampleNow}
										<button type="submit">Sample — costs {SAMPLE_ENERGY_COST} energy</button>
									{:else}
										<button type="submit" disabled>
											Need {SAMPLE_ENERGY_COST} energy — ready in {surveyEnergyOutlook.minutesUntilNextSample}m
										</button>
									{/if}
								</form>
							{/if}
							{#if sampleOutcome?.status === 'ok' && lastSampledResourceId === resource.resourceInstanceId && lastSampledSpotId === spot.spotId}
								<p class="flash flash--success spot-sample-flash">
									Sample secured: {sampleOutcome.trueConcentrationPercent}% concentration · {sampleOutcome.yieldBandLabel}
									· +{sampleOutcome.trickleQuantity}
									{sampleOutcome.displayName ?? 'units'}{#if sampleOutcome.statsRevealedThisSample} · stats revealed!{/if}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
	{/if}
{/if}

<style>
	.energy-section {
		margin: 1rem 0 1.25rem;
		padding: 0.85rem;
		border: 1px solid var(--border-subtle, #2e2e2e);
		border-radius: 0.5rem;
		background: var(--surface-raised, #1a1a1a);
		max-width: 24rem;
	}

	.resource-cards {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1rem;
	}

	.resource-card {
		border: 1px solid var(--border-subtle, #2e2e2e);
		padding: 0.75rem;
		border-radius: 0.35rem;
		background: var(--surface-raised, #1a1a1a);
	}

	.spot-list {
		padding-left: 1.25rem;
	}

	.spot-sample-flash {
		margin: 0.35rem 0 0;
	}

	.stat-deemphasized {
		opacity: 0.55;
	}
</style>
