<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	const statusCode = $derived($page.status);
	const errorMessage = $derived($page.error?.message ?? 'Something went wrong.');
</script>

<svelte:head>
	<title>Error {statusCode} — SPCBA Library</title>
</svelte:head>

<div class="relative min-h-[100dvh] overflow-hidden bg-[#FAFAF9] px-4 py-10">
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(27,107,58,0.08),_transparent_32%)]"
	></div>
	<div
		class="relative mx-auto flex min-h-[calc(100dvh-5rem)] max-w-5xl items-center justify-center"
	>
		<div class="relative w-full max-w-2xl text-center">
			<p
				class="pointer-events-none absolute inset-x-0 -top-20 text-[9rem] font-extrabold tracking-[-0.08em] text-gray-900/5 sm:text-[12rem]"
			>
				{statusCode}
			</p>
			<div
				class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] backdrop-blur-xl"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-12 sm:px-12">
					<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
						{#if statusCode === 404}
							Page Not Found
						{:else if statusCode === 403}
							Access Denied
						{:else if statusCode === 500}
							Server Error
						{:else}
							Error
						{/if}
					</h1>
					<p class="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">{errorMessage}</p>
					<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
						<a
							href={resolve('/')}
							class="rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98]"
						>
							Go Home
						</a>
						<button
							onclick={() => history.back()}
							class="rounded-full bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
						>
							Go Back
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
