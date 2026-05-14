<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	type BorrowedBook = { title?: string; author?: string; serial_no?: string } | null;
	type ReservationBook = { title?: string; author?: string; serial_no?: string } | null;
	type BorrowRecord = {
		id: string;
		borrowed_at: string;
		due_date?: string | null;
		returned_at?: string | null;
		force_returned?: boolean | null;
		books: BorrowedBook;
	};
	type ReservationRecord = {
		id: string;
		status: 'waiting' | 'ready';
		position: number;
		created_at: string;
		ready_at?: string | null;
		expires_at?: string | null;
		books: ReservationBook;
	};

	let { data } = $props<{ data: PageData }>();

	let returningId = $state<string | null>(null);
	let cancellingReservationId = $state<string | null>(null);
	let error = $state('');

	async function returnBook(borrowId: string) {
		returningId = borrowId;
		error = '';

		const res = await fetch('/api/borrows/return', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ borrow_id: borrowId })
		});

		const result = await res.json();
		returningId = null;

		if (!res.ok) {
			error = result.message;
			return;
		}

		window.location.reload();
	}

	async function cancelReservation(reservationId: string) {
		cancellingReservationId = reservationId;
		error = '';

		const res = await fetch(`/api/reservations/${reservationId}`, {
			method: 'DELETE'
		});

		const result = await res.json();
		cancellingReservationId = null;

		if (!res.ok) {
			error = result.message;
			return;
		}

		window.location.reload();
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateTime(dateStr: string) {
		return new Date(dateStr).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function isOverdue(record: BorrowRecord) {
		return !record.returned_at && record.due_date && new Date(record.due_date) < new Date();
	}
</script>

<svelte:head>
	<title>My Borrows — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			My Borrows
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			Every checkout in one premium table, with overdue visibility and quick returns for active
			loans.
		</p>
	</div>

	{#if error}
		<p class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
			{error}
		</p>
	{/if}

	<section class="mt-12">
		<div class="max-w-2xl">
			<h2 class="text-2xl font-bold tracking-tight text-gray-900">My Reservations</h2>
			<p class="mt-2 text-sm text-gray-500">
				Track every active queue spot and ready-for-pickup hold in one place.
			</p>
		</div>

		{#if data.reservations.length === 0}
			<div class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-10 text-center text-sm text-gray-500">
					No active reservations yet.
				</div>
			</div>
		{:else}
			<div class="mt-6 space-y-4">
				{#each data.reservations as reservation (reservation.id)}
					{@const book = reservation.books as ReservationBook}
					<div class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
						<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-7">
							<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<p class="text-lg font-semibold tracking-tight text-gray-900">{book?.title ?? 'Reserved Book'}</p>
									<p class="mt-2 text-sm text-gray-500">{book ? `${book.author} · Serial ${book.serial_no}` : '—'}</p>
									<div class="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
										<span class="rounded-full bg-gray-100 px-3 py-1 ring-1 ring-black/[0.04]">Queue position #{reservation.position}</span>
										{#if reservation.status === 'ready' && reservation.expires_at}
											<span class="rounded-full bg-[#FDF8E8] px-3 py-1 text-[#C5A832] ring-1 ring-[#C5A832]/15">
												Pick up by {formatDateTime(reservation.expires_at)}
											</span>
										{/if}
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-3 lg:justify-end">
									<span class={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${reservation.status === 'ready' ? 'bg-[#E8F5EC] text-[#1B6B3A] ring-[#1B6B3A]/10' : 'bg-[#FDF8E8] text-[#C5A832] ring-[#C5A832]/15'}`}>
										{reservation.status === 'ready' ? 'Ready' : 'Waiting'}
									</span>
									<button
										onclick={() => cancelReservation(reservation.id)}
										disabled={cancellingReservationId === reservation.id}
										class="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98] disabled:opacity-50"
									>
										{cancellingReservationId === reservation.id ? 'Cancelling…' : 'Cancel'}
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if data.borrows.length === 0}
		<div
			class="mt-12 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-14 text-center">
				<p class="text-2xl font-bold tracking-tight text-gray-900">No borrow history yet</p>
				<p class="mt-3 text-sm text-gray-500">
					Explore the catalog and your first checkout will appear here.
				</p>
				<a
					href={resolve('/books')}
					class="mt-6 inline-flex rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98]"
					>Browse books</a
				>
			</div>
		</div>
	{:else}
		<div
			class="mt-12 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="overflow-x-auto rounded-[calc(2rem-0.375rem)] bg-white">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-gray-100 bg-gray-50/50">
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
						{#each data.borrows as record (record.id)}
							{@const book = record.books as BorrowedBook}
							<tr
								class={`transition-colors duration-200 hover:bg-gray-50/50 ${isOverdue(record) ? 'bg-red-50/50' : ''}`}
							>
								<td class="px-6 py-4">
									<p class="font-semibold text-gray-900">{book?.title ?? 'Deleted Book'}</p>
									<p class="mt-1 text-xs text-gray-400">
										{book ? `${book.author} · ${book.serial_no}` : '—'}
									</p>
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
													>Overdue</span
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
											onclick={() => returnBook(record.id)}
											disabled={returningId === record.id}
											class="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98] disabled:opacity-50"
										>
											{returningId === record.id ? 'Returning…' : 'Return'}
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</main>
