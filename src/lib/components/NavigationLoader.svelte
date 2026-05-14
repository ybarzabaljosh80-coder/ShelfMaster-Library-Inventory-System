<script lang="ts">
	import { navigating } from '$app/stores';
</script>

{#if $navigating}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-white/40 backdrop-blur-sm">
		<div
			class="h-full w-1/2 bg-gradient-to-r from-[#1B6B3A] via-[#C5A832] to-[#1B6B3A] opacity-90"
			style="animation: loading-bar 1.1s cubic-bezier(0.32,0.72,0,1) infinite; background-size: 200% 100%;"
		></div>
	</div>
{/if}

<style>
	@keyframes loading-bar {
		0% {
			transform: translateX(-100%);
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
		100% {
			transform: translateX(200%);
			opacity: 0.55;
		}
	}
</style>
