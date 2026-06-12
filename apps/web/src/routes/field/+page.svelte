<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import EnergyBar from '$lib/field/EnergyBar.svelte';
	import FieldMap from '$lib/field/FieldMap.svelte';
	import SampleResultPanel from '$lib/field/SampleResultPanel.svelte';
	import { FIELD_FAMILY_OPTIONS } from '$lib/field/constants';
	import ThumperAsciiPre from '$lib/rig/ThumperAsciiPre.svelte';
	import { buildThumperAscii } from '$lib/rig/thumperAscii';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	let sampleResultEl: HTMLElement | undefined = $state();

	const deployedThumperAscii = $derived.by(() => {
		if (!data.rigView) return '';

		const target = data.rigView.openRun.targetDisplayName.slice(0, 18);
		const hullPct = data.rigView.runHullCondition;
		const threat = data.rigView.runMeters?.threatPressure ?? 0;

		return buildThumperAscii({
			mode: 'deployed',
			showProspectorScale: false,
			header: target,
			hull: { equipped: true, label: 'HULL' },
			drill: { equipped: true, label: 'DRILL' },
			pump: { equipped: true, label: 'PUMP' },
			footer: `HULL ${hullPct}% · THREAT ${threat}%`
		});
	});

	$effect(() => {
		if (!data.shouldPoll) return;
		const id = setInterval(() => {
			void invalidateAll();
		}, 3000);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (!data.lastSampleResult || !sampleResultEl) return;
		sampleResultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

	{#if form?.message}
		<p class="flash flash--error" role="alert">{form.message}</p>
	{:else if data.sampleFlash}
		<p class="flash flash--error" role="alert">{data.sampleFlash}</p>
	{/if}

	{#if data.showRigView && data.rigView}
		<div class="rig-view panel">
			<ThumperAsciiPre art={deployedThumperAscii} />

			{#if data.rigView.runMeters}
				<ul class="meter-list">
					<li>Recovery ~{data.rigView.runMeters.projectedRecovery}u</li>
					<li>Signal lock {data.rigView.runMeters.signalLock}%</li>
					<li>Pump flow {data.rigView.runMeters.pumpFlow}%</li>
				</ul>
			{/if}

			{#each data.rigView.eventWindows as window (window.windowIndex)}
				{#if !window.quiet && !window.responded}
					<div class="event-window panel-inset">
						<p class="event-window__title">Event window {window.windowIndex}</p>
						<p>{window.complication?.replaceAll('_', ' ')}</p>
						<div class="action-rows">
							{#each window.responseOptions as option (option.id)}
								<form method="POST" action="?/respondEventWindow" use:enhance>
									<input type="hidden" name="windowIndex" value={window.windowIndex} />
									<input type="hidden" name="chosenResponse" value={option.id} />
									<button type="submit" disabled={!option.enabled} class="action-row">
										{option.label}
									</button>
								</form>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#if data.claimView?.mode === 'claimable'}
				<form method="POST" action="?/claim" use:enhance>
					<button type="submit" class="action-row action-row--primary">Claim yield</button>
				</form>
			{:else if data.claimView?.mode === 'result'}
				<div class="claim-result panel-inset">
					<p class="claim-result__banner">RIG SECURED</p>
					<p>{data.claimView.explanation.summary}</p>
					<p>{data.claimView.claimResult.recoveredQuantity}u recovered</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="screen__body">
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
									{#if resource.recommended}
										<span class="tag">recommended</span>
									{/if}
								</button>
								{#if resource.teachingNote}
									<p class="hint">{resource.teachingNote}</p>
								{/if}
							</form>
						{/each}
					</div>
				</section>
			{/if}

			{#if data.mapView}
				<section class="panel">
					<FieldMap map={data.mapView} />

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
						{#if !data.surveyEnergyOutlook.canSampleNow && !data.pendingSampleProgress}
							<p class="field-energy-hint">Not enough survey energy to sample here.</p>
						{/if}
					</div>

					{#if data.pendingSampleProgress}
						<div class="sample-progress panel-inset">
							<p>Sampling… {data.pendingSampleProgress.progressPercent}%</p>
							<div class="sample-progress__bar">
								<div
									class="sample-progress__fill"
									style:width="{data.pendingSampleProgress.progressPercent}%"
								></div>
							</div>
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
							.deployContext.spotRemainingUnits}u in deposit
					</p>
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
										{tail.label} — ~{data.deployContext.deployPreview.projectedRecovery}u
									</button>
								{/each}
							</div>
						</form>
					{:else if data.deployContext.deployBlockedReason}
						<p class="deploy-blocked">{data.deployContext.deployBlockedReason}</p>
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

	.sample-progress__bar {
		height: 0.5rem;
		background: var(--bg-inset);
		border-radius: 999px;
		overflow: hidden;
	}

	.sample-progress__fill {
		height: 100%;
		background: var(--phosphor);
		transition: width 0.3s ease;
	}

	.hint {
		margin: 0.25rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
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

	.meter-list {
		margin: 0 0 1rem;
		padding-left: 1.1rem;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.claim-result__banner {
		margin: 0 0 0.5rem;
		font-weight: 700;
		color: var(--accent-warning);
		letter-spacing: 0.06em;
	}
</style>
