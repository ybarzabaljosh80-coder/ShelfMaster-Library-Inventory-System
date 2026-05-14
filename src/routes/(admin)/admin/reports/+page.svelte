<script lang="ts">
	let fromDate = $state('');
	let toDate = $state('');
	let downloading = $state(false);
	let message = $state('');

	async function downloadReport() {
		downloading = true;
		message = '';

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);

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
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		window.location.href = `/api/borrows/export?${params}`;
	}
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
						bind:value={fromDate}
						class="w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
					/>
				</div>
				<div class="space-y-2">
					<label for="to" class="block text-sm font-medium text-gray-700">To</label>
					<input
						id="to"
						type="date"
						bind:value={toDate}
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
</main>
