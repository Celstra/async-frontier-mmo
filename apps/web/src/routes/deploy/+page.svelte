<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const preview = $derived(data.preview);
	const selectedTailId = $derived(data.selectedTailId);
</script>

<p><a href="/survey">← Red Mesa Survey</a></p>

<h1>Signal Detail / Deploy Thumper</h1>

<h2>
	{data.displayName}
	{#if data.recommended}
		<small>(recommended)</small>
	{/if}
</h2>

{#if data.teachingNote}
	<p><small>{data.teachingNote}</small></p>
{/if}

<section class="signal-detail">
	<h3>Deposit spot</h3>
	<dl>
		<div>
			<dt>Spot</dt>
			<dd>{data.spotId}</dd>
		</div>
		<div>
			<dt>Sampled concentration</dt>
			<dd>
				{data.trueConcentrationPercent}% (~{preview.concentrationMultiplier.toFixed(2)}× extraction
				multiplier)
			</dd>
		</div>
	</dl>

	<h3>Equipped thumper parts</h3>
	<ul>
		<li>
			Drill: {data.equippedParts.drill?.displayName ?? 'none'} — condition
			{data.equippedParts.drill?.condition ?? '—'}
		</li>
		<li>
			Pump: {data.equippedParts.pump?.displayName ?? 'none'} — condition
			{data.equippedParts.pump?.condition ?? '—'}
		</li>
		<li>
			Hull: {data.equippedParts.hull?.displayName ?? 'none'} — condition
			{data.equippedParts.hull?.condition ?? '—'}
		</li>
	</ul>

	<h3>Run preview (Decision 005)</h3>
	<p>
		<small>
			Projected values are deterministic estimates at deploy. Claim applies event-window outcomes —
			actual recovery may be lower after waste, hold, or Recall Early.
		</small>
	</p>
	<dl class="meter-grid">
		<div>
			<dt>Projected Recovery</dt>
			<dd>{preview.projectedRecovery} units</dd>
		</div>
		<div>
			<dt>Signal Lock</dt>
			<dd>{preview.signalLock}%</dd>
		</div>
		<div>
			<dt>Pump Flow</dt>
			<dd>{preview.pumpFlow}%</dd>
		</div>
		<div>
			<dt>Threat Pressure</dt>
			<dd>{preview.threatPressure}%</dd>
		</div>
		<div>
			<dt>Hull Condition</dt>
			<dd>{preview.hullCondition}%</dd>
		</div>
		<div>
			<dt>Depth risk</dt>
			<dd>{preview.depthRisk}%</dd>
		</div>
		<div>
			<dt>Condition risk</dt>
			<dd>{preview.conditionRisk}%</dd>
		</div>
	</dl>
</section>

{#if form?.message}
	<p><strong>{form.message}</strong></p>
{/if}

<form method="GET" action="/deploy" class="preview-controls">
	<input type="hidden" name="resourceInstanceId" value={data.resourceInstanceId} />
	<input type="hidden" name="spotId" value={data.spotId} />

	<fieldset>
		<legend>Extraction tail (Decision 017)</legend>
		{#each data.extractionTailOptions as tail}
			<label>
				<input
					type="radio"
					name="tail"
					value={tail.id}
					checked={tail.id === selectedTailId}
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
				/>
				{tail.label}
				<small>
					— ~{(Math.pow(tail.minutes / 60, 0.5)).toFixed(2)}× passive yield vs 1 h
				</small>
			</label>
		{/each}
	</fieldset>

	{#if data.showPushRunToggle}
		<label>
			<input
				type="checkbox"
				name="push"
				value="true"
				checked={data.selectedPushRun}
				onchange={(event) => event.currentTarget.form?.requestSubmit()}
			/>
			Push run (3 event windows, higher base recovery)
		</label>
	{/if}
</form>

<form method="POST" action="?/deploy">
	<input type="hidden" name="targetResourceId" value={data.resourceSlug} />
	<input type="hidden" name="resourceInstanceId" value={data.resourceInstanceId} />
	<input type="hidden" name="spotId" value={data.spotId} />
	<input type="hidden" name="extractionTail" value={selectedTailId} />
	{#if data.showPushRunToggle && data.selectedPushRun}
		<input type="hidden" name="isPushRun" value="true" />
	{/if}

	<p>
		<small>
			Basic Personal Thumper — active phase ~{Math.round(preview.totalDurationSeconds / 60)} min total
			(includes {selectedTailId} tail). Tutorial runs ignore push.
		</small>
	</p>

	<button type="submit">Deploy thumper on this spot</button>
</form>

<p><small>After deploy, return to Pilot Home to monitor the run and respond to event windows.</small></p>

<style>
	.signal-detail dl {
		display: grid;
		gap: 0.5rem;
	}

	.meter-grid {
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	.preview-controls fieldset {
		border: 1px solid #ccc;
		padding: 0.75rem;
		margin: 1rem 0;
		display: grid;
		gap: 0.35rem;
	}
</style>
