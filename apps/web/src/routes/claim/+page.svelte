<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolutionDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Claim Results</h1>

{#if data.mode === 'pending'}
	<p>
		Thumper on <strong>{data.targetDisplayName}</strong> is not ready to claim yet.
	</p>
	<p>{data.message}</p>
	<p><a href="/run">Open Thumper Run →</a></p>
{:else if data.mode === 'claimable'}
	<section class="claim-ready">
		<h2>Ready to secure</h2>
		<p>
			Your run on <strong>{data.targetDisplayName}</strong> finished ({data.windowCount} event
			window{data.windowCount === 1 ? '' : 's'} resolved). Claim once to add recovered units to
			inventory — you can only claim once.
		</p>
		{#if form?.message}
			<p class="flash flash--error">{form.message}</p>
		{/if}
		<form method="POST" action="?/claim" use:enhance>
			<button type="submit">Claim {data.targetDisplayName}</button>
		</form>
	</section>
{:else if data.mode === 'result'}
	<section class="claim-outcome">
		<p>
			<small>
				Here's exactly where your haul came from. Your resource's stats never change during a run —
				only how much you recovered.
			</small>
		</p>

		{#if data.alreadyClaimed}
			<p><strong>Already claimed</strong> — inventory was updated once; claiming again grants nothing.</p>
		{/if}

		<h2>{data.explanation.summary}</h2>

		<dl class="totals">
			<div>
				<dt>Projected recovery</dt>
				<dd>{data.explanation.projectedRecovery} units</dd>
			</div>
			<div>
				<dt>Recovered (inventory)</dt>
				<dd><strong>{data.explanation.recoveredQuantity}</strong> {data.targetDisplayName}</dd>
			</div>
			<div>
				<dt>Waste / scrap</dt>
				<dd>{data.explanation.wasteQuantity} units</dd>
			</div>
			<div>
				<dt>Forfeited (Recall Early)</dt>
				<dd>{data.explanation.forfeitedRecovery} units</dd>
			</div>
			<div>
				<dt>Resolution</dt>
				<dd>{resolutionDisplayLabel(data.explanation.resolutionType)}</dd>
			</div>
		</dl>

		<h3>Explanation chain</h3>
		<ol class="window-chain">
			{#each data.explanation.windowLines as line}
				<li>
					<strong>Window {line.windowIndex}: {line.complicationLabel}</strong>
					→ <em>{line.chosenLabel}</em>
					<br />
					<span>{line.consequence}</span>
					{#if line.wasteFromWindow > 0}
						<br /><small>Waste from this window: {line.wasteFromWindow}</small>
					{/if}
					{#if line.frameBonusRecovery > 0}
						<br /><small>Frame bonus: +{line.frameBonusRecovery} recovery</small>
					{/if}
				</li>
			{/each}
		</ol>

		{#if data.explanation.payoutAdjustments.length > 0}
			<h3>Payout adjustments</h3>
			<ul>
				{#each data.explanation.payoutAdjustments as line}
					<li>{line}</li>
				{/each}
			</ul>
		{/if}

		{#if data.depositSpotExhausted}
			<p class="deposit-exhausted">
				This deposit is exhausted — <a href="/survey">survey for a new spot</a>.
			</p>
		{/if}

		<h3>Part wear</h3>
		{#if data.explanation.wearLines.length === 0}
			<p><small>No thumper part snapshots on this run.</small></p>
		{:else}
			<ul>
				{#each data.explanation.wearLines as wear}
					<li>
						<strong>{wear.displayName}</strong> ({thumperPartSlotLabel(wear.slot)}): condition
						{wear.conditionBefore} →
						{wear.conditionAfter} ({wear.conditionDelta}), integrity {wear.integrityBefore} →
						{wear.integrityAfter}
					</li>
				{/each}
			</ul>
		{/if}

		<h3>Salvage / scrap</h3>
		<p>{data.explanation.salvageNote}</p>

		<p class="craft-link">
			<a href="/craft"><strong>Crafting + Gear →</strong></a>
			Turn claimed {data.targetDisplayName} into scanner modules and thumper parts.
		</p>

		{#if data.showDevAudit}
			<details class="dev-panel">
				<summary>Dev</summary>
				<section class="dev-audit">
					<h3>Ledger audit</h3>
					<p><small>Run {data.runId} · result {data.resultId}</small></p>
					{#if data.auditEntries.length === 0}
						<p><small>No ledger rows matched this run.</small></p>
					{:else}
						<ul>
							{#each data.auditEntries as entry}
								<li>
									<code>{entry.eventType}</code>
									{#if entry.quantityDelta}
										Δ {entry.quantityDelta}
									{/if}
									<small>{entry.createdAt}</small>
									<pre>{JSON.stringify(entry.payload, null, 2)}</pre>
								</li>
							{/each}
						</ul>
					{/if}
					<p><small>Stored explanation: {data.explanation.legacyExplanation}</small></p>
				</section>
			</details>
		{/if}
	</section>
{/if}

<style>
	.totals {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: 0.75rem;
		margin: 1rem 0;
	}

	.window-chain {
		display: grid;
		gap: 0.75rem;
		padding-left: 1.25rem;
	}

	.craft-link {
		margin-top: 1.5rem;
		padding: 0.75rem 1rem;
		border: 1px solid #ccc;
	}

	.dev-audit {
		margin-top: 2rem;
		padding: 1rem;
		background: #f6f6f6;
		border: 1px dashed #999;
	}

	.dev-audit pre {
		font-size: 0.75rem;
		overflow-x: auto;
	}
</style>
