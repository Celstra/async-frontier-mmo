<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
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

<dl>
	<div>
		<dt>Sampled deposit spot</dt>
		<dd>{data.spotId}</dd>
	</div>
	<div>
		<dt>True concentration</dt>
		<dd>{data.trueConcentrationPercent}% (~{data.extractionMultiplier.toFixed(2)}× extraction)</dd>
	</div>
	<div>
		<dt>Projected recovery (base run)</dt>
		<dd>{data.projectedRecovery} units before event windows</dd>
	</div>
</dl>

{#if form?.message}
	<p><strong>{form.message}</strong></p>
{/if}

<form method="POST" action="?/deploy">
	<input type="hidden" name="targetResourceId" value={data.resourceSlug} />
	<input type="hidden" name="resourceInstanceId" value={data.resourceInstanceId} />
	<input type="hidden" name="spotId" value={data.spotId} />

	<label>
		<input type="checkbox" name="isPushRun" value="true" />
		Push run (3 event windows — hidden during tutorial)
	</label>

	<button type="submit">Deploy thumper on this spot</button>
</form>

<p><small>After deploy, return to Pilot Home to monitor the run and respond to event windows.</small></p>
