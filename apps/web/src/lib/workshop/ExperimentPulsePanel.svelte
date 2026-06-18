<script lang="ts">
	import {
		PROPERTY_OUTPUT_BAND_ORDER,
		describeExperimentPulseOutlook,
		experimentPushProbabilityText,
		propertyBandIndex,
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

	let activePulseIndex = $state(0);

	const PUSH_OPTIONS: ReadonlyArray<{ id: ExperimentPushSize; label: string }> = [
		{ id: 'careful', label: 'Careful' },
		{ id: 'standard', label: 'Standard' },
		{ id: 'overdrive', label: 'Overdrive' }
	];
	const PUSH_HEADROOM_REQUIREMENT: Record<ExperimentPushSize, number> = {
		careful: 1,
		standard: 2,
		overdrive: 3
	};

	function lineForProperty(propertyId: string) {
		return preview?.lines.find((row) => row.propertyId === propertyId) ?? null;
	}

	function outlookFor(propertyId: string, push: ExperimentPushSize): ExperimentPulseOutlook | null {
		const line = lineForProperty(propertyId);
		if (!line) return null;
		return describeExperimentPulseOutlook({ schematic, line, push });
	}

	function outlookForPulse(pulse: ExperimentPulse): ExperimentPulseOutlook | null {
		return outlookFor(pulse.propertyId, pulse.push);
	}
	function isPushAvailable(
		outlook: ExperimentPulseOutlook | null,
		push: ExperimentPushSize
	): boolean {
		return Boolean(outlook && outlook.headroomBands >= PUSH_HEADROOM_REQUIREMENT[push]);
	}
	function pushUnavailableText(
		outlook: ExperimentPulseOutlook | null,
		push: ExperimentPushSize
	): string {
		if (!outlook || outlook.headroomBands <= 0) return 'At material cap';
		return `Needs ${PUSH_HEADROOM_REQUIREMENT[push]} open bands`;
	}
	function safePushForPulse(pulse: ExperimentPulse): ExperimentPushSize {
		const currentOutlook = outlookFor(pulse.propertyId, pulse.push);
		if (isPushAvailable(currentOutlook, pulse.push)) return pulse.push;
		const standardOutlook = outlookFor(pulse.propertyId, 'standard');
		if (isPushAvailable(standardOutlook, 'standard')) return 'standard';
		return 'careful';
	}

	const activePulse = $derived(pulses[activePulseIndex]);
	const activeOutlook = $derived(activePulse ? outlookForPulse(activePulse) : null);

	function formatBand(band: string): string {
		return band.charAt(0).toUpperCase() + band.slice(1);
	}

	function pulseLabel(index: number): string {
		const pulse = pulses[index];
		if (!pulse) return `Pulse ${index + 1}`;
		const name =
			schematic.properties.find((row) => row.id === pulse.propertyId)?.displayName ?? pulse.propertyId;
		return `Pulse ${index + 1} · ${name}`;
	}

	function pulseIndicesForProperty(propertyId: string): number[] {
		return pulses.reduce<number[]>((indices, pulse, index) => {
			if (pulse.propertyId === propertyId) {
				indices.push(index);
			}
			return indices;
		}, []);
	}
</script>

<section class="experiment-pulses" aria-label="Experiment pulse configuration">
	<header class="experiment-pulses__header">
		<div class="experiment-pulses__title-block">
			<h3>Experiment pulses</h3>
			<p class="experiment-pulses__help">
				Tuning sets where your materials aim. Pulses gamble band steps after that — resources still
				set the ceiling.
			</p>
		</div>
		<div class="pulse-bank" aria-label="Select pulse to configure">
			{#each pulses as _, index (index)}
				<button
					type="button"
					class="pulse-bank__cell"
					class:pulse-bank__cell--active={activePulseIndex === index}
					class:pulse-bank__cell--spent={Boolean(pulses[index]?.propertyId)}
					data-testid="experiment-pulse-tab-{index}"
					aria-pressed={activePulseIndex === index}
					aria-label="Configure {pulseLabel(index)}"
					onclick={() => {
						activePulseIndex = index;
					}}
				></button>
			{/each}
			<span class="pulse-bank__count">{pulses.length}</span>
		</div>
	</header>

	{#if !preview}
		<p class="experiment-pulses__pending">Fill all resource slots to configure experiment pulses.</p>
	{:else}
		<div class="pulse-tabs" role="tablist" aria-label="Experiment pulse targets">
			{#each pulses as _, index (index)}
				<button
					type="button"
					class="pulse-tab"
					class:pulse-tab--active={activePulseIndex === index}
					role="tab"
					aria-selected={activePulseIndex === index}
					onclick={() => {
						activePulseIndex = index;
					}}
				>
					{pulseLabel(index)}
				</button>
			{/each}
		</div>

		<div class="property-table" role="table" aria-label="Property lines for experimentation">
			<div class="property-table__head" role="row">
				<span role="columnheader">Property</span>
				<span role="columnheader">Tuned</span>
				<span role="columnheader">Bands</span>
				<span role="columnheader">Assigned</span>
			</div>

			{#each schematic.properties as property (property.id)}
				{@const line = lineForProperty(property.id)}
				{@const currentIdx = line ? propertyBandIndex(line.tunedBand) : -1}
				{@const ceilingIdx = line ? propertyBandIndex(line.ceilingBand) : -1}
				{@const atCap = line ? line.tunedBand === line.ceilingBand : false}
				{@const assignedPulses = pulseIndicesForProperty(property.id)}
				{@const isActiveTarget = pulses[activePulseIndex]?.propertyId === property.id}
				<div
					class="property-table__row"
					class:property-table__row--active={isActiveTarget}
					class:property-table__row--capped={atCap}
					class:property-table__row--assigned={assignedPulses.length > 0}
					role="row"
					data-testid="experiment-property-row-{property.id}"
				>
					<button
						type="button"
						class="property-table__pick"
						aria-pressed={isActiveTarget}
						onclick={() => onPropertyChange(activePulseIndex, property.id)}
					>
						<span class="property-table__name">{property.displayName}</span>
						{#if atCap}
							<span class="property-table__cap">No upside at material cap</span>
						{/if}
					</button>

					<div class="property-table__score" role="cell">
						{#if line}
							<span class="property-table__pct">{Math.round(line.tunedScore)}%</span>
							<span class="property-table__band">{formatBand(line.tunedBand)}</span>
						{:else}
							<span class="property-table__muted">—</span>
						{/if}
					</div>

					<div
						class="band-track"
						role="cell"
						aria-label="{property.displayName} bands: current {line
							? formatBand(line.tunedBand)
							: 'unknown'}, ceiling {line ? formatBand(line.ceilingBand) : 'unknown'}"
					>
						{#each PROPERTY_OUTPUT_BAND_ORDER as band, bandIdx (band)}
							<span
								class="band-track__seg"
								class:band-track__seg--current={line && bandIdx <= currentIdx}
								class:band-track__seg--headroom={line &&
									bandIdx > currentIdx &&
									bandIdx <= ceilingIdx}
								class:band-track__seg--beyond={line && bandIdx > ceilingIdx}
								title={formatBand(band)}
							></span>
						{/each}
					</div>

					<div class="property-table__assign" role="cell">
						{#if assignedPulses.length > 0}
							{#each assignedPulses as pulseIndex (pulseIndex)}
								<span class="assign-badge">P{pulseIndex + 1}</span>
							{/each}
						{:else}
							<span class="property-table__muted">—</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<div class="push-bar">
			<p class="push-bar__label">
				Push for {pulseLabel(activePulseIndex)}
			</p>
			<div class="push-bar__options" role="group" aria-label="Push size for pulse {activePulseIndex + 1}">
				{#each PUSH_OPTIONS as option (option.id)}
					{@const optionOutlook = activePulse
						? outlookFor(activePulse.propertyId, option.id)
						: null}
					{@const pushAvailable = isPushAvailable(optionOutlook, option.id)}
					<button
						type="button"
						class="push-bar__btn"
						class:push-bar__btn--selected={activePulse
							? safePushForPulse(activePulse) === option.id
							: false}
						class:push-bar__btn--dim={!pushAvailable}
						class:push-bar__btn--risky={option.id === 'overdrive'}
						data-testid="experiment-push-{activePulseIndex}-{option.id}"
						aria-pressed={activePulse ? safePushForPulse(activePulse) === option.id : false}
						disabled={!pushAvailable}
						onclick={() => {
							if (pushAvailable) onPushChange(activePulseIndex, option.id);
						}}
					>
						<span class="push-bar__btn-label">{option.label}</span>
						<span class="push-bar__btn-odds">
							{pushAvailable
								? experimentPushProbabilityText(option.id)
								: pushUnavailableText(optionOutlook, option.id)}
						</span>
					</button>
				{/each}
			</div>
		</div>

		{#if activeOutlook}
			<p class="pulse-footer" class:pulse-footer--capped={activeOutlook.atBandCeiling}>
				{#if activeOutlook.atBandCeiling}
					At cap on {activeOutlook.displayName} — {activeOutlook.successRatePercent}% hold,
					{activeOutlook.wasteRatePercent}% waste, {activeOutlook.critRatePercent}%
					{activeOutlook.crit.kind === 'scrap' ? 'scrap' : 'band loss'}.
				{:else}
					Up to +{activeOutlook.bandsAttempted} band{activeOutlook.bandsAttempted === 1 ? '' : 's'}
					({activeOutlook.headroomBands} below ceiling) — {activeOutlook.successRatePercent}% success,
					{activeOutlook.wasteRatePercent}% waste, {activeOutlook.critRatePercent}% crit.
				{/if}
			</p>
		{/if}
	{/if}

	{#each pulses as pulse, index (index)}
		<input type="hidden" name="pulse_{index}_property" value={pulse.propertyId} />
		<input type="hidden" name="pulse_{index}_push" value={safePushForPulse(pulse)} />
	{/each}
</section>

<style>
	.experiment-pulses {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--bg-inset);
	}

	.experiment-pulses__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.85rem;
	}

	.experiment-pulses__title-block {
		min-width: 0;
	}

	.experiment-pulses h3 {
		margin: 0 0 0.35rem;
		font-size: 1.1rem;
	}

	.experiment-pulses__help {
		margin: 0;
		max-width: 34rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.pulse-bank {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
		padding: 0.35rem 0.45rem 0.2rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.pulse-bank__cell {
		width: 1.1rem;
		height: 1.45rem;
		padding: 0;
		border: 1px solid var(--phosphor-dim);
		border-radius: 2px;
		background: color-mix(in srgb, var(--phosphor-glow) 65%, var(--bg-panel));
		box-shadow: inset 0 0 6px color-mix(in srgb, var(--phosphor) 20%, transparent);
		cursor: pointer;
	}

	.pulse-bank__cell--spent {
		background: color-mix(in srgb, var(--phosphor) 35%, var(--bg-panel));
	}

	.pulse-bank__cell--active {
		border-color: var(--phosphor);
		background: color-mix(in srgb, var(--phosphor) 50%, var(--bg-panel));
		box-shadow: 0 0 8px var(--phosphor-glow);
	}

	.pulse-bank__count {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.experiment-pulses__pending {
		margin: 0;
		padding: 0.65rem 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-style: italic;
		background: var(--bg-panel);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.pulse-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-bottom: 0.75rem;
	}

	.pulse-tab {
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		background: var(--bg-panel);
		color: var(--text-secondary);
		font-family: inherit;
		font-size: var(--font-size-xs);
		cursor: pointer;
	}

	.pulse-tab--active {
		border-color: var(--phosphor-dim);
		color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.property-table {
		display: grid;
		gap: 0.35rem;
	}

	.property-table__head,
	.property-table__row {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) 4.5rem minmax(6rem, 1fr) 3.5rem;
		gap: 0.5rem;
		align-items: center;
	}

	.property-table__head {
		padding: 0 0.55rem 0.25rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.property-table__row {
		padding: 0.5rem 0.55rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.property-table__row--active {
		border-color: var(--phosphor-dim);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--phosphor) 25%, transparent);
	}

	.property-table__row--assigned {
		border-color: color-mix(in srgb, var(--phosphor) 18%, var(--border-subtle));
	}

	.property-table__row--capped {
		border-color: color-mix(in srgb, var(--accent-warning) 28%, var(--border-subtle));
	}

	.property-table__pick {
		display: grid;
		gap: 0.15rem;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.property-table__name {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.property-table__cap {
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.property-table__score {
		display: grid;
		gap: 0.05rem;
	}

	.property-table__pct {
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
		color: var(--accent-warning);
	}

	.property-table__band {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: capitalize;
	}

	.property-table__muted {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.band-track {
		display: flex;
		gap: 3px;
		align-items: center;
	}

	.band-track__seg {
		flex: 1;
		height: 0.55rem;
		border-radius: 2px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--bg-inset) 85%, transparent);
		opacity: 0.45;
	}

	.band-track__seg--current {
		background: var(--accent-warning);
		border-color: color-mix(in srgb, var(--accent-warning) 65%, var(--border-subtle));
		opacity: 1;
	}

	.band-track__seg--headroom {
		background: color-mix(in srgb, var(--phosphor-dim) 55%, var(--bg-inset));
		border-color: var(--phosphor-dim);
		opacity: 0.85;
	}

	.band-track__seg--beyond {
		opacity: 0.25;
	}

	.property-table__assign {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem;
	}

	.assign-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		padding: 0.15rem 0.35rem;
		border-radius: 999px;
		font-size: var(--font-size-xs);
		font-weight: 700;
		color: var(--phosphor);
		background: var(--phosphor-glow);
		border: 1px solid var(--phosphor-dim);
	}

	.push-bar {
		margin-top: 0.85rem;
		padding-top: 0.85rem;
		border-top: 1px solid var(--border-subtle);
	}

	.push-bar__label {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.push-bar__options {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
	}

	.push-bar__btn {
		display: grid;
		gap: 0.2rem;
		padding: 0.55rem 0.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
		color: var(--text-primary);
		font-family: inherit;
		text-align: left;
		cursor: pointer;
	}

	.push-bar__btn--selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.push-bar__btn--dim {
		opacity: 0.6;
	}

	.push-bar__btn:disabled {
		cursor: not-allowed;
	}

	.push-bar__btn--risky {
		border-color: color-mix(in srgb, var(--accent-danger) 55%, var(--border-subtle));
	}

	.push-bar__btn-label {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.push-bar__btn-odds {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.pulse-footer {
		margin: 0.75rem 0 0;
		padding: 0.55rem 0.65rem;
		font-size: var(--font-size-sm);
		line-height: 1.45;
		color: var(--text-secondary);
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.pulse-footer--capped {
		color: var(--accent-warning);
		border-color: color-mix(in srgb, var(--accent-warning) 35%, var(--border-subtle));
		background: color-mix(in srgb, var(--accent-warning) 8%, var(--bg-panel));
	}

	@media (max-width: 640px) {
		.experiment-pulses__header {
			flex-direction: column;
		}

		.property-table__head {
			display: none;
		}

		.property-table__row {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}

		.push-bar__options {
			grid-template-columns: 1fr;
		}
	}
</style>
