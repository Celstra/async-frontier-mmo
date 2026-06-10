<script lang="ts">
	import { previewCraftProperties, getPropertyOutputBand, TUNING_POINTS_TOTAL, type SchematicDefinition, type SchematicSlotFill, type TuningAllocation, type CraftPropertyPreview } from '@async-frontier-mmo/domain';

	interface InventoryStack {
		resourceInstanceId: string;
		resourceSlug: string;
		displayName: string;
		family: string;
		quantity: number;
		stats: {
			OQ: number;
			conductivity: number;
			hardness: number;
			heat_resistance: number;
			malleability: number;
		};
	}

	interface Props {
		schematic: SchematicDefinition;
		slotFills: SchematicSlotFill[] | null;
		tuning: TuningAllocation;
		onTuningChange: (propertyId: string, points: number) => void;
	}

	let { schematic, slotFills, tuning, onTuningChange }: Props = $props();

	// Calculate total spent points
	const totalSpent = $derived(
		Object.values(tuning).reduce((sum, points) => sum + (points ?? 0), 0)
	);

	const remainingPoints = $derived(TUNING_POINTS_TOTAL - totalSpent);

	// Get live preview from domain
	const preview: CraftPropertyPreview | null = $derived(
		slotFills ? previewCraftProperties(schematic, slotFills, tuning) : null
	);

	// Track recent changes for delta animation
	let recentChanges = $state<Record<string, { oldValue: number; timestamp: number }>>({});

	function increment(propertyId: string) {
		if (remainingPoints > 0) {
			const current = tuning[propertyId] ?? 0;
			const line = preview?.lines.find(l => l.propertyId === propertyId);
			if (line) {
				recentChanges[propertyId] = { oldValue: line.tunedScore, timestamp: Date.now() };
			}
			onTuningChange(propertyId, current + 1);
		}
	}

	function decrement(propertyId: string) {
		const current = tuning[propertyId] ?? 0;
		if (current > 0) {
			const line = preview?.lines.find(l => l.propertyId === propertyId);
			if (line) {
				recentChanges[propertyId] = { oldValue: line.tunedScore, timestamp: Date.now() };
			}
			onTuningChange(propertyId, current - 1);
		}
	}

	function getPoints(propertyId: string): number {
		return tuning[propertyId] ?? 0;
	}

	function formatScore(score: number): string {
		return score.toFixed(1);
	}

	function isRecentChange(propertyId: string): boolean {
		const change = recentChanges[propertyId];
		if (!change) return false;
		return Date.now() - change.timestamp < 1000; // Show delta for 1 second
	}

	function getPreviousScore(propertyId: string): number | null {
		return recentChanges[propertyId]?.oldValue ?? null;
	}
</script>

<div class="tuning-panel">
	<div class="tuning-header">
		<h3>Tuning Allocation</h3>
		<div class="points-indicator" class:complete={remainingPoints === 0}>
			<span class="points-count">{remainingPoints}</span>
			<span class="points-label">point{remainingPoints === 1 ? '' : 's'} remaining</span>
		</div>
	</div>

	<p class="tuning-help">
		Spend exactly {TUNING_POINTS_TOTAL} points across properties. Points boost each property by 5% of its base value.
	</p>

	<div class="property-lines">
		{#each schematic.properties as property}
			{@const points = getPoints(property.id)}
			{@const line = preview?.lines.find(l => l.propertyId === property.id)}
			{@const canIncrement = remainingPoints > 0 && points < 3}
			{@const canDecrement = points > 0}
			{@const isRecent = isRecentChange(property.id)}
			{@const previousScore = getPreviousScore(property.id)}
			<div class="property-line" class:has-points={points > 0}>
				<div class="property-header">
					<span class="property-name">{property.displayName}</span>
					{#if line}
						<span class="band-badge {line.tunedBand}">{line.tunedBand}</span>
					{/if}
				</div>

				<div class="property-details">
					<div class="stepper-control">
						<button
							type="button"
							class="stepper-btn"
							disabled={!canDecrement}
							onclick={() => decrement(property.id)}
							aria-label="Decrease {property.displayName} tuning"
						>
							−
						</button>
						<span class="points-display">{points}</span>
						<button
							type="button"
							class="stepper-btn"
							disabled={!canIncrement}
							onclick={() => increment(property.id)}
							aria-label="Increase {property.displayName} tuning"
						>
							+
						</button>
					</div>

					{#if line}
						<div class="score-display">
							<div class="score-row">
								<span class="score-base">Base {formatScore(line.baseScore)}</span>
								{#if points > 0}
									<span class="score-arrow">→</span>
									<span class="score-tuned" class:recent={isRecent}>
										{formatScore(line.tunedScore)}
										{#if isRecent && previousScore !== null && previousScore !== line.tunedScore}
											<span class="delta {line.tunedScore > previousScore ? 'positive' : 'negative'}">
												{line.tunedScore > previousScore ? '+' : ''}{formatScore(line.tunedScore - previousScore)}
											</span>
										{/if}
									</span>
								{/if}
							</div>
							<div class="ceiling-hint">
								Ceiling: {formatScore(line.resourceCeiling)} ({line.ceilingBand})
								{#if line.tunedScore >= line.resourceCeiling * 0.95}
									<span class="near-cap">near cap</span>
								{/if}
							</div>
						</div>
					{:else}
						<div class="score-display unavailable">
							<span>Select resources to preview</span>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if remainingPoints !== 0}
		<p class="allocation-warning">
			{remainingPoints > 0 
				? `Spend ${remainingPoints} more point${remainingPoints === 1 ? '' : 's'} to craft.` 
				: `Remove ${-remainingPoints} point${-remainingPoints === 1 ? '' : 's'} to craft.`}
		</p>
	{/if}
</div>

<style>
	.tuning-panel {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
	}

	.tuning-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.tuning-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.points-indicator {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.75rem;
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 4px;
	}

	.points-indicator.complete {
		background: #d4edda;
		border-color: #28a745;
	}

	.points-count {
		font-size: 1.25rem;
		font-weight: 700;
		color: #856404;
	}

	.points-indicator.complete .points-count {
		color: #155724;
	}

	.points-label {
		font-size: 0.8rem;
		color: #856404;
	}

	.points-indicator.complete .points-label {
		color: #155724;
	}

	.tuning-help {
		font-size: 0.85rem;
		color: #666;
		margin: 0 0 1rem 0;
	}

	.property-lines {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.property-line {
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 0.75rem;
		transition: border-color 0.15s ease;
	}

	.property-line.has-points {
		border-color: #4a90d9;
		background: #f8fbff;
	}

	.property-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.property-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.band-badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-weight: 600;
	}

	.band-badge.poor { background: #e9ecef; color: #495057; }
	.band-badge.basic { background: #dee2e6; color: #343a40; }
	.band-badge.solid { background: #fff3cd; color: #856404; }
	.band-badge.strong { background: #d4edda; color: #155724; }
	.band-badge.excellent { background: #cce5ff; color: #004085; }
	.band-badge.exceptional { background: #e2e3f3; color: #383d7a; }

	.property-details {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.stepper-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stepper-btn {
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.1s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stepper-btn:hover:not(:disabled) {
		background: #f0f0f0;
		border-color: #999;
	}

	.stepper-btn:active:not(:disabled) {
		background: #e0e0e0;
	}

	.stepper-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.points-display {
		font-size: 1.2rem;
		font-weight: 700;
		min-width: 1.5rem;
		text-align: center;
	}

	.score-display {
		text-align: right;
		flex: 1;
	}

	.score-display.unavailable {
		color: #999;
		font-size: 0.85rem;
		font-style: italic;
	}

	.score-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.4rem;
		margin-bottom: 0.25rem;
	}

	.score-base {
		font-size: 0.85rem;
		color: #666;
	}

	.score-arrow {
		font-size: 0.85rem;
		color: #999;
	}

	.score-tuned {
		font-size: 1.1rem;
		font-weight: 700;
		color: #333;
		transition: color 0.3s ease;
	}

	.score-tuned.recent {
		color: #2c5aa0;
	}

	.delta {
		font-size: 0.8rem;
		font-weight: 600;
		margin-left: 0.25rem;
		animation: fadeOut 1s ease forwards;
	}

	.delta.positive {
		color: #28a745;
	}

	.delta.negative {
		color: #dc3545;
	}

	@keyframes fadeOut {
		0% { opacity: 1; transform: translateY(0); }
		70% { opacity: 1; transform: translateY(0); }
		100% { opacity: 0; transform: translateY(-4px); }
	}

	.ceiling-hint {
		font-size: 0.75rem;
		color: #888;
	}

	.near-cap {
		color: #b35900;
		font-weight: 500;
		margin-left: 0.35rem;
	}

	.allocation-warning {
		margin: 1rem 0 0 0;
		padding: 0.75rem;
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 4px;
		color: #856404;
		font-size: 0.9rem;
		text-align: center;
	}

	@media (max-width: 480px) {
		.property-details {
			flex-direction: column;
			align-items: stretch;
		}

		.score-display {
			text-align: left;
			border-top: 1px solid #eee;
			padding-top: 0.5rem;
			margin-top: 0.5rem;
		}
	}
</style>
