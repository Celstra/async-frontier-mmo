<script lang="ts">
	import { familyDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const craftIdempotencyKey = crypto.randomUUID();

	function stacksForFamily(family: string) {
		return data.inventory.filter((stack) => stack.family === family);
	}

	function hintForStack(resourceInstanceId: string) {
		return data.allocationHints.find((hint) => hint.resourceInstanceId === resourceInstanceId);
	}

	function defaultStackForSlot(slotId: string, family: string): string {
		const stacks = stacksForFamily(family);
		if (slotId === 'conductive_core') {
			return stacks.find((stack) => stack.resourceSlug === 'veyrith_copper')?.resourceInstanceId ?? stacks[0]?.resourceInstanceId ?? '';
		}
		if (slotId === 'crystal_lens') {
			return stacks.find((stack) => stack.resourceSlug === 'pale_ember_crystal')?.resourceInstanceId ?? stacks[0]?.resourceInstanceId ?? '';
		}
		if (slotId === 'frame_mount') {
			return stacks.find((stack) => stack.resourceSlug === 'keth_iron')?.resourceInstanceId ?? stacks[0]?.resourceInstanceId ?? '';
		}
		return stacks[0]?.resourceInstanceId ?? '';
	}

	function selectedSlotValue(slotId: string, family: string): string {
		return data.slotSelections[slotId] ?? defaultStackForSlot(slotId, family);
	}

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);
	const equipOutcome = $derived(
		form && 'equipOutcome' in form ? form.equipOutcome : undefined
	);
	const equipThumperOutcome = $derived(
		form && 'equipThumperOutcome' in form ? form.equipThumperOutcome : undefined
	);
	const repairOutcome = $derived(
		form && 'repairOutcome' in form ? form.repairOutcome : undefined
	);

	function canRepairItem(condition: number, integrity: number): boolean {
		return data.fieldRepairKitCount > 0 && (condition < 100 || integrity < 100);
	}
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Crafting + Gear</h1>

<p>
	<small>
		Your resources' stats set what's possible. The schematic's weights decide which stats matter.
		Three tuning points let you choose where the quality goes.
	</small>
</p>

{#if form?.message}
	<p class="flash flash--error">{form.message}</p>
{/if}

<section class="inventory-panel">
	<h2>Owned resources</h2>
	{#if data.veyrithStack}
		<p>
			<strong>Veyrith Copper:</strong> {data.veyrithStack.quantity} units — conductivity
			{data.veyrithStack.stats.conductivity}, OQ {data.veyrithStack.stats.OQ}
		</p>
	{/if}
	{#if data.inventory.length === 0}
		<p>No stacks yet — claim a thumper run first.</p>
	{:else}
		<table class="comparison-table">
			<thead>
				<tr>
					<th>Resource</th>
					<th>Qty</th>
					<th>Key stats</th>
					<th>Best use (allocation moment)</th>
					<th>Also useful for</th>
				</tr>
			</thead>
			<tbody>
				{#each data.allocationHints as hint}
					<tr>
						<td>{hint.displayName}</td>
						<td>{hint.quantity}</td>
						<td>
							OQ {hint.stats.OQ}, Cond {hint.stats.conductivity}, Heat
							{hint.stats.heat_resistance}
						</td>
						<td>{hint.bestUse}</td>
						<td>{hint.otherUses.join('; ') || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<nav class="schematic-list">
	<h2>Schematics (MVP five)</h2>
	<ul>
		{#each data.schematics as schematic}
			<li>
				<a
					href="/craft?schematic={schematic.id}"
					aria-current={schematic.id === data.selectedSchematicId ? 'page' : undefined}
				>
					{schematic.displayName}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<section class="craft-panel">
	<h2>Craft {data.schematic.displayName}</h2>

	<form method="GET" action="/craft" class="preview-form">
		<input type="hidden" name="schematic" value={data.selectedSchematicId} />

		{#each data.schematic.slots as slot}
			<fieldset>
				<legend>{slot.displayName} ({familyDisplayLabel(slot.requiredFamily)}) — pick resource</legend>
				<select
					name="slot_{slot.id}"
					onchange={(event) => event.currentTarget.form?.requestSubmit()}
				>
					<option value="" disabled selected={stacksForFamily(slot.requiredFamily).length === 0}>
						Choose stack
					</option>
					{#each stacksForFamily(slot.requiredFamily) as stack}
						{@const hint = hintForStack(stack.resourceInstanceId)}
						<option
							value={stack.resourceInstanceId}
							selected={stack.resourceInstanceId === selectedSlotValue(slot.id, slot.requiredFamily)}
						>
							{stack.displayName} × {stack.quantity}
							{#if hint}
								— best: {hint.bestUse}
							{/if}
						</option>
					{/each}
				</select>
			</fieldset>
		{/each}

		<h3>Property weights</h3>
		<p><small>When in doubt, read the weights below.</small></p>
		{#each data.schematic.properties as property}
			<article class="property-line">
				<h4>{property.displayName}</h4>
				<ul>
					{#each property.terms as term}
						<li>{term.label}</li>
					{/each}
				</ul>
				<label>
					Tuning points
					<input
						type="number"
						name="tuning_{property.id}"
						min="0"
						max="3"
						value={data.tuning[property.id] ?? data.suggestedTuning[property.id] ?? 0}
						onchange={(event) => event.currentTarget.form?.requestSubmit()}
					/>
				</label>
				{#if data.propertyPreview}
					{@const line = data.propertyPreview.lines.find((row) => row.propertyId === property.id)}
					{#if line}
						<p>
							Preview: base {line.baseScore} → tuned {line.tunedScore} ({line.tunedBand}), ceiling
							{line.resourceCeiling} ({line.ceilingBand})
						</p>
					{/if}
				{/if}
			</article>
		{/each}

		<p>
			<small>Tuning total: {data.tuningTotal} / 3 (exactly 3 required to craft)</small>
		</p>
	</form>

	<form method="POST" action="?/craft">
		<input type="hidden" name="schematicId" value={data.selectedSchematicId} />
		<input type="hidden" name="idempotencyKey" value={craftIdempotencyKey} />
		{#each data.schematic.slots as slot}
			<input
				type="hidden"
				name="slot_{slot.id}"
				value={selectedSlotValue(slot.id, slot.requiredFamily)}
			/>
		{/each}
		{#each data.schematic.properties as property}
			<input
				type="hidden"
				name="tuning_{property.id}"
				value={data.tuning[property.id] ?? data.suggestedTuning[property.id] ?? 0}
			/>
		{/each}

		<fieldset>
			<legend>Craft mode</legend>
			<label>
				<input type="radio" name="craftMode" value="safe_craft" checked />
				Safe Craft — tuned scores exactly
			</label>
			<label>
				<input type="radio" name="craftMode" value="careful_experiment" />
				Careful Experiment — small upside with flaw risk
			</label>
		</fieldset>

		<button type="submit">Craft {data.schematic.displayName}</button>
	</form>
</section>

{#if craftOutcome}
	<section class="craft-result">
		<h2>Craft result</h2>
		<p class="flash flash--success">{craftOutcome.explanation.summary}</p>
		<p><small>{craftOutcome.explanation.modeContribution}</small></p>
		<ul>
			{#each craftOutcome.explanation.properties as line}
				<li>
					<strong>{line.displayName}</strong>: {line.finalScore} ({line.finalBand}) — base
					{line.baseScore}, tuned {line.tunedScore}, {line.tuningPoints} tuning point(s). Top
					driver: {line.drivers[0]?.label} ({line.drivers[0]?.statValue},
					{line.drivers[0]?.weightPercent}% weight).
				</li>
			{/each}
		</ul>
		{#if craftOutcome.item.hasMinorFlaw}
			<p><small>Minor flaw on crafted item.</small></p>
		{/if}
		<p>
			<small>
				Condition {craftOutcome.item.condition}, integrity
				{craftOutcome.item.integrity}
			</small>
		</p>
	</section>
{/if}

<section class="gear-panel">
	<h2>Gear + repair</h2>
	<p>Field Repair kits owned: {data.fieldRepairKitCount}</p>

	<h3>Equipped scanner</h3>
	<p>{data.equippedScanner?.displayName ?? 'Basic Scanner Mk 0'}</p>

	{#if data.scannerItems.length > 0}
		<ul>
			{#each data.scannerItems as scanner}
				<li>
					{scanner.displayName} — Survey Clarity {scanner.surveyClarity}, condition
					{scanner.condition}, integrity {scanner.integrity}
					{#if scanner.equipped}
						<strong>(equipped)</strong>
					{:else}
						<form method="POST" action="?/equipScanner" style="display: inline">
							<input type="hidden" name="itemId" value={scanner.id} />
							<button type="submit">Equip</button>
						</form>
					{/if}
					{#if canRepairItem(scanner.condition, scanner.integrity)}
						<form method="POST" action="?/repairItem" style="display: inline">
							<input type="hidden" name="itemId" value={scanner.id} />
							<button type="submit">Repair with kit</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<h3>Equipped thumper parts</h3>
	<ul>
		<li>
			Drill: {data.equippedThumperParts.drill?.displayName ?? 'none'}
			{#if data.equippedThumperParts.drill}
				— condition {data.equippedThumperParts.drill.condition}, integrity
				{data.equippedThumperParts.drill.integrity}
			{/if}
		</li>
		<li>
			Pump: {data.equippedThumperParts.pump?.displayName ?? 'none'}
			{#if data.equippedThumperParts.pump}
				— condition {data.equippedThumperParts.pump.condition}, integrity
				{data.equippedThumperParts.pump.integrity}
			{/if}
		</li>
		<li>
			Hull: {data.equippedThumperParts.hull?.displayName ?? 'none'}
			{#if data.equippedThumperParts.hull}
				— condition {data.equippedThumperParts.hull.condition}, integrity
				{data.equippedThumperParts.hull.integrity}
			{/if}
		</li>
	</ul>

	{#if data.thumperPartItems.length > 0}
		<h3>Thumper parts inventory</h3>
		<ul>
			{#each data.thumperPartItems as part}
				<li>
					{part.displayName} ({thumperPartSlotLabel(part.slot)}) — condition {part.condition}, integrity
					{part.integrity}
					<form method="POST" action="?/equipThumperPart" style="display: inline">
						<input type="hidden" name="slot" value={part.slot} />
						<input type="hidden" name="itemId" value={part.id} />
						<button type="submit">Equip</button>
					</form>
					{#if canRepairItem(part.condition, part.integrity)}
						<form method="POST" action="?/repairItem" style="display: inline">
							<input type="hidden" name="itemId" value={part.id} />
							<button type="submit">Repair with kit</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if equipOutcome}
	<p class="flash flash--success">
		Equipped {equipOutcome.displayName} — Survey Clarity {equipOutcome.surveyClarity}.
	</p>
{/if}

{#if equipThumperOutcome && 'displayName' in equipThumperOutcome}
	<p class="flash flash--success">
		Equipped {equipThumperOutcome.displayName} ({thumperPartSlotLabel(equipThumperOutcome.slot)}) —
		condition {equipThumperOutcome.condition}, integrity {equipThumperOutcome.integrity}.
	</p>
{/if}

{#if repairOutcome}
	<p class="flash flash--success">
		Repaired {repairOutcome.displayName} — condition {repairOutcome.condition}, integrity
		{repairOutcome.integrity}. Kits remaining: {repairOutcome.fieldRepairKitCount}.
	</p>
{/if}

<style>
	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.comparison-table th,
	.comparison-table td {
		border: 1px solid #ccc;
		padding: 0.35rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.schematic-list ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		list-style: none;
		padding: 0;
	}

	.property-line {
		border: 1px solid #ddd;
		padding: 0.75rem;
		margin: 0.75rem 0;
	}

	.preview-form fieldset,
	.craft-panel fieldset {
		margin: 0.75rem 0;
	}
</style>
