<script lang="ts">
	import type {
		SchematicDefinition,
		SchematicSlotDefinition,
		SchematicSlotReadiness
	} from '@async-frontier-mmo/domain';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import { familyContainerImage } from './schematicArt';
	import SlotSelector from './SlotSelector.svelte';
	import { buildSlotFitContext, buildSlotPickerHint } from './slotFitHints';
	import { postWorkshopUxTelemetry } from './postWorkshopUxTelemetry';

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
		slot: SchematicSlotDefinition;
		stacks: InventoryStack[];
		allSlotSelections: Record<string, string>;
		selectedInstanceId: string | null;
		slotReadiness?: SchematicSlotReadiness;
		returnFocus?: HTMLElement | null;
		onSelect: (instanceId: string) => void;
		onClose: () => void;
	}

	let {
		schematic,
		slot,
		stacks,
		allSlotSelections,
		selectedInstanceId,
		slotReadiness,
		returnFocus = null,
		onSelect,
		onClose
	}: Props = $props();

	const containerImage = $derived(familyContainerImage(slot.requiredFamily));
	const titleId = $derived(`resource-picker-${slot.id}`);
	const slotFitContext = $derived(buildSlotFitContext(schematic, slot.id));
	const slotPickerHint = $derived(buildSlotPickerHint(slotFitContext));

	let panelEl = $state<HTMLDivElement | null>(null);
	let closeButtonEl = $state<HTMLButtonElement | null>(null);

	function focusableElements(container: HTMLElement): HTMLElement[] {
		return Array.from(
			container.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	function closePicker(): void {
		const restoreTarget = returnFocus;
		onClose();
		queueMicrotask(() => restoreTarget?.focus());
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closePicker();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closePicker();
		}
	}

	function handlePanelKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab' || !panelEl) return;

		const focusable = focusableElements(panelEl);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleSelect(instanceId: string) {
		onSelect(instanceId);
		closePicker();
	}

	$effect(() => {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});

	$effect(() => {
		const panel = panelEl;
		if (!panel) return;

		queueMicrotask(() => {
			const focusable = focusableElements(panel);
			(focusable[0] ?? closeButtonEl)?.focus();
		});

		const onKeyDown = (event: KeyboardEvent) => handlePanelKeydown(event);
		panel.addEventListener('keydown', onKeyDown);
		return () => panel.removeEventListener('keydown', onKeyDown);
	});

	let slotHintTelemetrySent = $state(false);

	$effect(() => {
		if (slotHintTelemetrySent || !slotPickerHint) return;
		slotHintTelemetrySent = true;
		void postWorkshopUxTelemetry('slot_hint_seen', {
			schematicId: schematic.id,
			slotId: slot.id
		});
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="resource-picker"
	role="presentation"
	data-testid="resource-slot-picker"
	onclick={handleBackdropClick}
>
	<div
		bind:this={panelEl}
		class="resource-picker__panel panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
	>
		<header class="resource-picker__header">
			<div class="resource-picker__heading">
				{#if containerImage}
					<img
						class="resource-picker__crate"
						src={containerImage}
						alt=""
						width="56"
						height="56"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				<div>
					<p class="resource-picker__eyebrow">Load material</p>
					<h2 id={titleId} class="resource-picker__title">{slot.displayName}</h2>
					<p class="resource-picker__family">
						{familyDisplayLabel(slot.requiredFamily)} · ×{slot.inputQuantity}
					</p>
				</div>
			</div>
			<button
				type="button"
				class="resource-picker__close"
				bind:this={closeButtonEl}
				onclick={closePicker}
			>
				Close
			</button>
		</header>

		<p class="resource-picker__help" data-testid="slot-fit-picker-hint">
			{slotPickerHint}
		</p>

		<div class="resource-picker__body">
			<SlotSelector
				{schematic}
				{slot}
				{stacks}
				{allSlotSelections}
				{selectedInstanceId}
				onSelect={handleSelect}
				{slotReadiness}
			/>
		</div>
	</div>
</div>

<style>
	.resource-picker {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 0;
		background: rgba(4, 6, 4, 0.82);
	}

	.resource-picker__panel {
		display: flex;
		flex-direction: column;
		width: min(100%, 40rem);
		max-height: min(88vh, 44rem);
		margin: 0;
		border: 1px solid var(--phosphor-dim);
		border-bottom: none;
		border-radius: var(--radius-md) var(--radius-md) 0 0;
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
		background: var(--bg-panel);
	}

	.resource-picker__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1rem 0.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.resource-picker__heading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.resource-picker__crate {
		flex-shrink: 0;
		width: 3.5rem;
		height: auto;
		object-fit: contain;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.resource-picker__eyebrow {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.resource-picker__title {
		margin: 0.15rem 0 0;
		font-size: var(--font-size-md);
		color: var(--phosphor);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.resource-picker__family {
		margin: 0.2rem 0 0;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.resource-picker__close {
		flex-shrink: 0;
		padding: 0.35rem 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
		color: var(--text-secondary);
		font-family: inherit;
		font-size: var(--font-size-xs);
		cursor: pointer;
	}

	.resource-picker__close:hover {
		border-color: var(--phosphor-dim);
		color: var(--text-primary);
	}

	.resource-picker__help {
		margin: 0;
		padding: 0.65rem 1rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.45;
		border-bottom: 1px solid var(--border-subtle);
	}

	.resource-picker__body {
		overflow: auto;
		padding: 0 1rem 1rem;
	}

	.resource-picker__body :global(.slot-selector) {
		margin: 0.75rem 0 0;
	}

	@media (min-width: 640px) {
		.resource-picker {
			align-items: center;
			padding: 1.5rem;
		}

		.resource-picker__panel {
			border-bottom: 1px solid var(--phosphor-dim);
			border-radius: var(--radius-md);
			max-height: min(85vh, 42rem);
		}
	}
</style>
