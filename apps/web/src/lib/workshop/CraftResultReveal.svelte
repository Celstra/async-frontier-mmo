<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		experimentPulseOutcomeLabel,
		experimentPushDisplayLabel,
		experimentPushProbabilityText,
		getPropertyOutputBand,
		type CraftInstallComparison,
		type CraftResultExplanation,
		type ExperimentPulseResult,
		type SchematicDefinition
	} from '@async-frontier-mmo/domain';
	import type { WorkshopCraftOutcome } from '$lib/server/craftOutcome';

	interface Props {
		schematic: SchematicDefinition;
		craftOutcome: WorkshopCraftOutcome;
		onCraftAnother: () => void;
	}

	let { schematic, craftOutcome, onCraftAnother }: Props = $props();

	let revealEl = $state<HTMLElement | null>(null);
	let showInstallPreview = $state(false);
	let installing = $state(false);
	let installError = $state<string | null>(null);
	let pulseTelemetrySent = $state(false);

	const explanation: CraftResultExplanation = $derived(craftOutcome.explanation);
	const comparison: CraftInstallComparison | null = $derived(craftOutcome.comparisonTarget);
	const canCompare = $derived(comparison !== null);

	function propertyDisplayName(propertyId: string): string {
		return schematic.properties.find((line) => line.id === propertyId)?.displayName ?? propertyId;
	}

	function formatBand(band: string): string {
		return band.replaceAll('_', ' ');
	}

	function pulseLogLine(pulse: ExperimentPulseResult): string {
		const propertyName = propertyDisplayName(pulse.propertyId);
		const before = formatBand(pulse.bandBefore);
		const after = formatBand(pulse.bandAfter);

		if (pulse.outcome === 'success') {
			return `Pulse ${pulse.pulseIndex + 1} landed clean: ${before} -> ${after}.`;
		}
		if (pulse.outcome === 'wasted') {
			return `Pulse ${pulse.pulseIndex + 1} wasted: no change on ${propertyName}.`;
		}
		if (pulse.outcome === 'crit_band_loss') {
			return `Pulse ${pulse.pulseIndex + 1} slipped: ${before} -> ${after} on ${propertyName}.`;
		}
		if (pulse.scrapUnits > 0) {
			return `Pulse ${pulse.pulseIndex + 1} overdrifted: ${pulse.scrapUnits}u material loss, no gain on ${propertyName}.`;
		}
		return `Pulse ${pulse.pulseIndex + 1}: ${experimentPulseOutcomeLabel(pulse.outcome)}.`;
	}

	function openInstallPreview() {
		showInstallPreview = true;
		installError = null;
		void postTelemetry('craft_result_compare_clicked');
	}

	async function postTelemetry(
		telemetryEvent:
			| 'craft_result_compare_clicked'
			| 'craft_result_craft_another_clicked'
			| 'craft_result_abandoned'
			| 'craft_result_pulse_viewed'
	) {
		const body = new FormData();
		body.set('telemetryEvent', telemetryEvent);
		body.set('itemId', craftOutcome.item.id);
		body.set('schematicId', schematic.id);
		await fetch('?/craftRevealTelemetry', { method: 'POST', body, keepalive: true });
	}

	async function handleRevealAbandon(event: MouseEvent, href: string) {
		event.preventDefault();
		await postTelemetry('craft_result_abandoned');
		window.location.assign(href);
	}

	function handleCraftAnother() {
		void postTelemetry('craft_result_craft_another_clicked');
		onCraftAnother();
	}

	$effect(() => {
		if (pulseTelemetrySent) return;
		const pulses = explanation.experimentPulseResults;
		if (!pulses || pulses.length === 0) return;
		pulseTelemetrySent = true;
		void postTelemetry('craft_result_pulse_viewed');
	});

	$effect(() => {
		if (!revealEl) return;
		const prefersReducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		requestAnimationFrame(() => {
			revealEl?.scrollIntoView({
				behavior: prefersReducedMotion ? 'auto' : 'smooth',
				block: 'start'
			});
			revealEl?.focus();
		});
	});
</script>

<div
	bind:this={revealEl}
	class="craft-reveal"
	id="craft-result"
	tabindex="-1"
	aria-live="polite"
>
	<header class="craft-reveal__header">
		<p class="craft-reveal__eyebrow">Fabricator sealed</p>
		<h3 class="craft-reveal__title">Schematic: {schematic.displayName}</h3>
	</header>

	<section class="craft-reveal__stage">
		<h4>Resources loaded</h4>
		<ul class="craft-reveal__resource-list">
			{#each explanation.slotFillsSnapshot ?? [] as slot}
				<li>
					{slot.resourceDisplayName}, {slot.inputQuantity}u, {slot.family.replaceAll('_', ' ')}
					<span class="craft-reveal__consumed-tag">consumed into prototype</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="craft-reveal__stage">
		<h4>Assembly readout</h4>
		<ul class="craft-reveal__assembly-list">
			{#each explanation.properties as prop}
				<li>
					{prop.displayName}: {formatBand(getPropertyOutputBand(prop.baseScore))} base
				</li>
			{/each}
		</ul>
		{#each explanation.resourceProvenance ?? [] as line}
			<p class="craft-reveal__callout">{line}</p>
		{/each}
	</section>

	<section class="craft-reveal__stage">
		<h4>Tuning applied</h4>
		<ul class="craft-reveal__tuning-list">
			{#each schematic.properties as property}
				<li>
					{property.displayName} +{explanation.tuningSnapshot[property.id] ?? 0} points
				</li>
			{/each}
		</ul>
	</section>

	{#if explanation.experimentPulseResults && explanation.experimentPulseResults.length > 0}
		<section class="craft-reveal__stage">
			<h4>Experiment pulses</h4>
			{#each explanation.experimentPulseResults as pulse (pulse.pulseIndex)}
				<article
					class="pulse-result"
					class:pulse-result--warning={pulse.outcome === 'crit_scrap' ||
						pulse.outcome === 'crit_band_loss'}
				>
					<p class="pulse-result__title">
						Pulse {pulse.pulseIndex + 1} — {experimentPushDisplayLabel(pulse.push)}
					</p>
					<p class="pulse-result__line">Line: {propertyDisplayName(pulse.propertyId)}</p>
					<p class="pulse-result__odds">{experimentPushProbabilityText(pulse.push)}</p>
					<p class="pulse-result__bands">
						Result: {formatBand(pulse.bandBefore)} -> {formatBand(pulse.bandAfter)}
					</p>
					<p class="pulse-result__status">{experimentPulseOutcomeLabel(pulse.outcome)}</p>
					{#if pulse.scrapUnits > 0}
						<p class="pulse-result__scrap">
							Material loss: {pulse.scrapUnits}u consumed from largest socket
						</p>
					{/if}
				</article>
			{/each}
		</section>
	{/if}

	{#if (explanation.experimentScrapUnits ?? 0) > 0}
		<section class="craft-reveal__alarm" role="alert">
			<h4>Overdrive backlash</h4>
			<p>
				The fabricator burned through {explanation.experimentScrapUnits}u extra material stabilizing
				the prototype.
			</p>
			{#each explanation.experimentPulseResults ?? [] as pulse}
				<p>{pulseLogLine(pulse)}</p>
			{/each}
			<p class="craft-reveal__alarm-footer">Prototype stabilized.</p>
		</section>
	{/if}

	<section class="craft-reveal__prototype">
		<p class="craft-reveal__prototype-eyebrow">Prototype complete</p>
		<h3>{craftOutcome.item.displayName}</h3>
		{#if craftOutcome.highlights.length > 0}
			<div class="craft-reveal__highlights">
				{#each craftOutcome.highlights as highlight}
					<span class="highlight-badge">{highlight}</span>
				{/each}
			</div>
		{/if}

		<p class="craft-reveal__wear">
			Condition {craftOutcome.item.condition} · Integrity {craftOutcome.item.integrity}
		</p>

		<ul class="craft-reveal__property-results">
			{#each explanation.properties as prop}
				<li>
					<span>{prop.displayName}</span>
					<span class="prop-score {prop.finalBand}">
						{Math.round(prop.finalScore)} — {formatBand(prop.finalBand)}
					</span>
				</li>
			{/each}
		</ul>

		<p class="craft-reveal__made-from">
			Made from:
			{(explanation.slotFillsSnapshot ?? []).map((slot) => slot.resourceDisplayName).join(', ')}
		</p>
	</section>

	{#if showInstallPreview && comparison}
		<section class="craft-reveal__install-preview">
			<h4>RIG install preview</h4>
			<p class="craft-reveal__install-slot">{comparison.slotLabel}</p>
			<p>
				Current:
				{comparison.current?.displayName ?? 'Empty slot'}
			</p>
			<p>New: {comparison.candidate.displayName}</p>
			<ul class="craft-reveal__delta-list">
				{#each comparison.lines as line}
					<li>
						{line.label}: {line.before} -> {line.after}
					</li>
				{/each}
			</ul>

			{#if installError}
				<p class="craft-reveal__install-error" role="alert">{installError}</p>
			{/if}

			<form
				method="POST"
				action="?/installCraftedItem"
				use:enhance={() => {
					installing = true;
					installError = null;
					return async ({ result, update }) => {
						await update({ reset: false });
						installing = false;
						if (result.type === 'success') {
							showInstallPreview = false;
							onCraftAnother();
						} else if (result.type === 'failure') {
							const message = result.data?.message;
							installError =
								typeof message === 'string'
									? message
									: 'Install failed — equipment may be locked while a thumper run is active.';
						}
					};
				}}
			>
				<input type="hidden" name="itemId" value={comparison.candidate.itemId} />
				<input type="hidden" name="installKind" value={comparison.installKind} />
				{#if comparison.thumperSlot}
					<input type="hidden" name="slot" value={comparison.thumperSlot} />
				{/if}
				<button type="submit" class="craft-reveal__install-btn" disabled={installing}>
					Install {comparison.candidate.displayName}
				</button>
			</form>
			<button
				type="button"
				class="craft-reveal__secondary-btn"
				onclick={() => (showInstallPreview = false)}
			>
				Keep current
			</button>
		</section>
	{:else}
		<div class="craft-reveal__actions">
			{#if canCompare}
				<button type="button" class="craft-reveal__primary-btn" onclick={openInstallPreview}>
					Compare for RIG
				</button>
			{/if}
			<button type="button" class="craft-reveal__secondary-btn" onclick={handleCraftAnother}>
				Craft another
			</button>
			<a class="craft-reveal__link-btn" href="/rig" onclick={(event) => handleRevealAbandon(event, '/rig')}>
				View RIG
			</a>
			<a
				class="craft-reveal__link-btn"
				href="/field"
				onclick={(event) => handleRevealAbandon(event, '/field')}
			>
				Return to FIELD
			</a>
		</div>
		{#if canCompare}
			<p class="craft-reveal__next-hint">Compare it at the RIG before the next run.</p>
		{/if}
	{/if}
</div>

<style>
	.craft-reveal {
		margin-bottom: 1rem;
		padding: 1rem;
		border: 2px solid var(--phosphor-dim);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		scroll-margin-top: 1rem;
		outline: none;
	}

	.craft-reveal:focus-visible {
		box-shadow: 0 0 0 2px var(--phosphor);
	}

	.craft-reveal__header {
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.craft-reveal__eyebrow,
	.craft-reveal__prototype-eyebrow {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--phosphor);
	}

	.craft-reveal__title {
		margin: 0;
		font-size: 1.05rem;
		color: var(--text-bright);
	}

	.craft-reveal__stage {
		margin-bottom: 1rem;
		padding: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.craft-reveal__stage h4 {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.craft-reveal__resource-list,
	.craft-reveal__assembly-list,
	.craft-reveal__tuning-list,
	.craft-reveal__property-results,
	.craft-reveal__delta-list {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.craft-reveal__consumed-tag {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.craft-reveal__callout {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--text-bright);
	}

	.pulse-result {
		margin-top: 0.65rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.pulse-result--warning {
		border-color: var(--accent-warning);
		background: rgba(251, 191, 36, 0.08);
	}

	.pulse-result__title {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.pulse-result__line,
	.pulse-result__odds,
	.pulse-result__bands,
	.pulse-result__status,
	.pulse-result__scrap {
		margin: 0.15rem 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.pulse-result__status {
		font-weight: 700;
		color: var(--text-bright);
	}

	.pulse-result--warning .pulse-result__status {
		color: var(--accent-warning);
	}

	.craft-reveal__alarm {
		margin-bottom: 1rem;
		padding: 0.85rem;
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		background: rgba(251, 191, 36, 0.1);
	}

	.craft-reveal__alarm h4 {
		margin: 0 0 0.5rem;
		color: var(--accent-warning);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: var(--font-size-xs);
	}

	.craft-reveal__alarm p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.craft-reveal__alarm-footer {
		margin-top: 0.5rem !important;
		color: var(--text-bright) !important;
		font-weight: 600;
	}

	.craft-reveal__prototype {
		margin-bottom: 1rem;
		padding: 0.85rem;
		border: 1px solid rgba(74, 222, 128, 0.35);
		border-radius: var(--radius-sm);
		background: var(--phosphor-glow);
	}

	.craft-reveal__prototype h3 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	.craft-reveal__highlights {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}

	.highlight-badge {
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		text-transform: uppercase;
	}

	.craft-reveal__wear,
	.craft-reveal__made-from,
	.craft-reveal__next-hint {
		margin: 0.5rem 0 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.craft-reveal__property-results li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.25rem;
	}

	.prop-score.exceptional {
		color: #a78bfa;
	}

	.craft-reveal__actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.craft-reveal__install-preview {
		padding: 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.craft-reveal__install-preview h4 {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.craft-reveal__install-slot {
		margin: 0 0 0.5rem;
		font-weight: 600;
	}

	.craft-reveal__install-error {
		margin: 0 0 0.75rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		background: rgba(251, 191, 36, 0.1);
		color: var(--accent-warning);
		font-size: 0.9rem;
	}

	.craft-reveal__primary-btn,
	.craft-reveal__install-btn {
		width: 100%;
		padding: 0.85rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--phosphor);
		color: var(--bg-base);
		font-weight: 600;
		cursor: pointer;
	}

	.craft-reveal__secondary-btn,
	.craft-reveal__link-btn {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-hover);
		color: var(--text-primary);
		text-align: center;
		text-decoration: none;
		font-weight: 500;
		cursor: pointer;
	}

	@media (min-width: 520px) {
		.craft-reveal__actions {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
