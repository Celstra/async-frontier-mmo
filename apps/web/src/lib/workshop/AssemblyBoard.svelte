<script lang="ts">
	import { onMount } from 'svelte';
	import type { SchematicDefinition } from '@async-frontier-mmo/domain';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import {
		assemblySlotLayout,
		familyContainerImage,
		schematicPartImage,
		type AssemblySlotPlacement
	} from './schematicArt';

	interface InventoryStack {
		resourceInstanceId: string;
		displayName: string;
		family: string;
	}

	interface Props {
		schematic: SchematicDefinition;
		slotSelections: Record<string, string>;
		activeSlotId: string | null;
		inventory: InventoryStack[];
		onSlotClick: (slotId: string, trigger: HTMLElement) => void;
	}

	let { schematic, slotSelections, activeSlotId, inventory, onSlotClick }: Props = $props();

	const partImage = $derived(schematicPartImage(schematic.id));

	type ConnectorPoint = { x: number; y: number };

	type ConnectorLine = {
		slotId: string;
		from: ConnectorPoint;
		to: ConnectorPoint;
	};

	let stageEl = $state<HTMLDivElement | null>(null);
	let partEl = $state<HTMLElement | null>(null);
	let wireSize = $state({ w: 0, h: 0 });
	let connectors = $state<ConnectorLine[]>([]);

	function stackForSelection(instanceId: string | undefined): InventoryStack | null {
		if (!instanceId) return null;
		return inventory.find((row) => row.resourceInstanceId === instanceId) ?? null;
	}

	function slotAttachPoint(
		slotRect: DOMRect,
		stageRect: DOMRect,
		placement: AssemblySlotPlacement
	): ConnectorPoint {
		const cx = slotRect.left - stageRect.left + slotRect.width / 2;
		const cy = slotRect.top - stageRect.top + slotRect.height / 2;

		switch (placement) {
			case 'top':
				return { x: cx, y: slotRect.bottom - stageRect.top };
			case 'left':
				return { x: slotRect.right - stageRect.left, y: cy };
			case 'right':
				return { x: slotRect.left - stageRect.left, y: cy };
		}
	}

	function lineStartFromRing(center: ConnectorPoint, target: ConnectorPoint, radiusPx: number): ConnectorPoint {
		const dx = target.x - center.x;
		const dy = target.y - center.y;
		const length = Math.hypot(dx, dy) || 1;
		return {
			x: center.x + (dx / length) * radiusPx,
			y: center.y + (dy / length) * radiusPx
		};
	}

	function measureConnectors(): void {
		if (!stageEl || !partEl) {
			connectors = [];
			wireSize = { w: 0, h: 0 };
			return;
		}

		const stageRect = stageEl.getBoundingClientRect();
		if (stageRect.width === 0 || stageRect.height === 0) {
			return;
		}

		const partRect = partEl.getBoundingClientRect();
		wireSize = { w: stageRect.width, h: stageRect.height };

		connectors = schematic.slots.flatMap((slot, index) => {
			const layout = assemblySlotLayout(schematic.id, slot.id, index);
			const slotEl = stageEl?.querySelector<HTMLButtonElement>(
				`[data-testid="assembly-slot-${slot.id}"]`
			);
			if (!slotEl) {
				return [];
			}

			const slotRect = slotEl.getBoundingClientRect();
			const center = {
				x: partRect.left - stageRect.left + partRect.width * layout.anchor.x,
				y: partRect.top - stageRect.top + partRect.height * layout.anchor.y
			};
			const to = slotAttachPoint(slotRect, stageRect, layout.placement);
			const radiusPx = partRect.width * layout.radius;

			return [
				{
					slotId: slot.id,
					from: lineStartFromRing(center, to, radiusPx),
					to
				}
			];
		});
	}

	function scheduleMeasure(): void {
		requestAnimationFrame(measureConnectors);
	}

	onMount(() => {
		if (!stageEl) return;

		const observer = new ResizeObserver(scheduleMeasure);
		observer.observe(stageEl);
		scheduleMeasure();

		return () => observer.disconnect();
	});

	$effect(() => {
		schematic.id;
		slotSelections;
		activeSlotId;
		partImage;
		scheduleMeasure();
	});
</script>

<div class="assembly-board" aria-label="{schematic.displayName} assembly diagram">
	<div class="assembly-board__stage" bind:this={stageEl}>
		{#if wireSize.w > 0 && wireSize.h > 0}
			<svg
				class="assembly-board__wires"
				width={wireSize.w}
				height={wireSize.h}
				aria-hidden="true"
				data-testid="assembly-connectors"
			>
				{#each connectors as connector (connector.slotId)}
					<line
						class="assembly-wire"
						class:assembly-wire--active={activeSlotId === connector.slotId}
						class:assembly-wire--filled={Boolean(slotSelections[connector.slotId])}
						x1={connector.from.x}
						y1={connector.from.y}
						x2={connector.to.x}
						y2={connector.to.y}
					/>
					<circle
						class="assembly-terminal"
						class:assembly-terminal--active={activeSlotId === connector.slotId}
						class:assembly-terminal--filled={Boolean(slotSelections[connector.slotId])}
						cx={connector.to.x}
						cy={connector.to.y}
						r="2.5"
					/>
				{/each}
			</svg>
		{/if}

		<div class="assembly-board__part-wrap">
			{#if partImage}
				<img
					class="assembly-board__part"
					bind:this={partEl}
					src={partImage}
					alt=""
					width="96"
					height="96"
					loading="lazy"
					decoding="async"
					onload={scheduleMeasure}
				/>
			{:else}
				<div
					class="assembly-board__part assembly-board__part--fallback"
					bind:this={partEl}
					aria-hidden="true"
				></div>
			{/if}

			<svg
				class="assembly-board__hotspots"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				aria-hidden="true"
				data-testid="assembly-hotspots"
			>
				{#each schematic.slots as slot, index (slot.id)}
					{@const layout = assemblySlotLayout(schematic.id, slot.id, index)}
					<circle
						class="assembly-hotspot"
						class:assembly-hotspot--filled={Boolean(slotSelections[slot.id])}
						class:assembly-hotspot--active={activeSlotId === slot.id}
						cx={layout.anchor.x * 100}
						cy={layout.anchor.y * 100}
						r={layout.radius * 100}
						data-testid="assembly-hotspot-{slot.id}"
					/>
				{/each}
			</svg>
		</div>

		{#each schematic.slots as slot, index (slot.id)}
			{@const selectedId = slotSelections[slot.id]}
			{@const selectedStack = stackForSelection(selectedId)}
			{@const containerImage = familyContainerImage(slot.requiredFamily)}
			{@const layout = assemblySlotLayout(schematic.id, slot.id, index)}
			<div class="assembly-board__connector assembly-board__connector--{layout.placement}">
				<button
					type="button"
					class="assembly-slot"
					class:assembly-slot--active={activeSlotId === slot.id}
					class:assembly-slot--filled={Boolean(selectedStack)}
					data-testid="assembly-slot-{slot.id}"
					aria-pressed={activeSlotId === slot.id}
					aria-label="{slot.displayName}: {selectedStack
						? selectedStack.displayName
						: `Empty — needs ${familyDisplayLabel(slot.requiredFamily)}`}"
					onclick={(event) => onSlotClick(slot.id, event.currentTarget as HTMLButtonElement)}
				>
					{#if containerImage}
						<img
							class="assembly-slot__crate"
							class:assembly-slot__crate--dim={!selectedStack}
							src={containerImage}
							alt=""
							width="52"
							height="52"
							loading="lazy"
							decoding="async"
						/>
					{/if}
					<span class="assembly-slot__label">{slot.displayName}</span>
					{#if selectedStack}
						<span class="assembly-slot__fill">{selectedStack.displayName}</span>
					{:else}
						<span class="assembly-slot__empty">Empty</span>
						<span class="assembly-slot__family">{familyDisplayLabel(slot.requiredFamily)}</span>
					{/if}
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.assembly-board {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border-subtle);
	}

	.assembly-board__stage {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		grid-template-rows: auto auto;
		gap: 0.5rem 0.35rem;
		align-items: center;
		justify-items: center;
	}

	.assembly-board__wires {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		overflow: visible;
	}

	.assembly-wire {
		stroke: color-mix(in srgb, var(--phosphor-dim) 70%, transparent);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}

	.assembly-wire--filled {
		stroke: color-mix(in srgb, var(--phosphor) 55%, var(--phosphor-dim));
		stroke-dasharray: none;
	}

	.assembly-wire--active {
		stroke: var(--phosphor);
		stroke-width: 2;
		stroke-dasharray: none;
	}

	.assembly-terminal {
		fill: var(--phosphor-dim);
	}

	.assembly-terminal--filled,
	.assembly-terminal--active {
		fill: var(--phosphor);
	}

	.assembly-board__part-wrap {
		position: relative;
		z-index: 2;
		grid-column: 2;
		grid-row: 2;
		line-height: 0;
	}

	.assembly-board__part {
		display: block;
		width: 5.75rem;
		height: auto;
		object-fit: contain;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.assembly-board__part--fallback {
		width: 5.75rem;
		height: 5.75rem;
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.assembly-board__hotspots {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 3;
		overflow: visible;
	}

	.assembly-hotspot {
		fill: color-mix(in srgb, var(--phosphor-glow) 18%, transparent);
		stroke: var(--phosphor-dim);
		stroke-width: 1.25;
		vector-effect: non-scaling-stroke;
	}

	.assembly-hotspot--filled {
		fill: color-mix(in srgb, var(--phosphor-glow) 32%, transparent);
		stroke: color-mix(in srgb, var(--phosphor) 70%, var(--phosphor-dim));
	}

	.assembly-hotspot--active {
		fill: color-mix(in srgb, var(--phosphor-glow) 45%, transparent);
		stroke: var(--phosphor);
		stroke-width: 2;
	}

	.assembly-board__connector {
		position: relative;
		z-index: 4;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
	}

	.assembly-board__connector--top {
		grid-column: 2;
		grid-row: 1;
	}

	.assembly-board__connector--left {
		grid-column: 1;
		grid-row: 2;
	}

	.assembly-board__connector--right {
		grid-column: 3;
		grid-row: 2;
	}

	.assembly-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		width: 100%;
		max-width: 6.5rem;
		padding: 0.35rem 0.3rem 0.45rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		text-align: center;
	}

	.assembly-slot:hover {
		border-color: var(--phosphor-dim);
	}

	.assembly-slot--active {
		border-color: var(--phosphor);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--phosphor) 35%, transparent);
	}

	.assembly-slot--filled {
		border-color: color-mix(in srgb, var(--phosphor) 55%, var(--border-subtle));
	}

	.assembly-slot__crate {
		width: 3.25rem;
		height: auto;
		object-fit: contain;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.assembly-slot__crate--dim {
		opacity: 0.45;
		filter: grayscale(0.35);
	}

	.assembly-slot__label {
		font-size: 0.62rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		line-height: 1.2;
	}

	.assembly-slot__empty {
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.assembly-slot__family {
		font-size: 0.62rem;
		color: var(--text-secondary);
		line-height: 1.2;
	}

	.assembly-slot__fill {
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		line-height: 1.2;
		word-break: break-word;
	}
</style>
