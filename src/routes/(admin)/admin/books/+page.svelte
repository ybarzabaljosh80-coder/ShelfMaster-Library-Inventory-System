<script lang="ts">
	import { onMount } from 'svelte';
	import type { Book } from '$lib/types';

	const GENRES = [
		'Fiction',
		'Non-Fiction',
		'Science Fiction',
		'Fantasy',
		'Mystery',
		'Thriller',
		'Romance',
		'Horror',
		'Biography',
		'History',
		'Science',
		'Technology',
		'Self-Help',
		'Philosophy',
		'Poetry',
		'Drama',
		'Children',
		'Young Adult',
		'Comics',
		'Reference',
		'Academic',
		'Religion',
		'Art',
		'Travel',
		'Cooking',
		'Other'
	];

	let query = $state('');
	let books = $state<Book[]>([]);
	let loading = $state(false);
	let searched = $state(false);
	let message = $state('');
	let messageType = $state<'success' | 'error'>('success');

	let title = $state('');
	let author = $state('');
	let serialNo = $state('');
	let category = $state('');
	let copies = $state(1);
	let adding = $state(false);

	let deletingId = $state<string | null>(null);
	let importing = $state(false);
	let fileInput: HTMLInputElement;

	let editingId = $state<string | null>(null);
	let editCopies = $state(1);
	let editCategory = $state('');
	let saving = $state(false);

	onMount(() => {
		search();
	});

	async function search() {
		loading = true;
		searched = true;
		message = '';
		const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
		books = await res.json();
		loading = false;
	}

	async function addBook() {
		if (!title || !author || !serialNo) {
			message = 'All fields are required.';
			messageType = 'error';
			return;
		}

		adding = true;
		message = '';

		const res = await fetch('/api/books/add', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title,
				author,
				serial_no: serialNo,
				category: category || null,
				total_copies: copies
			})
		});

		const data = await res.json();
		adding = false;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
		} else {
			message = `"${title}" added successfully!`;
			messageType = 'success';
			title = '';
			author = '';
			serialNo = '';
			category = '';
			copies = 1;
			await search();
		}
	}

	async function deleteBook(bookId: string) {
		if (!confirm('Are you sure you want to delete this book?')) return;
		deletingId = bookId;
		message = '';

		const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
		const data = await res.json();
		deletingId = null;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
		} else {
			message = 'Book deleted.';
			messageType = 'success';
			await search();
		}
	}

	async function importBooks() {
		if (!fileInput?.files?.length) return;
		importing = true;
		message = '';

		const formData = new FormData();
		formData.append('file', fileInput.files[0]);

		const res = await fetch('/api/books/import', { method: 'POST', body: formData });
		const data = await res.json();
		importing = false;
		fileInput.value = '';

		message = data.message;
		messageType = res.ok ? 'success' : 'error';
		if (res.ok && searched) await search();
	}

	function exportBooks() {
		window.location.href = '/api/books/export';
	}

	function startEdit(book: Book) {
		editingId = book.id;
		editCopies = book.total_copies;
		editCategory = book.category ?? '';
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(bookId: string) {
		saving = true;
		message = '';

		const res = await fetch(`/api/books/${bookId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				total_copies: editCopies,
				category: editCategory || null
			})
		});

		const data = await res.json();
		saving = false;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
		} else {
			message = 'Book updated.';
			messageType = 'success';
			editingId = null;
			await search();
		}
	}
</script>

<svelte:head>
	<title>Manage Books — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-12">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="max-w-3xl">
			<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
				Manage Books
			</h1>
			<p class="mt-4 text-sm leading-6 text-gray-500">
				Add titles, refine metadata, and keep circulation-ready inventory clean and searchable.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={exportBooks}
				class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
				>Export Excel</button
			>
			<label
				class={`cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98] ${importing ? 'opacity-60' : ''}`}
			>
				{importing ? 'Importing…' : 'Import Excel'}
				<input
					type="file"
					accept=".xlsx,.xls,.csv"
					class="hidden"
					bind:this={fileInput}
					onchange={importBooks}
					disabled={importing}
				/>
			</label>
		</div>
	</div>

	<div
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 text-gray-900 sm:p-8">
			<div class="max-w-2xl">
				<h2 class="text-2xl font-bold tracking-tight">Add New Book</h2>
				<p class="mt-2 text-sm text-gray-500">
					Use the refined intake form to keep catalog entries consistent from the start.
				</p>
			</div>
			<div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
				<input
					type="text"
					bind:value={title}
					placeholder="Title"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 xl:col-span-2"
				/>
				<input
					type="text"
					bind:value={author}
					placeholder="Author"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 xl:col-span-1"
				/>
				<input
					type="text"
					bind:value={serialNo}
					placeholder="Serial No."
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 xl:col-span-1"
				/>
				<select
					bind:value={category}
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 xl:col-span-1"
				>
					<option value="">Category (optional)</option>
					{#each GENRES as genre (genre)}
						<option value={genre}>{genre}</option>
					{/each}
				</select>
				<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:col-span-1">
					<input
						type="number"
						bind:value={copies}
						min="1"
						placeholder="Copies"
						class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
					/>
					<button
						type="button"
						onclick={addBook}
						disabled={adding}
						class="rounded-full bg-[#1B6B3A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
						>{adding ? 'Adding…' : 'Add Book'}</button
					>
				</div>
			</div>
		</div>
	</div>

	{#if message}
		<p
			class={`mt-4 rounded-2xl px-4 py-3 text-sm ring-1 ${messageType === 'success' ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-red-50 text-red-600 ring-red-100'}`}
		>
			{message}
		</p>
	{/if}

	<div class="mt-12 max-w-3xl">
		<h2 class="text-2xl font-bold tracking-tight text-gray-900">Search Books</h2>
		<p class="mt-2 text-sm text-gray-500">
			Locate titles fast, then edit metadata inline without leaving the table.
		</p>
	</div>
	<div
		class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-5 sm:p-6">
			<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
				<input
					type="text"
					bind:value={query}
					placeholder="Search by title, author, or serial…"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<button
					type="button"
					onclick={search}
					disabled={loading}
					class="rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
					>{loading ? 'Searching…' : 'Search'}</button
				>
			</div>
		</div>
	</div>

	{#if searched}
		{#if books.length === 0}
			<div
				class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-12 text-center text-gray-900">
					<p class="text-lg font-semibold">No books found</p>
					<p class="mt-2 text-sm text-gray-500">
						Try a broader title, author, or serial number query.
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
									>Title</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Author</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Category</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Serial</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Copies</th
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
							{#each books as book (book.id)}
								<tr class="transition-colors duration-200 hover:bg-gray-50/50">
									<td class="px-6 py-4 font-semibold text-gray-900">{book.title}</td>
									<td class="px-6 py-4 text-gray-600">{book.author}</td>
									<td class="px-6 py-4 text-gray-500">
										{#if editingId === book.id}
											<select
												bind:value={editCategory}
												class="w-full rounded-xl border-0 bg-gray-50/80 px-3 py-2 text-xs ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
											>
												<option value="">None</option>
												{#each GENRES as genre (genre)}
													<option value={genre}>{genre}</option>
												{/each}
											</select>
										{:else}
											{book.category ?? '—'}
										{/if}
									</td>
									<td class="px-6 py-4 text-gray-500">{book.serial_no}</td>
									<td class="px-6 py-4 text-gray-600">
										{#if editingId === book.id}
											<input
												type="number"
												bind:value={editCopies}
												min="1"
												class="w-20 rounded-xl border-0 bg-gray-50/80 px-3 py-2 text-xs ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
											/>
										{:else}
											{book.available_copies} / {book.total_copies}
										{/if}
									</td>
									<td class="px-6 py-4">
										<span
											class={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${book.available_copies > 0 ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-red-50 text-red-600 ring-red-100'}`}
											>{book.available_copies > 0 ? 'Available' : 'All Borrowed'}</span
										>
									</td>
									<td class="px-6 py-4 text-right">
										<div class="flex justify-end gap-2">
											{#if editingId === book.id}
												<button
													onclick={() => saveEdit(book.id)}
													disabled={saving}
													class="rounded-full bg-[#1B6B3A] px-4 py-2 text-xs font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] active:scale-[0.98] disabled:opacity-50"
													>{saving ? 'Saving…' : 'Save'}</button
												>
												<button
													onclick={cancelEdit}
													class="rounded-full bg-white px-4 py-2 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
													>Cancel</button
												>
											{:else}
												<button
													onclick={() => startEdit(book)}
													class="rounded-full bg-white px-4 py-2 text-xs font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
													>Edit</button
												>
												<button
													onclick={() => deleteBook(book.id)}
													disabled={deletingId === book.id}
													class="rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-red-100 active:scale-[0.98] disabled:opacity-50"
													>{deletingId === book.id ? 'Deleting…' : 'Delete'}</button
												>
											{/if}
										</div>
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
