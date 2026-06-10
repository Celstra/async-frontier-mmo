<script lang="ts">
	import { enhance } from '$app/forms';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import {
		FAMILY_SCAN_ENERGY_LABEL,
		SAMPLE_SPOT_ENERGY_LABEL,
		SURVEY_ENERGY_CAP
	} from '$lib/surveyScreen';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const resources = $derived(form?.resources ?? data.resources);
	const surveyEnergy = $derived(form?.surveyEnergy ?? data.surveyEnergy);
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

<p>Survey energy: {surveyEnergy} / {SURVEY_ENERGY_CAP}</p>

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

<form method="POST" action="?/scanFamily" use:enhance>
	<input type="hidden" name="family" value={selectedFamily} />
	<button type="submit">Scan {familyDisplayLabel(selectedFamily)} family — {FAMILY_SCAN_ENERGY_LABEL}</button>
</form>

{#if !data.hasFamilyScan}
	<p><em>Scan a family to reveal resources and deposit spots. {FAMILY_SCAN_ENERGY_LABEL}.</em></p>
{:else}
	<p>
		<small>
			Stats stay hidden until you take a sample. Greyed-out stats don't matter for any current
			schematic.
		</small>
	</p>
{/if}

{#if resources.length === 0 && data.hasFamilyScan}
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
									use:enhance
									onsubmit={() => trackSampleTarget(resource.resourceInstanceId, spot.spotId)}
								>
									<input type="hidden" name="family" value={selectedFamily} />
									<input type="hidden" name="resourceInstanceId" value={resource.resourceInstanceId} />
									<input type="hidden" name="spotId" value={spot.spotId} />
									<button type="submit">Sample — {SAMPLE_SPOT_ENERGY_LABEL}</button>
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

<style>
	.resource-cards {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1rem;
	}

	.resource-card {
		border: 1px solid #ccc;
		padding: 0.75rem;
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
