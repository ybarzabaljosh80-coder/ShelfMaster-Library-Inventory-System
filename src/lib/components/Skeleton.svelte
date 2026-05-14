<script lang="ts">
	interface Props {
		lines?: number;
		class?: string;
	}

	let { lines = 3, class: className = '' }: Props = $props();
</script>

<div class="animate-pulse space-y-3 {className}">
	{#each Array(lines) as _, i}
		<div class="h-4 rounded bg-gray-200" style="width: {60 + ((i * 17) % 40)}%"></div>
	{/each}
</div>
