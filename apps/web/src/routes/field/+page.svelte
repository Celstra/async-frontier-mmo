<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import EnergyBar from '$lib/field/EnergyBar.svelte';
	import FieldMap from '$lib/field/FieldMap.svelte';
	import SampleResultPanel from '$lib/field/SampleResultPanel.svelte';
	import SegmentedBar from '$lib/field/SegmentedBar.svelte';
	import { FIELD_FAMILY_OPTIONS } from '$lib/field/constants';
	import ThumperAsciiPre from '$lib/rig/ThumperAsciiPre.svelte';
	import { buildThumperAscii } from '$lib/rig/thumperAscii';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	let sampleResultEl: HTMLElement | undefined = $state();
	let localSamplePercent = $state(0);
	let localSecondsRemaining = $state(0);
	let localDrainPercent = $state(0);

	const sampleHint = $derived(
		(form as { sampleFlash?: string } | null)?.sampleFlash ?? data.sampleFlash
	);
	const mapFlash = $derived((form as { mapFlash?: string } | null)?.mapFlash ?? null);
	const mapFlashKey = $derived(
		(form as { mapFlashKey?: number } | null)?.mapFlashKey ?? null
	);

	function formatMmSs(totalSeconds: number): string {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

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

	$effect(() => {
		const rig = data.rigView;
		if (!rig?.thumperDemo || rig.runDurationSeconds <= 0) {
			localSecondsRemaining = 0;
			localDrainPercent = 0;
			return;
		}

		const loadedAtMs = new Date(rig.loadedAt).getTime();
		const initialRemaining = rig.thumperDemo.secondsRemaining;
		const totalSeconds = rig.runDurationSeconds;

		const tick = () => {
			const elapsedSeconds = (Date.now() - loadedAtMs) / 1000;
			localSecondsRemaining = Math.max(0, Math.ceil(initialRemaining - elapsedSeconds));
			const elapsedTotal = totalSeconds - localSecondsRemaining;
			localDrainPercent = Math.min(100, (elapsedTotal / totalSeconds) * 100);
		};

		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const resolvedEventWindows = $derived(
		data.rigView?.eventWindows.filter((window) => !window.quiet && window.responded) ?? []
	);
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
		<div class="rig-view panel">
			{#if data.claimView?.mode === 'claimable'}
				<div class="claim-panel claim-panel--top">
					<form method="POST" action="?/claim" use:enhance>
						<button type="submit" class="action-row action-row--primary">Claim yield</button>
					</form>
				</div>
			{:else if data.claimView?.mode === 'result'}
				<div class="claim-result panel-inset claim-panel claim-panel--top">
					{#if data.claimView.tutorialRecallBannerLine}
						<p class="claim-result__banner claim-result__banner--verbatim">
							{data.claimView.tutorialRecallBannerLine}
						</p>
					{:else}
						<p class="claim-result__banner">RIG SECURED</p>
						<p>{data.claimView.explanation.summary}</p>
						<p>{data.claimView.claimResult.recoveredQuantity}u recovered</p>
					{/if}
					{#if data.claimView.tutorialComparisonLine}
						<p class="claim-result__comparison">{data.claimView.tutorialComparisonLine}</p>
					{/if}
					<form method="POST" action="?/acknowledgeClaim" use:enhance class="claim-ack">
						<input type="hidden" name="thumperRunId" value={data.claimView.runId} />
						<button type="submit" class="action-row action-row--primary">
							Send to storage — return to field
						</button>
					</form>
				</div>
			{/if}

			<ThumperAsciiPre art={deployedThumperAscii} />

			<div class="rig-timer">
				<SegmentedBar
					progressPercent={localDrainPercent}
					direction="drain"
					blinkActive={localSecondsRemaining > 0}
				/>
				<p class="rig-timer__clock">
					{localSecondsRemaining > 0 ? formatMmSs(localSecondsRemaining) : '0:00'} remaining
				</p>
			</div>

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
						<p class="event-window__title">
							{window.complication?.replaceAll('_', ' ')}
							{#if window.severity}
								<span class="event-window__severity">{window.severity}</span>
							{/if}
						</p>
						{#if window.matchingActionLabel}
							<p class="event-window__match">Best match: {window.matchingActionLabel}</p>
						{/if}
						<div class="action-rows">
							{#each window.responseOptions as option (option.id)}
								<form method="POST" action="?/respondEventWindow" use:enhance>
									<input type="hidden" name="windowIndex" value={window.windowIndex} />
									<input type="hidden" name="chosenResponse" value={option.id} />
									<button type="submit" disabled={!option.enabled} class="action-row event-option">
										<span class="event-option__label">{option.label}</span>
										{#if option.effectLine}
											<span class="event-option__effect">{option.effectLine}</span>
										{/if}
										{#if !option.enabled && option.disabledReason}
											<span class="event-option__disabled">{option.disabledReason}</span>
										{/if}
									</button>
								</form>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#if resolvedEventWindows.length > 0}
				<div class="event-log panel-inset">
					<p class="event-log__title">Run log</p>
					{#each resolvedEventWindows as window (window.windowIndex)}
						<div class="event-log__entry">
							<p class="event-log__headline">
								{window.complication?.replaceAll('_', ' ')}
								{#if window.chosenResponse}
									· {window.responseOptions.find((option) => option.id === window.chosenResponse)
										?.label ?? window.chosenResponse}
								{/if}
							</p>
							{#if window.outcomeLine}
								<p class="event-log__outcome">{window.outcomeLine}</p>
							{/if}
						</div>
					{/each}
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
								{#if !resource.statsVisible}
									<p class="hint hint--free-sample">first sample free — reveals stats</p>
								{/if}
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
										{tail.label} — ~{data.deployContext.deployPreview.projectedRecovery}u
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

	.rig-timer {
		margin: 0.75rem 0 1rem;
	}

	.rig-timer__clock {
		margin: 0.35rem 0 0;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		text-align: center;
	}

	.event-window__title {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--text-bright);
		text-transform: capitalize;
	}

	.event-window__severity {
		margin-left: 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		text-transform: uppercase;
	}

	.event-window__match {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.event-option {
		display: grid;
		gap: 0.2rem;
	}

	.event-option__label {
		color: var(--text-bright);
	}

	.event-option__effect {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.event-option__disabled {
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.event-log__title {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.event-log__entry + .event-log__entry {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.event-log__headline {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: capitalize;
	}

	.event-log__outcome {
		margin: 0.2rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--phosphor-dim);
	}

	.deploy-hull-warning {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.claim-ack {
		margin-top: 0.75rem;
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

	.claim-panel {
		margin-bottom: 1rem;
	}

	.claim-panel--top {
		margin-bottom: 1.25rem;
	}

	.claim-result__banner {
		margin: 0 0 0.5rem;
		font-weight: 700;
		color: var(--accent-warning);
		letter-spacing: 0.06em;
	}

	.claim-result__banner--verbatim {
		font-weight: 500;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.45;
		letter-spacing: normal;
		color: var(--text-bright);
	}

	.claim-result__comparison {
		margin: 0.75rem 0 0;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border-subtle);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
	}
</style>
