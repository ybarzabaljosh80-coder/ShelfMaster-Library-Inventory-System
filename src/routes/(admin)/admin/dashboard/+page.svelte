<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const cards = $derived([
		{ label: 'Total Books', value: data.stats.totalBooks, color: 'text-[#1B6B3A]' },
		{ label: 'Books Out', value: data.stats.booksOut, color: 'text-[#C5A832]' },
		{ label: 'Registered Users', value: data.stats.registeredUsers, color: 'text-green-600' },
		{ label: 'Total Borrows', value: data.stats.totalBorrows, color: 'text-[#C5A832]' },
		{ label: 'Active Borrows', value: data.stats.activeBorrows, color: 'text-red-600' },
		{ label: 'Overdue', value: data.stats.overdueBorrows, color: 'text-orange-500' }
	]);
</script>

<svelte:head>
	<title>Admin Dashboard — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			Admin Dashboard
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			A high-clarity view into inventory, circulation, overdue exposure, and member activity across
			the system.
		</p>
	</div>

	<div class="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each cards as card (card.label)}
			<div
				class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] backdrop-blur-xl"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white p-7 text-gray-900">
					<div class={`h-1.5 w-14 rounded-full bg-current ${card.color}`}></div>
					<p class="mt-5 text-xs font-medium tracking-[0.2em] text-gray-500 uppercase">
						{card.label}
					</p>
					<p class="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">{card.value}</p>
				</div>
			</div>
		{/each}
	</div>
</main>
