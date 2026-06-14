<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		hullIntegrityAdvisoryLine,
		type ChassisAssemblyReadiness,
		type OwnedThumperPart
	} from '@async-frontier-mmo/domain';
	import SchematicDiagram from './SchematicDiagram.svelte';

	interface Props {
		title: string;
		description: string;
		readiness: ChassisAssemblyReadiness;
		thumperParts: OwnedThumperPart[];
		selections: Partial<Record<'hull' | 'drill' | 'pump', string>>;
		rigAssembled?: boolean;
		/** Tutorial first_deploy only — locked Keth waypoint deploy prompt. */
		firstDeployPrompt?: boolean;
	}

	let {
		title,
		description,
		readiness,
		thumperParts,
		selections,
		rigAssembled = false,
		firstDeployPrompt = false
	}: Props = $props();

	let activeSlot = $state<'hull' | 'drill' | 'pump' | null>(null);
	let localSelections = $state<Partial<Record<'hull' | 'drill' | 'pump', string>>>({});

	$effect(() => {
		localSelections = { ...selections };
	});

	function candidatesFor(slotId: 'hull' | 'drill' | 'pump'): OwnedThumperPart[] {
		return readiness.slots.find((slot) => slot.slotId === slotId)?.candidates ?? [];
	}

	function selectedPart(slotId: 'hull' | 'drill' | 'pump'): OwnedThumperPart | null {
		const itemId = localSelections[slotId];
		if (!itemId) return null;
		return thumperParts.find((part) => part.itemId === itemId) ?? null;
	}

	function canAssemble(): boolean {
		return (
			Boolean(localSelections.hull) &&
			Boolean(localSelections.drill) &&
			Boolean(localSelections.pump)
		);
	}
</script>

<div class="chassis panel">
	<SchematicDiagram
		{title}
		slots={readiness.slots.map((slot) => ({ id: slot.slotId, displayName: slot.displayName }))}
		activeSlotId={activeSlot}
		variant="chassis"
		assemblySlots={{
			hull: {
				equipped: Boolean(localSelections.hull),
				label: selectedPart('hull')?.displayName ?? null
			},
			drill: {
				equipped: Boolean(localSelections.drill),
				label: selectedPart('drill')?.displayName ?? null
			},
			pump: {
				equipped: Boolean(localSelections.pump),
				label: selectedPart('pump')?.displayName ?? null
			}
		}}
	/>

	<p class="chassis__description">{description}</p>

	{#if rigAssembled}
		<p class="chassis__success" role="status">
			{#if firstDeployPrompt}
				Rig assembled — head to FIELD and deploy on the locked Keth Iron waypoint.
			{:else}
				Rig assembled — head to FIELD when you are ready to deploy.
			{/if}
		</p>
	{:else if !readiness.assemblableNow}
		<div class="chassis__blockers" role="alert">
			<p class="chassis__blockers-label">Can't assemble yet</p>
			<ul>
				{#each readiness.blockers as blocker}
					<li>{blocker}</li>
				{/each}
			</ul>
			<p class="chassis__hint">Complete the fabricator milestone at SETTLEMENT to receive worn parts.</p>
		</div>
	{:else}
		<form method="POST" action="?/assembleRig" use:enhance class="chassis__form">
			{#each readiness.slots as slot (slot.slotId)}
				{@const selected = selectedPart(slot.slotId)}
				<section class="socket">
					<button
						type="button"
						class="socket__header"
						class:socket__header--active={activeSlot === slot.slotId}
						onclick={() => (activeSlot = activeSlot === slot.slotId ? null : slot.slotId)}
					>
						<span class="socket__label">{slot.displayName}</span>
						{#if selected}
							<span class="socket__picked">
								{selected.displayName} · condition {selected.condition}% · integrity
								{selected.integrity}%
								{#if slot.slotId === 'hull'}
									{@const hullAdvisory = hullIntegrityAdvisoryLine(selected.integrity)}
									{#if hullAdvisory}
										<span class="socket__hull-advisory"> · {hullAdvisory}</span>
									{/if}
								{/if}
							</span>
						{:else}
							<span class="socket__empty">Pick a part</span>
						{/if}
					</button>

					{#if activeSlot === slot.slotId}
						<ul class="socket__candidates">
							{#each candidatesFor(slot.slotId) as part (part.itemId)}
								<li>
									<button
										type="button"
										class="candidate-row"
										class:candidate-row--selected={localSelections[slot.slotId] === part.itemId}
										onclick={() => {
											localSelections = { ...localSelections, [slot.slotId]: part.itemId };
											activeSlot = null;
										}}
									>
										<span>{part.displayName}</span>
										<span class="candidate-row__stats">
											condition {part.condition}% · integrity {part.integrity}%
											{#if slot.slotId === 'hull'}
												{@const hullAdvisory = hullIntegrityAdvisoryLine(part.integrity)}
												{#if hullAdvisory}
													<span class="candidate-row__hull-advisory"> · {hullAdvisory}</span>
												{/if}
											{/if}
										</span>
									</button>
								</li>
							{:else}
								<li class="socket__empty-list">No {slot.slotId} parts in inventory.</li>
							{/each}
						</ul>
					{/if}

					<input type="hidden" name="chassis_{slot.slotId}" value={localSelections[slot.slotId] ?? ''} />
				</section>
			{/each}

			<button type="submit" class="assemble-btn" disabled={!canAssemble()}>Assemble rig</button>
		</form>
	{/if}
</div>

<style>
	.chassis__description {
		margin: 0 0 1rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.chassis__success {
		margin: 0;
		padding: 0.75rem;
		border: 1px solid var(--phosphor-dim);
		border-radius: var(--radius-sm);
		color: var(--phosphor);
		font-size: var(--font-size-sm);
	}

	.chassis__blockers {
		padding: 0.75rem;
		border: 1px solid var(--accent-warning-dim);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.chassis__blockers-label {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent-warning);
	}

	.chassis__blockers ul {
		margin: 0 0 0.5rem;
		padding-left: 1.1rem;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.chassis__hint {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.chassis__form {
		display: grid;
		gap: 0.65rem;
	}

	.socket {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.socket__header {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.35rem 0.75rem;
		padding: 0.65rem 0.75rem;
		background: var(--bg-inset);
		border: none;
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
	}

	.socket__header--active,
	.socket__header:hover {
		background: var(--bg-hover);
	}

	.socket__label {
		color: var(--phosphor);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: var(--font-size-xs);
	}

	.socket__picked {
		color: var(--text-primary);
		font-size: var(--font-size-xs);
	}

	.socket__empty {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.socket__candidates {
		list-style: none;
		margin: 0;
		padding: 0.35rem;
		display: grid;
		gap: 0.35rem;
		background: var(--bg-panel);
	}

	.candidate-row {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.35rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
	}

	.candidate-row--selected {
		border-color: var(--phosphor);
	}

	.candidate-row__stats {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.socket__empty-list {
		padding: 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.assemble-btn {
		margin-top: 0.35rem;
		padding: 0.85rem 1rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		background: var(--phosphor);
		color: var(--bg-base);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.assemble-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
