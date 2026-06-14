<script lang="ts">
	import { enhance } from '$app/forms';
	import EnergyBar from '$lib/field/EnergyBar.svelte';
	import FieldMap from '$lib/field/FieldMap.svelte';
	import SampleResultPanel from '$lib/field/SampleResultPanel.svelte';
	import SegmentedBar from '$lib/field/SegmentedBar.svelte';
	import { FIELD_FAMILY_OPTIONS } from '$lib/field/constants';
	import ActiveRunPanel from '$lib/rig/ActiveRunPanel.svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const activeClaimView = $derived(
		data.claimView?.mode === 'claimable' || data.claimView?.mode === 'result'
			? data.claimView
			: null
	);

	let sampleResultEl: HTMLElement | undefined = $state();
	let localSamplePercent = $state(0);

	const sampleHint = $derived(
		(form as { sampleFlash?: string } | null)?.sampleFlash ?? data.sampleFlash
	);
	const mapFlash = $derived((form as { mapFlash?: string } | null)?.mapFlash ?? null);
	const mapFlashKey = $derived(
		(form as { mapFlashKey?: number } | null)?.mapFlashKey ?? null
	);

	$effect(() => {
		if (!data.lastSampleResult || !sampleResultEl) return;
		sampleResultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	});

	$effect(() => {
		const pending = data.pendingSampleProgress;
		if (!pending) {
			localSamplePercent = 0;
			return;
		}

		const startedAtMs = new Date(pending.startedAt).getTime();
		const completesAtMs = new Date(pending.completesAt).getTime();
		const totalMs = completesAtMs - startedAtMs;

		const tick = () => {
			const elapsedMs = Date.now() - startedAtMs;
			localSamplePercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
		};

		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});
</script>

<section class="screen" aria-label="Field console">
	<header class="field-header">
		<h1 class="field-header__title">FIELD — {data.activeBloomName}</h1>
		<div class="field-header__energy">
			<EnergyBar
				energy={data.surveyEnergy}
				cap={data.surveyEnergyCap}
				outlook={data.surveyEnergyOutlook}
				compact
			/>
		</div>
	</header>

	{#if data.missionTicker}
		<p class="order-ticker" aria-live="polite">ORDER: {data.missionTicker}</p>
	{/if}

	{#if form?.message}
		<p class="flash flash--error" role="alert">{form.message}</p>
	{/if}

	{#if data.showRigView && data.rigView}
		<ActiveRunPanel
			run={data.rigView}
			claimView={activeClaimView}
			variant="field"
			showAscii
			acknowledgeButtonLabel="Send to storage — return to field"
		/>
	{:else}
		<div class="screen__body">
			{#if data.fieldModeLine}
				<p class="field-mode-line">{data.fieldModeLine}</p>
			{/if}
			<section class="panel">
				<h2 class="panel__title">Resource family</h2>
				<div class="action-rows">
					{#each FIELD_FAMILY_OPTIONS as family (family.id)}
						<form method="POST" action="?/selectFamily" use:enhance>
							<input type="hidden" name="family" value={family.id} />
							<button
								type="submit"
								class="action-row"
								class:action-row--active={data.selectedFamily === family.id}
							>
								{family.label}
							</button>
						</form>
					{/each}
				</div>

				{#if !data.hasFamilyScan}
					<form method="POST" action="?/scanFamily" use:enhance class="inline-action">
						<input type="hidden" name="family" value={data.selectedFamily} />
						<button type="submit" class="action-row action-row--primary">Scan family</button>
					</form>
				{/if}
			</section>

			{#if data.hasFamilyScan && data.resources.length > 0}
				<section class="panel">
					<h2 class="panel__title">Live signals</h2>
					<div class="action-rows">
						{#each data.resources as resource (resource.resourceInstanceId)}
							<form method="POST" action="?/selectResource" use:enhance>
								<input type="hidden" name="resourceInstanceId" value={resource.resourceInstanceId} />
								<button
									type="submit"
									class="action-row"
									class:action-row--active={data.session.resourceInstanceId ===
										resource.resourceInstanceId}
								>
									{resource.displayName}
									{#if resource.recommendLabel}
										<span class="tag">{resource.recommendLabel}</span>
									{/if}
								</button>
								{#if !resource.statsVisible}
									<p class="hint hint--free-sample">first sample free — reveals stats</p>
								{/if}
							</form>
						{/each}
					</div>
				</section>
			{/if}

			{#if data.mapView}
				<section class="panel">
					<FieldMap map={data.mapView} {mapFlash} {mapFlashKey} />

					<div class="field-controls">
						<form method="POST" action="?/scan" use:enhance>
							<button type="submit" class="action-row">Scan here</button>
						</form>

						<div class="move-pad" aria-label="Move">
							<form method="POST" action="?/move" use:enhance>
								<input type="hidden" name="direction" value="north" />
								<button type="submit" class="action-row">↑</button>
							</form>
							<div class="move-pad__middle">
								<form method="POST" action="?/move" use:enhance>
									<input type="hidden" name="direction" value="west" />
									<button type="submit" class="action-row">←</button>
								</form>
								<form method="POST" action="?/move" use:enhance>
									<input type="hidden" name="direction" value="east" />
									<button type="submit" class="action-row">→</button>
								</form>
							</div>
							<form method="POST" action="?/move" use:enhance>
								<input type="hidden" name="direction" value="south" />
								<button type="submit" class="action-row">↓</button>
							</form>
						</div>

						<form method="POST" action="?/sample" use:enhance>
							<button
								type="submit"
								class="action-row action-row--primary"
								disabled={data.pendingSampleProgress !== null ||
									!data.surveyEnergyOutlook.canSampleNow}
							>
								Sample here
							</button>
						</form>
						{#if data.handSamplesLeft}
							<p class="sample-pool-hint">
								Hand samples left here: {Math.max(
									0,
									data.handSamplesLeft.pool - data.handSamplesLeft.taken
								)}/{data.handSamplesLeft.pool}
							</p>
						{/if}
						{#if sampleHint}
							<p class="sample-hint" role="status">{sampleHint}</p>
						{/if}
						{#if !data.surveyEnergyOutlook.canSampleNow && !data.pendingSampleProgress}
							<p class="field-energy-hint">Not enough survey energy to sample here.</p>
						{/if}
					</div>

					{#if data.pendingSampleProgress}
						<div class="sample-progress panel-inset">
							<p>Sampling… {localSamplePercent}%</p>
							<SegmentedBar
								progressPercent={localSamplePercent}
								blinkActive={localSamplePercent < 100}
							/>
						</div>
					{/if}

					{#if data.lastSampleResult}
						<div bind:this={sampleResultEl}>
							<SampleResultPanel
								resourceDisplayName={data.lastSampleResult.resourceDisplayName}
								trickleQuantity={data.lastSampleResult.trickleQuantity}
								trueConcentrationPercent={data.lastSampleResult.trueConcentrationPercent}
								energyCost={data.lastSampleResult.energyCost}
								surveyEnergyAfter={data.lastSampleResult.surveyEnergyAfter}
								surveyEnergyCap={data.lastSampleResult.surveyEnergyCap}
								statsRevealedThisSample={data.lastSampleResult.statsRevealedThisSample}
								yieldBandLabel={data.lastSampleResult.yieldBandLabel}
								stats={data.lastSampleResult.stats}
								orderStatusLine={data.lastSampleResult.orderStatusLine}
							/>
						</div>
					{/if}
				</section>
			{/if}

			{#if data.waypoints.length > 0}
				<section class="panel">
					<h2 class="panel__title">Waypoints</h2>
					<div class="action-rows">
						{#each data.waypoints as waypoint (waypoint.spotId)}
							<form method="POST" action="?/goToWaypoint" use:enhance>
								<input type="hidden" name="resourceInstanceId" value={waypoint.resourceInstanceId} />
								<input type="hidden" name="spotId" value={waypoint.spotId} />
								<button type="submit" class="action-row">
									{waypoint.displayName}: ~{waypoint.remainingUnits}u left
								</button>
							</form>
						{/each}
					</div>
				</section>
			{/if}

			{#if data.deployContext}
				<section class="panel">
					<h2 class="panel__title">Deploy thumper</h2>
					<p class="hint">
						{data.deployContext.displayName} @ {data.deployContext.trueConcentrationPercent}% · ~{data
							.deployContext.spotRemainingUnits}u in deposit (thumper extraction)
					</p>
					{#if data.deployContext.thumpTargetNote}
						<p class="deploy-thump-target">{data.deployContext.thumpTargetNote}</p>
					{/if}
					{#if data.deployContext.sameWaypointDeployHint}
						<p class="deploy-waypoint-hint">{data.deployContext.sameWaypointDeployHint}</p>
					{/if}
					{#if data.deployContext.hullDeployWarning}
						<p class="deploy-hull-warning">{data.deployContext.hullDeployWarning}</p>
					{/if}
					{#if data.deployContext.canDeploy}
						<form method="POST" action="?/deploy" use:enhance>
							<input
								type="hidden"
								name="resourceInstanceId"
								value={data.deployContext.resourceInstanceId}
							/>
							<input type="hidden" name="spotId" value={data.deployContext.spotId} />
							<div class="action-rows">
								{#each data.deployContext.tailOptions as tail (tail.id)}
									<button
										type="submit"
										name="tailMinutes"
										value={tail.minutes}
										class="action-row"
									>
										{tail.label} — ~{data.deployContext.scriptedRecoveryUnits ??
											data.deployContext.deployPreview.projectedRecovery}u
									</button>
								{/each}
							</div>
						</form>
					{:else if data.deployContext.deployBlockedReason}
						<p class="deploy-blocked">{data.deployContext.deployBlockedReason}</p>
					{:else if data.deployContext.tailOptions.length === 0}
						<p class="deploy-blocked">
							Hull integrity too low for any run duration — patch or craft a better hull
						</p>
					{/if}
				</section>
			{/if}
		</div>
	{/if}
</section>

<style>
	.field-header {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem 1.25rem;
		margin: 0;
		margin-bottom: 1rem;
		padding: var(--screen-padding);
		padding-bottom: 0.85rem;
		background: var(--bg-base);
		border-bottom: 1px solid var(--border-default);
	}

	.field-header__title {
		margin: 0;
		flex: 1 1 12rem;
		min-width: 0;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.field-header__energy {
		flex: 1 1 14rem;
		width: 100%;
		max-width: 20rem;
	}

	.order-ticker {
		margin: 0 0 0.75rem;
		padding: 0.3rem 0.5rem;
		font-size: var(--font-size-xs);
		font-family: var(--font-mono);
		color: var(--text-secondary);
		border-left: 2px solid var(--phosphor-dim);
		letter-spacing: 0.04em;
	}

	.panel {
		padding: 1rem;
		margin-bottom: 1rem;
		background: var(--bg-panel);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.panel__title {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.action-rows {
		display: grid;
		gap: 0.5rem;
	}

	.inline-action {
		margin-top: 1.25rem;
	}

	.action-row {
		width: 100%;
		text-align: left;
		padding: 0.55rem 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.action-row:hover:not(:disabled) {
		background: var(--bg-hover);
		border-color: var(--border-strong);
	}

	.action-row--active {
		border-color: var(--phosphor);
		color: var(--text-bright);
	}

	.action-row--primary {
		color: var(--phosphor);
		border-color: var(--phosphor-dim);
	}

	.action-row:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-controls {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.75rem;
		align-items: center;
		margin-top: 1rem;
	}

	.move-pad {
		display: grid;
		gap: 0.25rem;
		justify-items: center;
	}

	.move-pad__middle {
		display: flex;
		gap: 0.25rem;
	}

	.move-pad .action-row {
		width: 2.5rem;
		text-align: center;
		padding-inline: 0;
	}

	.sample-pool-hint,
	.sample-hint {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.sample-hint {
		color: var(--phosphor-dim);
	}

	.deploy-hull-warning {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.hint {
		margin: 0.25rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.hint--free-sample {
		color: var(--phosphor-dim);
		font-style: italic;
	}

	.field-energy-hint {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.deploy-blocked {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--accent-warning);
	}

	.field-mode-line {
		margin: 0 0 1rem;
		padding: 0.65rem 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		border-left: 2px solid var(--phosphor-dim);
		line-height: 1.45;
	}

	.deploy-thump-target,
	.deploy-waypoint-hint {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--phosphor-dim);
	}

	.deploy-waypoint-hint {
		color: var(--accent-warning);
	}

	.tag {
		margin-left: 0.5rem;
		color: var(--accent-warning);
		font-size: var(--font-size-xs);
	}

	.flash {
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-sm);
		margin-bottom: 1rem;
	}

	.flash--error {
		background: var(--accent-danger-dim);
		color: #ffd0d0;
	}
</style>
