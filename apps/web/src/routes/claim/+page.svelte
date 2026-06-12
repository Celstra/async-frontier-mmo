<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDuration } from '$lib/formatDuration';
	import { resolutionDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Animation state
	let isClaiming = $state(false);
	let showCelebration = $state(false);
	let celebrationStarted = $state(false);

	// Trigger celebration animation when we transition to result mode
	$effect(() => {
		if (data.mode === 'result' && !celebrationStarted) {
			celebrationStarted = true;
			showCelebration = true;
		}
	});

	function qualityBandLabel(quantity: number): string {
		if (quantity >= 60) return 'Exceptional haul';
		if (quantity >= 40) return 'Strong haul';
		if (quantity >= 25) return 'Solid haul';
		if (quantity >= 10) return 'Modest haul';
		return 'Thin haul';
	}

	function getPayoutNumberClass(quantity: number): string {
		if (quantity >= 60) return 'payout-number--exceptional';
		if (quantity >= 40) return 'payout-number--strong';
		if (quantity >= 25) return 'payout-number--solid';
		return 'payout-number--modest';
	}

	import type { ThumperWindowExplanationLine } from '@async-frontier-mmo/domain';
	function formatWindowRecap(windowLine: ThumperWindowExplanationLine): string {
		if ((windowLine.wasteFromWindow ?? 0) > 0) {
			return `${windowLine.complicationLabel}: ${windowLine.chosenLabel} — ${windowLine.wasteFromWindow} waste`;
		}
		if (windowLine.frameBonusRecovery && windowLine.frameBonusRecovery > 0) {
			return `${windowLine.complicationLabel}: ${windowLine.chosenLabel} — +${windowLine.frameBonusRecovery} frame bonus`;
		}
		return `${windowLine.complicationLabel}: ${windowLine.chosenLabel}`;
	}
</script>

<p><a href="/">← Pilot Home</a></p>

{#if data.mode === 'pending'}
	<section class="claim-waiting">
		<h1>Thumper Running</h1>
		<p class="waiting-message">
			Your thumper on <strong>{data.targetDisplayName}</strong> is still extracting.
		</p>
		<p class="waiting-hint">
			{#if data.mode === 'pending' && data.secondsRemaining}
				~{formatDuration(data.secondsRemaining)} remaining
			{:else}
				Wait for the timer to finish, then return here.
			{/if}
		</p>
		<p><a href="/run" class="action-link">Open Thumper Run →</a></p>
	</section>
{:else if data.mode === 'claimable'}
	<section class="claim-ready">
		<h1>Haul Waiting</h1>
		<p class="ready-intro">
			Your run on <strong>{data.targetDisplayName}</strong> finished
			{#if data.windowCount !== undefined}
				<span class="window-count">({data.windowCount} event {data.windowCount === 1 ? 'window' : 'windows'} resolved)</span>
			{/if}
		</p>

		{#if data.mode === 'claimable' && (data.projectedRecovery ?? 0) > 0}
			<div class="projected-summary">
				<span class="projected-label">Projected recovery</span>
				<span class="projected-value">{data.projectedRecovery} units</span>
			</div>
		{/if}

		{#if form?.message}
			<p class="flash flash--error">{form.message}</p>
		{/if}

		<form method="POST" action="?/claim" use:enhance={() => {
			isClaiming = true;
			return async ({ update }) => {
				await update({ reset: false });
				isClaiming = false;
			};
		}}>
			<button type="submit" class="claim-button" disabled={isClaiming}>
				{#if isClaiming}
					<span class="claim-spinner"></span> Collecting...
				{:else}
					Collect haul from {data.targetDisplayName}
				{/if}
			</button>
		</form>

		<p class="claim-note">You can only claim once. Collection adds units to inventory immediately.</p>
	</section>
{:else if data.mode === 'result'}
	<section class="claim-result" class:celebrate={showCelebration}>
		{#if data.alreadyClaimed}
			<div class="already-claimed-banner">
				<span>Already collected</span>
			</div>
		{/if}

		<!-- Celebration Header -->
		<div class="celebration-header" class:animate-in={showCelebration}>
			<span class="celebration-emoji">💎</span>
			<h1 class="celebration-title">{qualityBandLabel(data.explanation.recoveredQuantity)}</h1>
		</div>

		<!-- Payout Reveal -->
		<div class="payout-reveal" class:animate-in-delay-1={showCelebration}>
			<div class="payout-card">
				<span class="payout-resource">{data.targetDisplayName}</span>
				<span class="payout-number {getPayoutNumberClass(data.explanation.recoveredQuantity)}">
					{data.explanation.recoveredQuantity}
				</span>
				<span class="payout-unit">units recovered</span>
				{#if data.explanation.qualityBand}
					<span class="payout-quality">{data.explanation.qualityBand}</span>
				{/if}
			</div>
		</div>

		<!-- Supporting Details -->
		<div class="details-panel" class:animate-in-delay-2={showCelebration}>
			<h2>Run Summary</h2>
			<dl class="summary-stats">
				<div>
					<dt>Projected</dt>
					<dd>{data.explanation.projectedRecovery} units</dd>
				</div>
				<div>
					<dt>Recovered</dt>
					<dd class="highlight">{data.explanation.recoveredQuantity} units</dd>
				</div>
				<div>
					<dt>Waste / Scrap</dt>
					<dd>{data.explanation.wasteQuantity} units</dd>
				</div>
				{#if data.explanation.forfeitedRecovery > 0}
					<div>
						<dt>Forfeited</dt>
						<dd>{data.explanation.forfeitedRecovery} units</dd>
					</div>
				{/if}
				<div>
					<dt>Resolution</dt>
					<dd>{resolutionDisplayLabel(data.explanation.resolutionType)}</dd>
				</div>
			</dl>

			{#if data.depositSpotExhausted}
				<p class="spot-status spot-status--exhausted">
					⚠ This deposit is exhausted — signals have scattered
				</p>
			{/if}

			<!-- Window Recap -->
			{#if data.explanation.windowLines.length > 0}
				<details class="window-recap">
					<summary>Event window recap ({data.explanation.windowLines.length})</summary>
					<ul>
						{#each data.explanation.windowLines as window}
							<li>{formatWindowRecap(window)}</li>
						{/each}
					</ul>
				</details>
			{/if}

			<!-- Part Wear -->
			{#if data.explanation.wearLines.length > 0}
				<details class="wear-recap">
					<summary>Part wear</summary>
					<ul>
						{#each data.explanation.wearLines as wear}
							<li>
								{wear.displayName} ({thumperPartSlotLabel(wear.slot)}):
								condition {wear.conditionBefore} → {wear.conditionAfter}
								{#if wear.conditionDelta < 0}
									<span class="wear-delta">({wear.conditionDelta})</span>
								{/if}
							</li>
						{/each}
					</ul>
				</details>
			{/if}

			{#if data.explanation.salvageNote}
				<p class="salvage-note">{data.explanation.salvageNote}</p>
			{/if}
		</div>

		<!-- Next Steps CTAs -->
		<div class="next-steps" class:animate-in-delay-3={showCelebration}>
			<h2>What next?</h2>
			<div class="cta-grid">
				<a href="/craft" class="cta-card cta-card--primary">
					<span class="cta-icon">🔧</span>
					<span class="cta-title">Take haul to Crafting</span>
					<span class="cta-desc">Turn resources into parts and scanners</span>
				</a>
				<a href="/survey" class="cta-card">
					<span class="cta-icon">📡</span>
					<span class="cta-title">Survey fresh deposits</span>
					<span class="cta-desc">Find new spots to thump</span>
				</a>
				<a href="/inventory" class="cta-card">
					<span class="cta-icon">📦</span>
					<span class="cta-title">Check Inventory</span>
					<span class="cta-desc">Review your stockpile</span>
				</a>
			</div>
		</div>
	</section>
{/if}

{#if data.showDevAudit && data.mode === 'result'}
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

<style>
	/* Waiting State */
	.claim-waiting {
		text-align: center;
		padding: 2rem 1rem;
	}

	.waiting-message {
		font-size: 1.125rem;
		color: var(--text-secondary);
	}

	.waiting-hint {
		color: var(--text-muted);
		font-size: 0.9375rem;
	}

	/* Claimable State - Anticipation */
	.claim-ready {
		max-width: 32rem;
		margin: 0 auto;
		text-align: center;
		padding: 1rem;
	}

	.ready-intro {
		font-size: 1.125rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.window-count {
		color: var(--text-muted);
		font-size: 0.9375rem;
	}

	.projected-summary {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1.25rem;
		background: var(--accent-info-bg);
		border: 2px solid var(--accent-info);
		border-radius: 0.5rem;
		margin: 1.5rem 0;
	}

	.projected-label {
		font-size: 0.875rem;
		color: var(--accent-info);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.projected-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--accent-info);
		font-variant-numeric: tabular-nums;
	}

	.claim-button {
		width: 100%;
		padding: 1rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #052e16;
		background: linear-gradient(135deg, var(--accent-success) 0%, #22c55e 100%);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		box-shadow: 0 4px 6px -1px rgba(74, 222, 128, 0.3);
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.claim-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 8px -1px rgba(74, 222, 128, 0.4);
	}

	.claim-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.claim-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.claim-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(5, 46, 22, 0.3);
		border-top-color: #052e16;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.claim-note {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-top: 1rem;
	}

	/* Result State - Celebration */
	.claim-result {
		max-width: 42rem;
		margin: 0 auto;
	}

	.claim-result.celebrate {
		perspective: 1000px;
	}

	.already-claimed-banner {
		text-align: center;
		padding: 0.5rem;
		background: var(--accent-warning-bg);
		border: 1px solid var(--accent-warning);
		border-radius: 0.375rem;
		margin-bottom: 1rem;
		color: var(--accent-warning);
		font-weight: 500;
	}

	/* Celebration Header */
	.celebration-header {
		text-align: center;
		padding: 2rem 1rem;
		opacity: 0;
		transform: translateY(20px);
	}

	.celebration-header.animate-in {
		animation: slideUpFade 0.6s ease forwards;
	}

	@keyframes slideUpFade {
		0% {
			opacity: 0;
			transform: translateY(20px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.celebration-emoji {
		font-size: 3rem;
		display: block;
		margin-bottom: 0.5rem;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	.celebration-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	/* Payout Reveal */
	.payout-reveal {
		display: flex;
		justify-content: center;
		padding: 1rem;
		opacity: 0;
		transform: scale(0.9);
	}

	.payout-reveal.animate-in-delay-1 {
		animation: scaleIn 0.5s ease 0.3s forwards;
	}

	@keyframes scaleIn {
		0% {
			opacity: 0;
			transform: scale(0.9);
		}
		50% {
			transform: scale(1.02);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.payout-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 2rem 3rem;
		background: linear-gradient(135deg, var(--accent-success-bg) 0%, #0a1f12 100%);
		border: 3px solid var(--accent-success);
		border-radius: 1rem;
		box-shadow: 0 10px 25px -5px rgba(74, 222, 128, 0.3);
	}

	.payout-resource {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--accent-success-text);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.payout-number {
		font-size: 4rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		animation: numberPop 0.5s ease 0.6s both;
	}

	@keyframes numberPop {
		0% {
			transform: scale(0.5);
			opacity: 0;
		}
		70% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.payout-number--exceptional {
		color: var(--accent-success);
		text-shadow: 0 2px 4px rgba(21, 128, 61, 0.2);
	}

	.payout-number--strong {
		color: var(--accent-success);
	}

	.payout-number--solid {
		color: #86efac;
	}

	.payout-number--modest {
		color: var(--accent-warning);
	}

	.payout-unit {
		font-size: 1rem;
		color: var(--accent-success-text);
	}

	.payout-quality {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #052e16;
		background: var(--accent-success);
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		margin-top: 0.5rem;
	}

	/* Details Panel */
	.details-panel {
		margin-top: 1.5rem;
		padding: 1.25rem;
		background: var(--surface-inset);
		border: 1px solid var(--border-subtle);
		border-radius: 0.5rem;
		opacity: 0;
		transform: translateY(20px);
	}

	.details-panel.animate-in-delay-2 {
		animation: slideUpFade 0.5s ease 0.6s forwards;
	}

	.details-panel h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 1rem;
	}

	.summary-stats > div {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.summary-stats dt {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.summary-stats dd {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		margin: 0;
	}

	.summary-stats .highlight {
		color: var(--accent-success);
		font-size: 1.25rem;
	}

	.spot-status {
		margin: 1rem 0 0;
		padding: 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.9375rem;
	}

	.spot-status--exhausted {
		background: var(--accent-danger-bg);
		border: 1px solid rgba(248, 113, 113, 0.3);
		color: var(--accent-danger);
	}

	.window-recap,
	.wear-recap {
		margin-top: 1rem;
	}

	.window-recap summary,
	.wear-recap summary {
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		background: var(--surface-hover);
		border-radius: 0.25rem;
	}

	.window-recap ul,
	.wear-recap ul {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.wear-delta {
		color: var(--accent-danger);
	}

	.salvage-note {
		margin-top: 1rem;
		font-size: 0.9375rem;
		color: var(--text-muted);
		font-style: italic;
	}

	/* Next Steps */
	.next-steps {
		margin-top: 2rem;
		opacity: 0;
		transform: translateY(20px);
	}

	.next-steps.animate-in-delay-3 {
		animation: slideUpFade 0.5s ease 0.9s forwards;
	}

	.next-steps h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
	}

	.cta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.75rem;
	}

	.cta-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		background: var(--surface-raised);
		border: 2px solid var(--border-subtle);
		border-radius: 0.5rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.cta-card:hover {
		border-color: var(--border-muted);
		transform: translateY(-2px);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
	}

	.cta-card--primary {
		border-color: var(--accent-success);
		background: var(--accent-success-bg);
	}

	.cta-card--primary:hover {
		border-color: var(--accent-success);
	}

	.cta-icon {
		font-size: 1.5rem;
	}

	.cta-title {
		font-weight: 600;
		color: var(--text-primary);
	}

	.cta-desc {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	/* Dev panel */
	.dev-audit {
		margin-top: 2rem;
		padding: 1rem;
		background: var(--surface-inset);
		border: 1px dashed var(--border-muted);
	}

	.dev-audit pre {
		font-size: 0.75rem;
		overflow-x: auto;
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.celebration-header.animate-in,
		.payout-reveal.animate-in-delay-1,
		.details-panel.animate-in-delay-2,
		.next-steps.animate-in-delay-3 {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.payout-number {
			animation: none;
		}

		.celebration-emoji {
			animation: none;
		}
	}
</style>
