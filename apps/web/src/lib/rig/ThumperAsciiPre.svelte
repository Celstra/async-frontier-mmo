<script lang="ts">
	interface Props {
		art: string;
	}

	let { art }: Props = $props();
</script>

<pre class="thumper-ascii" aria-hidden="true">{art}</pre>

<style>
	.thumper-ascii {
		margin: 0 0 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre;
		overflow-x: auto;
	}
</style>
