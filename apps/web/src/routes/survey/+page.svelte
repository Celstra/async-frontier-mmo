<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const resources = $derived(form?.resources ?? data.resources);
	const surveyEnergy = $derived(form?.surveyEnergy ?? data.surveyEnergy);
	const selectedFamily = $derived(form?.selectedFamily ?? data.selectedFamily);
	const message = $derived(form?.message ?? null);
	const sampleOutcome = $derived(form?.sampleOutcome ?? null);

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

<p><strong>Survey energy:</strong> {surveyEnergy}</p>

{#if message}
	<p><strong>{message}</strong></p>
{/if}

{#if sampleOutcome?.status === 'ok'}
	<p>
		<small>
			Sampled spot — true concentration {sampleOutcome.trueConcentrationPercent}%, trickle +{sampleOutcome.trickleQuantity}
			{#if sampleOutcome.statsRevealedThisSample}
				, stats revealed for this resource
			{/if}
		</small>
	</p>
{/if}

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

<form method="POST" action="?/scanFamily">
	<input type="hidden" name="family" value={selectedFamily} />
	<button type="submit">Scan {selectedFamily.replaceAll('_', ' ')} family (−8 energy)</button>
</form>

<p>
	<small>
		Decision 019 — family scan lists resources and deposit spots. Stats stay hidden until you sample that
		resource once. Zero-weight craft stats are de-emphasized after reveal.
	</small>
</p>

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
				<ul class="spot-list">
					{#each resource.spots as spot}
						<li>
							Spot {spot.spotIndex + 1} —
							{#if spot.sampled && spot.trueConcentrationPercent !== null}
								<strong>{spot.trueConcentrationPercent}%</strong> (sampled)
								<a href={deployHref(resource.resourceInstanceId, spot.spotId)}>Deploy thumper →</a>
							{:else}
								{spot.concentrationBandMinPercent}–{spot.concentrationBandMaxPercent}% (estimate)
								<form method="POST" action="?/sampleSpot" style="display: inline">
									<input type="hidden" name="family" value={selectedFamily} />
									<input type="hidden" name="resourceInstanceId" value={resource.resourceInstanceId} />
									<input type="hidden" name="spotId" value={spot.spotId} />
									<button type="submit">Sample (−12 energy)</button>
								</form>
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

	.stat-deemphasized {
		opacity: 0.55;
	}
</style>
