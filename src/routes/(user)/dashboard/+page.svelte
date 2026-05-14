<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	type BorrowedBook = { title?: string; author?: string; serial_no?: string } | null;
	type BorrowRecord = {
		id: string;
		borrowed_at: string;
		due_date: string;
		books: BorrowedBook;
	};

	let { data } = $props<{ data: PageData }>();

	const usedBorrows = $derived(data.activeBorrows.length);
	const remainingSlots = $derived(Math.max(0, 3 - data.activeBorrows.length));
	const reservationCount = $derived(data.reservationCount ?? 0);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isOverdue(record: BorrowRecord) {
		return !!record.due_date && new Date(record.due_date) < new Date();
	}
</script>

<svelte:head>
	<title>Dashboard — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			Welcome back, {data.profile.name}
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			A clear view of your active checkouts, remaining capacity, and anything that needs attention.
		</p>
	</div>

	<div class="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		<div
			class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white p-8">
				<p class="text-xs font-medium tracking-[0.2em] text-gray-400 uppercase">Active Borrows</p>
				<p class="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">{usedBorrows}</p>
				<p class="mt-3 text-sm text-gray-500">Books currently checked out under your account.</p>
			</div>
		</div>

		<div
			class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white p-8">
				<p class="text-xs font-medium tracking-[0.2em] text-gray-400 uppercase">Reservations</p>
				<p class="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">{reservationCount}</p>
				<p class="mt-3 text-sm text-gray-500">Books currently held in your active queue.</p>
			</div>
		</div>

		<div
			class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white p-8">
				<p class="text-xs font-medium tracking-[0.2em] text-gray-400 uppercase">Borrow Slots</p>
				<p class="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">{remainingSlots}</p>
				<p class="mt-3 text-sm text-gray-500">
					{usedBorrows} of 3 available checkout slots are in use.
				</p>
			</div>
		</div>

		{#if data.overdueCount > 0}
			<div
				class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(239,68,68,0.10)] ring-1 ring-red-200/80"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white p-8">
					<p class="text-xs font-medium tracking-[0.2em] text-red-400 uppercase">Overdue</p>
					<p class="mt-4 text-5xl font-extrabold tracking-tight text-gray-900">
						{data.overdueCount}
					</p>
					<p class="mt-3 text-sm text-gray-500">
						Please return overdue books or renew them as soon as possible.
					</p>
				</div>
			</div>
		{/if}
	</div>

	{#if data.activeBorrows.length > 0}
		<section class="mt-12">
			<div class="max-w-2xl">
				<h2 class="text-2xl font-bold tracking-tight text-gray-900">Currently Borrowed</h2>
				<p class="mt-2 text-sm text-gray-500">
					Every active item with clear due dates and status visibility.
				</p>
			</div>
			<div class="mt-6 space-y-4">
				{#each data.activeBorrows as record (record.id)}
					{@const book = record.books as BorrowedBook}
					<div
						class={`rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ${isOverdue(record) ? 'shadow-[0_12px_40px_rgba(239,68,68,0.10)] ring-red-200/80' : 'ring-black/[0.04]'}`}
					>
						<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-7">
							<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p class="text-xl font-semibold tracking-tight text-gray-900">
										{book?.title ?? 'Deleted Book'}
									</p>
									<p class="mt-2 text-sm text-gray-500">
										{book ? `${book.author} · Serial ${book.serial_no}` : '—'}
									</p>
									<div class="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
										<span class="rounded-full bg-gray-100 px-3 py-1 ring-1 ring-black/[0.04]"
											>Borrowed {formatDate(record.borrowed_at)}</span
										>
										<span
											class={`rounded-full px-3 py-1 ring-1 ${isOverdue(record) ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-gray-100 text-gray-600 ring-black/[0.04]'}`}
										>
											Due {formatDate(record.due_date)}
										</span>
									</div>
								</div>
								{#if isOverdue(record)}
									<span
										class="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-red-600 uppercase ring-1 ring-red-100"
										>Overdue</span
									>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<section
			class="mt-12 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-14 text-center sm:px-12">
				<p class="text-2xl font-bold tracking-tight text-gray-900">No active borrows yet</p>
				<p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
					Browse the catalog to find available titles and check out your next read.
				</p>
				<a
					href={resolve('/books')}
					class="mt-6 inline-flex rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98]"
					>Browse books</a
				>
			</div>
		</section>
	{/if}
</main>
