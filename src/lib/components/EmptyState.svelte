<script lang="ts">
	interface Props {
		message?: string;
		actionLabel?: string;
		actionHref?: string;
	}

	let { message = 'Nothing here yet.', actionLabel = '', actionHref = '' }: Props = $props();
</script>

<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
	<p class="text-sm text-gray-500">{message}</p>
	{#if actionLabel && actionHref}
		<a href={actionHref} class="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-500">
			{actionLabel} →
		</a>
	{/if}
</div>
