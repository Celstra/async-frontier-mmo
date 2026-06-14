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
		font-size: clamp(0.55rem, 2vw, var(--font-size-xs));
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre-wrap;
		overflow-x: hidden;
		max-width: 100%;
		word-break: break-word;
	}
</style>
