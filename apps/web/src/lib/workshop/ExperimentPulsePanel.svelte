<script lang="ts">
	import {
		describeExperimentPulseOutlook,
		experimentPushProbabilityText,
		type CraftPropertyPreview,
		type ExperimentPulse,
		type ExperimentPulseOutlook,
		type ExperimentPushSize,
		type SchematicDefinition
	} from '@async-frontier-mmo/domain';

	interface Props {
		schematic: SchematicDefinition;
		pulses: ExperimentPulse[];
		preview: CraftPropertyPreview | null;
		onPropertyChange: (index: number, propertyId: string) => void;
		onPushChange: (index: number, push: ExperimentPushSize) => void;
	}

	let { schematic, pulses, preview, onPropertyChange, onPushChange }: Props = $props();

	const PUSH_OPTIONS: ReadonlyArray<{ id: ExperimentPushSize; label: string }> = [
		{ id: 'careful', label: 'Careful' },
		{ id: 'standard', label: 'Standard' },
		{ id: 'overdrive', label: 'Overdrive' }
	];

	function outlookForPulse(pulse: ExperimentPulse): ExperimentPulseOutlook | null {
		if (!preview) return null;
		const line = preview.lines.find((row) => row.propertyId === pulse.propertyId);
		if (!line) return null;
		return describeExperimentPulseOutlook({ schematic, line, push: pulse.push });
	}

	function formatBand(band: string): string {
		return band.charAt(0).toUpperCase() + band.slice(1);
	}

	function formatScore(score: number): string {
		return score.toFixed(1);
	}

	function successDetail(outlook: ExperimentPulseOutlook): string {
		if (outlook.success.improvesBand) {
			return `${formatBand(outlook.currentBand)} → ${formatBand(outlook.success.band)} · score ${formatScore(outlook.success.score)}`;
		}
		return `Stays ${formatBand(outlook.currentBand)} — at resource ceiling (${formatBand(outlook.ceilingBand)}) · score won't drop below ${formatScore(outlook.success.score)}`;
	}

	function wasteDetail(outlook: ExperimentPulseOutlook): string {
		return `No change · stays ${formatBand(outlook.waste.band)} · ${formatScore(outlook.waste.score)}`;
	}

	function critDetail(outlook: ExperimentPulseOutlook): string {
		if (outlook.crit.kind === 'scrap') {
			return `Scraps ${outlook.crit.scrapUnits}u from largest socket — property unchanged`;
		}
		return `${formatBand(outlook.currentBand)} → ${formatBand(outlook.crit.band)} · score drops to ${formatScore(outlook.crit.score)}`;
	}
</script>

<section class="experiment-pulses" aria-label="Experiment pulse configuration">
	<h3>Experiment pulses</h3>
	<p class="experiment-pulses__help">
		Each pulse rolls once. Pick a property line and push size — the outcomes below show what
		<strong>could</strong> happen before you commit.
	</p>

	{#each pulses as pulse, index (index)}
		{@const outlook = outlookForPulse(pulse)}
		<div class="pulse-row">
			<p class="pulse-row__title">Pulse {index + 1}</p>

			<div class="property-options" role="group" aria-label="Property line for pulse {index + 1}">
				{#each schematic.properties as property (property.id)}
					<button
						type="button"
						class="property-btn"
						class:selected={pulse.propertyId === property.id}
						aria-pressed={pulse.propertyId === property.id}
						onclick={() => onPropertyChange(index, property.id)}
					>
						{property.displayName}
					</button>
				{/each}
			</div>

			<div class="push-options" role="group" aria-label="Push size for pulse {index + 1}">
				{#each PUSH_OPTIONS as option (option.id)}
					<button
						type="button"
						class="push-btn"
						class:selected={pulse.push === option.id}
						aria-pressed={pulse.push === option.id}
						onclick={() => onPushChange(index, option.id)}
					>
						<span class="push-btn__label">{option.label}</span>
						<span class="push-btn__detail">{experimentPushProbabilityText(option.id)}</span>
					</button>
				{/each}
			</div>

			{#if outlook}
				<div class="pulse-outlook" aria-label="Possible outcomes for pulse {index + 1}">
					<p class="pulse-outlook__heading">
						Targeting <strong>{outlook.displayName}</strong> — now
						{formatBand(outlook.currentBand)} · {formatScore(outlook.currentScore)}
						<span class="pulse-outlook__ceiling"
							>(ceiling {formatBand(outlook.ceilingBand)})</span
						>
					</p>
					<ul class="outcome-list">
						<li class="outcome outcome--success">
							<span class="outcome__tag">Success · {outlook.successRatePercent}%</span>
							<span class="outcome__detail">{successDetail(outlook)}</span>
						</li>
						<li class="outcome outcome--waste">
							<span class="outcome__tag">Waste · {outlook.wasteRatePercent}%</span>
							<span class="outcome__detail">{wasteDetail(outlook)}</span>
						</li>
						<li class="outcome outcome--crit">
							<span class="outcome__tag">Crit · {outlook.critRatePercent}%</span>
							<span class="outcome__detail">{critDetail(outlook)}</span>
						</li>
					</ul>
				</div>
			{:else}
				<p class="pulse-outlook__pending">Fill all resource slots to preview pulse outcomes.</p>
			{/if}

			<input type="hidden" name="pulse_{index}_property" value={pulse.propertyId} />
			<input type="hidden" name="pulse_{index}_push" value={pulse.push} />
		</div>
	{/each}
</section>

<style>
	.experiment-pulses {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.experiment-pulses h3 {
		margin: 0 0 0.35rem;
		font-size: 1rem;
	}

	.experiment-pulses__help {
		margin: 0 0 0.85rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.pulse-row {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-bottom: 1rem;
		padding: 0.875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-inset);
	}

	.pulse-row__title {
		margin: 0;
		font-size: 0.85rem;
		color: var(--phosphor);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.property-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.property-btn {
		padding: 0.65rem 0.75rem;
		border: 2px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 0.9rem;
	}

	.property-btn.selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.push-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.push-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.75rem;
		border: 2px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}

	.push-btn.selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.push-btn__label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.push-btn__detail {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.pulse-outlook {
		padding: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.pulse-outlook__heading {
		margin: 0 0 0.65rem;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		line-height: 1.45;
	}

	.pulse-outlook__ceiling {
		color: var(--text-secondary);
	}

	.pulse-outlook__pending {
		margin: 0;
		padding: 0.65rem 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		background: var(--bg-panel);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.outcome-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.45rem;
	}

	.outcome {
		display: grid;
		gap: 0.15rem;
		padding: 0.55rem 0.65rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.outcome__tag {
		font-size: var(--font-size-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.outcome__detail {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.outcome--success {
		border-color: color-mix(in srgb, var(--phosphor) 35%, var(--border-subtle));
		background: color-mix(in srgb, var(--phosphor-glow) 65%, var(--bg-panel));
	}

	.outcome--success .outcome__tag {
		color: var(--phosphor);
	}

	.outcome--waste {
		background: var(--bg-inset);
	}

	.outcome--waste .outcome__tag {
		color: var(--text-muted);
	}

	.outcome--crit {
		border-color: color-mix(in srgb, var(--accent-warning) 45%, var(--border-subtle));
		background: color-mix(in srgb, var(--accent-warning-bg) 70%, var(--bg-panel));
	}

	.outcome--crit .outcome__tag {
		color: var(--accent-warning);
	}
</style>
