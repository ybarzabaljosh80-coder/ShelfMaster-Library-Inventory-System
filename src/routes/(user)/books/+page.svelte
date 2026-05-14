<script lang="ts">
	import { onMount } from 'svelte';
	import type { Book } from '$lib/types';

	type ReservationBook = { title?: string; author?: string; serial_no?: string } | null;
	type ReservationRecord = {
		id: string;
		book_id: string;
		status: 'waiting' | 'ready';
		position: number;
		expires_at?: string | null;
		books: ReservationBook;
	};

	let query = $state('');
	let categoryFilter = $state('');
	let books = $state<Book[]>([]);
	let reservations = $state<ReservationRecord[]>([]);
	let loading = $state(false);
	let borrowingId = $state<string | null>(null);
	let reservingId = $state<string | null>(null);
	let borrowDays = $state<Record<string, number>>({});
	let message = $state('');
	let messageTone = $state<'success' | 'error'>('error');
	let searched = $state(false);
	let borrowReceipt = $state<{ title: string; dueDate: string } | null>(null);

	const categories = $derived(
		Array.from(
			new Set(
				books.map((book) => book.category).filter((category): category is string => !!category)
			)
		).sort((a, b) => a.localeCompare(b))
	);
	const filteredBooks = $derived(
		categoryFilter ? books.filter((book) => book.category === categoryFilter) : books
	);
	const reservationsByBook = $derived(new Map(reservations.map((reservation) => [reservation.book_id, reservation])));

	onMount(() => {
		void Promise.all([search(), loadReservations()]);
	});

	async function loadReservations() {
		const res = await fetch('/api/reservations');
		const data = await res.json();
		if (!res.ok) return;
		reservations = data ?? [];
	}

	async function search() {
		loading = true;
		searched = true;
		message = '';
		const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
		const data = await res.json();
		loading = false;

		if (!res.ok) {
			message = data.message;
			messageTone = 'error';
			books = [];
			return;
		}

		books = data;
	}

	async function borrow(bookId: string) {
		borrowingId = bookId;
		message = '';
		borrowReceipt = null;

		const selectedDays = borrowDays[bookId] || 5;
		const book = books.find((entry) => entry.id === bookId);
		const res = await fetch('/api/borrows/borrow', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ book_id: bookId, borrow_days: selectedDays })
		});

		const data = await res.json();
		borrowingId = null;

		if (!res.ok) {
			message = data.message;
			messageTone = 'error';
			return;
		}

		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + selectedDays);
		borrowReceipt = {
			title: book?.title ?? 'Book',
			dueDate: dueDate.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		};
		await Promise.all([search(), loadReservations()]);
	}

	async function reserve(bookId: string) {
		reservingId = bookId;
		message = '';
		const res = await fetch('/api/reservations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ book_id: bookId })
		});
		const data = await res.json();
		reservingId = null;

		if (!res.ok) {
			message = data.message;
			messageTone = 'error';
			return;
		}

		message = `Reservation placed. Your queue position is #${data.position}.`;
		messageTone = 'success';
		await Promise.all([search(), loadReservations()]);
	}

	function formatDateTime(dateString: string) {
		return new Date(dateString).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Browse Books — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			Browse Books
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			Search the collection, narrow by category, and check out a title with a polished confirmation
			flow.
		</p>
	</div>

	<div
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-5 sm:p-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					search();
				}}
				class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
			>
				<div class="rounded-full bg-gray-50/80 p-1 ring-1 ring-black/[0.06]">
					<input
						type="text"
						bind:value={query}
						placeholder="Search by title, author, or serial number"
						class="block w-full rounded-full border-0 bg-transparent px-5 py-3 text-sm text-gray-700 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white"
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					class="rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
				>
					{loading ? 'Searching…' : 'Search'}
				</button>
			</form>

			{#if searched}
				<div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
					<p class="text-sm text-gray-500">Filter the current results by category.</p>
					<select
						bind:value={categoryFilter}
						class="w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 md:w-72"
					>
						<option value="">All categories</option>
						{#each categories as category (category)}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
	</div>

	{#if message}
		<p class={`mt-4 rounded-2xl px-4 py-3 text-sm ring-1 ${messageTone === 'success' ? 'bg-[#E8F5EC] text-[#1B6B3A] ring-[#1B6B3A]/10' : 'bg-red-50 text-red-600 ring-red-100'}`}>
			{message}
		</p>
	{/if}

	{#if searched}
		{#if books.length === 0}
			<div
				class="mt-12 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-14 text-center">
					<p class="text-2xl font-bold tracking-tight text-gray-900">No matches yet</p>
					<p class="mt-3 text-sm text-gray-500">No books found for &quot;{query}&quot;.</p>
				</div>
			</div>
		{:else if filteredBooks.length === 0}
			<div
				class="mt-12 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-14 text-center">
					<p class="text-2xl font-bold tracking-tight text-gray-900">No titles in this category</p>
					<p class="mt-3 text-sm text-gray-500">
						Try another category filter to reveal more of the collection.
					</p>
				</div>
			</div>
		{:else}
			<div class="mt-12 space-y-4">
				{#each filteredBooks as book (book.id)}
					{@const reservation = reservationsByBook.get(book.id)}
					{@const canBorrow = book.available_copies > 0 || reservation?.status === 'ready'}
					<div
						class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
					>
						<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-7">
							<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<p class="text-xl font-semibold tracking-tight text-gray-900">{book.title}</p>
									<p class="mt-2 text-sm text-gray-500">{book.author}</p>
									<div class="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
										{#if book.category}
											<span class="rounded-full bg-gray-100 px-3 py-1 ring-1 ring-black/[0.04]">{book.category}</span>
										{/if}
										<span class="rounded-full bg-gray-100 px-3 py-1 ring-1 ring-black/[0.04]">Serial {book.serial_no}</span>
										{#if reservation?.status === 'waiting'}
											<span class="rounded-full bg-[#FDF8E8] px-3 py-1 text-[#C5A832] ring-1 ring-[#C5A832]/15">Queue position #{reservation.position}</span>
										{:else if reservation?.status === 'ready'}
											<span class="rounded-full bg-[#E8F5EC] px-3 py-1 text-[#1B6B3A] ring-1 ring-[#1B6B3A]/10">Reserved for you</span>
										{/if}
									</div>
									{#if reservation?.status === 'ready' && reservation.expires_at}
										<p class="mt-4 rounded-2xl bg-[#E8F5EC] px-4 py-3 text-sm font-medium text-[#1B6B3A] ring-1 ring-[#1B6B3A]/10">
											Your reservation is ready! Borrow now before {formatDateTime(reservation.expires_at)}.
										</p>
									{:else if reservation?.status === 'waiting'}
										<p class="mt-4 text-sm text-gray-500">You’re already in line for this title.</p>
									{/if}
								</div>
								<div class="flex flex-wrap items-center gap-3 lg:justify-end">
									<span
										class={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${book.available_copies > 0 ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-red-50 text-red-600 ring-red-100'}`}
									>
										{book.available_copies > 0 ? `${book.available_copies} available` : 'All Borrowed'}
									</span>
									<select
										value={borrowDays[book.id] || 5}
										onchange={(e) =>
											(borrowDays[book.id] = Number((e.target as HTMLSelectElement).value))}
										disabled={!canBorrow}
										class="w-24 rounded-full border-0 bg-gray-50/80 px-4 py-3 text-xs font-medium ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 disabled:opacity-50"
									>
										<option value={1}>1 day</option>
										<option value={3}>3 days</option>
										<option value={5}>5 days</option>
									</select>
									{#if canBorrow}
										<button
											onclick={() => borrow(book.id)}
											disabled={borrowingId === book.id}
											class="rounded-full bg-[#1B6B3A] px-5 py-3 text-xs font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
										>
											{borrowingId === book.id
												? 'Borrowing…'
												: reservation?.status === 'ready'
													? 'Borrow Reserved Copy'
													: 'Borrow'}
										</button>
									{:else if reservation?.status === 'waiting'}
										<button
											type="button"
											disabled={true}
											class="rounded-full bg-[#FDF8E8] px-5 py-3 text-xs font-semibold text-[#C5A832] ring-1 ring-[#C5A832]/15 opacity-80"
										>
											Reserved
										</button>
									{:else}
										<button
											onclick={() => reserve(book.id)}
											disabled={reservingId === book.id}
											class="rounded-full bg-[#1B6B3A] px-5 py-3 text-xs font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
										>
											{reservingId === book.id ? 'Reserving…' : 'Reserve'}
										</button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</main>

{#if borrowReceipt}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-2xl"
	>
		<div
			class="w-full max-w-md rounded-[2rem] bg-white/60 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-white/20"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white p-8">
				<span
					class="inline-flex rounded-full bg-green-50 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-green-700 uppercase ring-1 ring-green-100"
					>Borrow confirmed</span
				>
				<h2 class="mt-4 text-2xl font-bold tracking-tight text-gray-900">{borrowReceipt.title}</h2>
				<p class="mt-4 text-sm leading-6 text-gray-500">
					Please return this book by <span class="font-semibold text-gray-900"
						>{borrowReceipt.dueDate}</span
					>.
				</p>
				<div class="mt-6 rounded-2xl bg-green-50 px-4 py-4 ring-1 ring-green-100">
					<p class="text-xs font-medium tracking-[0.2em] text-green-700 uppercase">Receipt</p>
					<p class="mt-2 text-sm text-green-900">
						Your checkout is now active and reflected in the latest availability count.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (borrowReceipt = null)}
					class="mt-6 w-full rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98]"
				>
					Dismiss
				</button>
			</div>
		</div>
	</div>
{/if}
