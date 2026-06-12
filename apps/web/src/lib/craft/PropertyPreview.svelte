<script lang="ts">
	import { getPropertyOutputBand, TUNING_POINTS_TOTAL, type CraftPropertyPreview, type SchematicSlotFill } from '@async-frontier-mmo/domain';

	interface Props {
		preview: CraftPropertyPreview;
		previousSlotFills: SchematicSlotFill[] | null;
		tuning: Record<string, number>;
	}

	let { preview, previousSlotFills, tuning }: Props = $props();

	function formatScore(score: number): string {
		return score.toFixed(1);
	}

	function getPreviousBaseScore(propertyId: string): number | null {
		if (!previousSlotFills) return null;
		// Recalculate what the base score was with previous fills
		// This is a simplified comparison - we store the previous preview instead
		return null;
	}

	function bandClass(band: string): string {
		return band.toLowerCase().replace(/\s+/g, '_');
	}
</script>

<div class="property-preview">
	<h4>Property Preview</h4>
	<p class="preview-help">
		Base scores from your resource choices. Allocated tuning points boost by 5% each — unspent pool points do not apply until you assign them.
	</p>

	<div class="preview-lines">
		{#each preview.lines as line}
			{@const points = tuning[line.propertyId] ?? 0}
			<div class="preview-line" class:has-tuning={points > 0}>
				<div class="preview-header">
					<span class="property-name">{line.displayName}</span>
					<span class="band-badge {bandClass(line.tunedBand)}">
						{line.tunedBand}
					</span>
				</div>

				<div class="score-flow">
					<span class="base-score" title="Resource-defined base score">
						Base {formatScore(line.baseScore)}
					</span>

					{#if points > 0}
						<span class="arrow">→</span>
						<span class="tuned-score" title="After {points} tuning point{points === 1 ? '' : 's'}">
							{formatScore(line.tunedScore)}
						</span>
						<span class="tuning-boost">(+{points * 5}%)</span>
					{/if}
				</div>

				<div class="ceiling-note">
					Ceiling: {formatScore(line.resourceCeiling)} ({line.ceilingBand})
					{#if line.tunedScore >= line.resourceCeiling * 0.95}
						<span class="near-cap">maxed</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<div class="tuning-status" class:complete={Object.values(tuning).reduce((a, b) => a + (b ?? 0), 0) === TUNING_POINTS_TOTAL}>
		<span class="points-remaining">
			{TUNING_POINTS_TOTAL - Object.values(tuning).reduce((a, b) => a + (b ?? 0), 0)}
		</span>
		points remaining to allocate
	</div>
</div>

<style>
	.property-preview {
		background: var(--surface-inset);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
	}

	.property-preview h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.preview-help {
		margin: 0 0 0.75rem 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.preview-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.preview-line {
		background: var(--surface-raised);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 0.625rem 0.75rem;
		transition: border-color 0.15s ease;
	}

	.preview-line.has-tuning {
		border-color: var(--accent-info);
		background: var(--accent-info-bg);
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.375rem;
	}

	.property-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.band-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-weight: 600;
	}

	.band-badge.poor { background: var(--surface-hover); color: var(--text-muted); }
	.band-badge.basic { background: var(--surface-inset); color: var(--text-secondary); }
	.band-badge.solid { background: var(--accent-warning-bg); color: var(--accent-warning); }
	.band-badge.strong { background: var(--accent-success-bg); color: var(--accent-success-text); }
	.band-badge.excellent { background: var(--accent-info-bg); color: var(--accent-info); }
	.band-badge.exceptional { background: #2a1f3d; color: #c084fc; }

	.score-flow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.base-score {
		color: var(--text-muted);
		font-weight: 500;
	}

	.arrow {
		color: var(--border-muted);
	}

	.tuned-score {
		font-weight: 700;
		color: var(--accent-info);
	}

	.tuning-boost {
		font-size: 0.75rem;
		color: var(--accent-success);
		background: var(--accent-success-bg);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}

	.ceiling-note {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.near-cap {
		color: var(--accent-warning);
		font-weight: 500;
		margin-left: 0.35rem;
	}

	.tuning-status {
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--accent-warning-bg);
		border: 1px solid var(--accent-warning);
		border-radius: 4px;
		font-size: 0.85rem;
		color: var(--accent-warning);
		text-align: center;
	}

	.tuning-status.complete {
		background: var(--accent-success-bg);
		border-color: rgba(74, 222, 128, 0.3);
		color: var(--accent-success-text);
	}

	.points-remaining {
		font-weight: 700;
		font-size: 1.1rem;
	}
</style>
