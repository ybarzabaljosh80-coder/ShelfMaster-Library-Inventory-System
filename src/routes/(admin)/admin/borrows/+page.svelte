<script lang="ts">
	import { onMount } from 'svelte';

	type BorrowRecord = {
		id: string;
		borrowed_at: string;
		due_date?: string | null;
		returned_at?: string | null;
		force_returned?: boolean | null;
		profiles?: { name?: string | null } | null;
		books?: { title?: string | null; serial_no?: string | null } | null;
	};
	type ReservationRecord = {
		id: string;
		position: number;
		status: 'waiting' | 'ready';
		created_at: string;
		expires_at?: string | null;
		profiles?: { name?: string | null } | null;
		books?: { title?: string | null; serial_no?: string | null } | null;
	};

	let records = $state<BorrowRecord[]>([]);
	let reservations = $state<ReservationRecord[]>([]);
	let loading = $state(false);
	let reservationLoading = $state(false);
	let searched = $state(false);
	let reservationsOpen = $state(true);
	let forceReturningId = $state<string | null>(null);
	let message = $state('');
	let messageType = $state<'success' | 'error'>('success');

	let userFilter = $state('');
	let bookFilter = $state('');
	let fromDate = $state('');
	let toDate = $state('');

	async function search() {
		loading = true;
		searched = true;
		message = '';

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (userFilter) params.set('user', userFilter);
		if (bookFilter) params.set('book', bookFilter);
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);

		const res = await fetch(`/api/borrows?${params}`);
		const data = await res.json();
		loading = false;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
			records = [];
		} else {
			records = data;
		}
	}

	async function forceReturn(borrowId: string) {
		if (!confirm('Force return this book?')) return;
		forceReturningId = borrowId;
		message = '';

		const res = await fetch('/api/borrows/force-return', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ borrow_id: borrowId })
		});

		const data = await res.json();
		forceReturningId = null;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
		} else {
			message = 'Book force-returned successfully.';
			messageType = 'success';
			await Promise.all([search(), loadReservations()]);
		}
	}

	async function loadReservations() {
		reservationLoading = true;
		const res = await fetch('/api/reservations/admin');
		const data = await res.json();
		reservationLoading = false;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
			reservations = [];
			return;
		}

		reservations = data;
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isOverdue(record: BorrowRecord) {
		return !record.returned_at && record.due_date && new Date(record.due_date) < new Date();
	}

	onMount(() => {
		void Promise.all([search(), loadReservations()]);
	});
</script>

<svelte:head>
	<title>All Borrows — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			All Borrow Records
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			Filter borrower activity, isolate overdue items, and step in with a force return when
			inventory needs to be recovered.
		</p>
	</div>

	<div
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 text-gray-900 sm:p-8">
			<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
				<input
					type="text"
					bind:value={userFilter}
					placeholder="Filter by user name"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<input
					type="text"
					bind:value={bookFilter}
					placeholder="Filter by book title"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<input
					type="date"
					bind:value={fromDate}
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<input
					type="date"
					bind:value={toDate}
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<button
					type="button"
					onclick={search}
					disabled={loading}
					class="rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
					>{loading ? 'Loading…' : 'Search'}</button
				>
			</div>
		</div>
	</div>

	<section class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-8">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight text-gray-900">Active Reservations</h2>
					<p class="mt-2 text-sm text-gray-500">
						Queue visibility for books currently waiting or ready for pickup.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (reservationsOpen = !reservationsOpen)}
					class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
				>
					{reservationsOpen ? 'Hide reservations' : 'Show reservations'}
				</button>
			</div>

			{#if reservationsOpen}
				{#if reservationLoading}
					<div class="mt-6 rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]">
						Loading reservations…
					</div>
				{:else if reservations.length === 0}
					<div class="mt-6 rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]">
						No active reservations right now.
					</div>
				{:else}
					<div class="mt-6 overflow-x-auto rounded-[1.75rem] ring-1 ring-black/[0.04]">
						<table class="w-full text-sm text-gray-900">
							<thead>
								<tr class="border-b border-gray-100 bg-gray-50/60">
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">User</th>
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Book</th>
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Position</th>
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Status</th>
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Created</th>
									<th class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">Expires</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-50 bg-white">
								{#each reservations as reservation (reservation.id)}
									<tr>
										<td class="px-6 py-4 font-semibold text-gray-900">{reservation.profiles?.name ?? '—'}</td>
										<td class="px-6 py-4">
											<p class="font-semibold text-gray-900">{reservation.books?.title ?? '—'}</p>
											<p class="mt-1 text-xs text-gray-400">{reservation.books?.serial_no ?? ''}</p>
										</td>
										<td class="px-6 py-4 text-gray-600">#{reservation.position}</td>
										<td class="px-6 py-4">
											<span class={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${reservation.status === 'ready' ? 'bg-[#E8F5EC] text-[#1B6B3A] ring-[#1B6B3A]/10' : 'bg-[#FDF8E8] text-[#C5A832] ring-[#C5A832]/15'}`}>
												{reservation.status === 'ready' ? 'Ready' : 'Waiting'}
											</span>
										</td>
										<td class="px-6 py-4 text-gray-600">{formatDate(reservation.created_at)}</td>
										<td class="px-6 py-4 text-gray-600">{reservation.expires_at ? formatDate(reservation.expires_at) : '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</div>
	</section>

	{#if message}
		<p
			class={`mt-4 rounded-2xl px-4 py-3 text-sm ring-1 ${messageType === 'success' ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-red-50 text-red-600 ring-red-100'}`}
		>
			{message}
		</p>
	{/if}

	{#if searched}
		{#if records.length === 0}
			<div
				class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-12 text-center text-gray-900">
					<p class="text-lg font-semibold">No borrow records found</p>
					<p class="mt-2 text-sm text-gray-500">
						Try widening the filters or removing the date range.
					</p>
				</div>
			</div>
		{:else}
			<div
				class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
			>
				<div class="overflow-x-auto rounded-[calc(2rem-0.375rem)] bg-white">
					<table class="w-full text-sm text-gray-900">
						<thead>
							<tr class="border-b border-gray-100 bg-gray-50/50">
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Borrower</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Book</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Borrowed</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Due Date</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Returned</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Status</th
								>
								<th
									class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
								></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50">
							{#each records as record (record.id)}
								<tr
									class={`transition-colors duration-200 hover:bg-gray-50/50 ${isOverdue(record) ? 'bg-red-50/50' : ''}`}
								>
									<td class="px-6 py-4 font-semibold text-gray-900"
										>{record.profiles?.name ?? '—'}</td
									>
									<td class="px-6 py-4">
										<p class="font-semibold text-gray-900">{record.books?.title ?? '—'}</p>
										<p class="mt-1 text-xs text-gray-400">{record.books?.serial_no ?? ''}</p>
									</td>
									<td class="px-6 py-4 text-gray-600">{formatDate(record.borrowed_at)}</td>
									<td class="px-6 py-4">
										{#if record.due_date}
											<span
												class={isOverdue(record) ? 'font-semibold text-red-600' : 'text-gray-600'}
											>
												{formatDate(record.due_date)}
												{#if isOverdue(record)}
													<span
														class="ml-2 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-red-600 uppercase ring-1 ring-red-100"
														>Late</span
													>
												{/if}
											</span>
										{:else}
											<span class="text-gray-400">—</span>
										{/if}
									</td>
									<td class="px-6 py-4 text-gray-600"
										>{record.returned_at ? formatDate(record.returned_at) : '—'}</td
									>
									<td class="px-6 py-4">
										{#if record.returned_at}
											<span
												class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-black/[0.04]"
												>{record.force_returned ? 'Force Returned' : 'Returned'}</span
											>
										{:else if isOverdue(record)}
											<span
												class="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100"
												>Overdue</span
											>
										{:else}
											<span
												class="rounded-full bg-[#E8F5EC] px-3 py-1 text-xs font-medium text-[#1B6B3A] ring-1 ring-[#1B6B3A]/10"
												>Active</span
											>
										{/if}
									</td>
									<td class="px-6 py-4 text-right">
										{#if !record.returned_at}
											<button
												onclick={() => forceReturn(record.id)}
												disabled={forceReturningId === record.id}
												class="rounded-full bg-[#E8F5EC] px-4 py-2 text-xs font-medium text-[#1B6B3A] ring-1 ring-[#1B6B3A]/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#DCEEE2] active:scale-[0.98] disabled:opacity-50"
												>{forceReturningId === record.id ? 'Returning…' : 'Force Return'}</button
											>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</main>
