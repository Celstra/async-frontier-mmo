<script lang="ts">
	import InDevelopmentScreen from '$lib/slice/InDevelopmentScreen.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<InDevelopmentScreen screenTitle="FIELD — Red Mesa" screenId={data.screenId} />
