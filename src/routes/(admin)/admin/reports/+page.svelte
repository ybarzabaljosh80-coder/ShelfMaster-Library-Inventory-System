<script lang="ts">
	import { onMount } from 'svelte';

	type BorrowRecord = {
		id: string;
		borrowed_at: string;
		returned_at?: string | null;
		force_returned?: boolean | null;
		profiles?: { name?: string | null } | null;
		books?: { title?: string | null; author?: string | null; serial_no?: string | null } | null;
	};

	let fromDate = $state('');
	let toDate = $state('');
	let downloading = $state(false);
	let message = $state('');
	let records = $state<BorrowRecord[]>([]);
	let previewLoading = $state(false);
	let previewError = $state('');

	let reportRangeLabel = $derived.by(() => {
		if (fromDate && toDate && fromDate === toDate) return `for ${formatDate(fromDate)}`;
		if (fromDate && toDate) return `from ${formatDate(fromDate)} to ${formatDate(toDate)}`;
		if (fromDate) return `from ${formatDate(fromDate)}`;
		if (toDate) return `through ${formatDate(toDate)}`;
		return 'for the full archive';
	});

	function buildDateParams() {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		return params;
	}

	async function loadPreview() {
		previewLoading = true;
		previewError = '';

		try {
			const res = await fetch(`/api/borrows?${buildDateParams()}`);
			const data = await res.json();

			if (!res.ok) {
				previewError = data.message || 'Failed to load report preview.';
				records = [];
				return;
			}

			records = data;
		} catch {
			previewError = 'Unable to load report preview.';
			records = [];
		} finally {
			previewLoading = false;
		}
	}

	function updateFromDate(event: Event) {
		fromDate = (event.currentTarget as HTMLInputElement).value;
		message = '';
		void loadPreview();
	}

	function updateToDate(event: Event) {
		toDate = (event.currentTarget as HTMLInputElement).value;
		message = '';
		void loadPreview();
	}

	function formatDate(dateStr: string) {
		const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function downloadReport() {
		downloading = true;
		message = '';

		const params = buildDateParams();

		try {
			const res = await fetch(`/api/reports?${params}`);

			if (!res.ok) {
				const data = await res.json();
				message = data.message || 'Failed to generate report.';
				downloading = false;
				return;
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `borrow-report-${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			message = 'Report downloaded!';
		} catch {
			message = 'An error occurred.';
		}

		downloading = false;
	}

	function downloadExcel() {
		const params = buildDateParams();
		window.location.href = `/api/borrows/export?${params}`;
	}

	onMount(() => {
		void loadPreview();
	});
</script>

<svelte:head>
	<title>Reports — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Reports</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			Generate polished exports for circulation history with a clean date-range workflow.
		</p>
	</div>

	<div
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 text-gray-900 sm:p-8">
			<div class="max-w-2xl">
				<h2 class="text-2xl font-bold tracking-tight">Borrow Report</h2>
				<p class="mt-2 text-sm leading-6 text-gray-500">
					Select a date range to filter records. Leave both fields blank to include the full
					archive.
				</p>
			</div>
			<div class="mt-6 grid gap-4 lg:grid-cols-[repeat(2,minmax(0,220px))_auto_auto] lg:items-end">
				<div class="space-y-2">
					<label for="from" class="block text-sm font-medium text-gray-700">From</label>
					<input
						id="from"
						type="date"
						value={fromDate}
						onchange={updateFromDate}
						class="w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
					/>
				</div>
				<div class="space-y-2">
					<label for="to" class="block text-sm font-medium text-gray-700">To</label>
					<input
						id="to"
						type="date"
						value={toDate}
						onchange={updateToDate}
						class="w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
					/>
				</div>
				<button
					type="button"
					onclick={downloadReport}
					disabled={downloading}
					class="rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
					>{downloading ? 'Generating…' : 'Download CSV'}</button
				>
				<button
					type="button"
					onclick={downloadExcel}
					class="rounded-full bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
					>Download Excel</button
				>
			</div>

			{#if message}
				<p
					class="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700 ring-1 ring-green-100"
				>
					{message}
				</p>
			{/if}
		</div>
	</div>

	<section
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 text-gray-900 sm:p-8">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="text-2xl font-bold tracking-tight">Preview</h2>
					<p class="mt-2 text-sm leading-6 text-gray-500">
						{#if previewLoading}
							Loading borrow records {reportRangeLabel}.
						{:else}
							Showing {records.length} borrow {records.length === 1 ? 'record' : 'records'}
							{reportRangeLabel}.
						{/if}
					</p>
				</div>
				<button
					type="button"
					onclick={loadPreview}
					disabled={previewLoading}
					class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98] disabled:opacity-60"
				>
					{previewLoading ? 'Refreshing…' : 'Refresh preview'}
				</button>
			</div>

			{#if previewError}
				<p class="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
					{previewError}
				</p>
			{:else if previewLoading}
				<div
					class="mt-6 rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]"
				>
					Loading borrow report preview…
				</div>
			{:else if records.length === 0}
				<div
					class="mt-6 rounded-3xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]"
				>
					No borrow records match this date range.
				</div>
			{:else}
				<div class="mt-6 overflow-x-auto rounded-[1.75rem] ring-1 ring-black/[0.04]">
					<table class="w-full text-sm text-gray-900">
						<thead>
							<tr class="border-b border-gray-100 bg-gray-50/60">
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
									>Author</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Borrowed</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Returned</th
								>
								<th
									class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
									>Status</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-50 bg-white">
							{#each records as record (record.id)}
								<tr class="transition-colors duration-200 hover:bg-gray-50/50">
									<td class="px-6 py-4 font-semibold text-gray-900"
										>{record.profiles?.name ?? '—'}</td
									>
									<td class="px-6 py-4">
										<p class="font-semibold text-gray-900">{record.books?.title ?? '—'}</p>
										<p class="mt-1 text-xs text-gray-400">{record.books?.serial_no ?? ''}</p>
									</td>
									<td class="px-6 py-4 text-gray-600">{record.books?.author ?? '—'}</td>
									<td class="px-6 py-4 text-gray-600">{formatDate(record.borrowed_at)}</td>
									<td class="px-6 py-4 text-gray-600"
										>{record.returned_at ? formatDate(record.returned_at) : '—'}</td
									>
									<td class="px-6 py-4">
										{#if record.returned_at}
											<span
												class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 ring-1 ring-black/[0.04]"
											>
												{record.force_returned ? 'Force Returned' : 'Returned'}
											</span>
										{:else}
											<span
												class="rounded-full bg-[#E8F5EC] px-3 py-1 text-xs font-medium text-[#1B6B3A] ring-1 ring-[#1B6B3A]/10"
												>Active</span
											>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</section>
</main>
