<script lang="ts">
	let loggingOut = $state(false);

	async function logout() {
		loggingOut = true;
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Pending Approval — SPCBA Library</title>
</svelte:head>

<div class="relative min-h-[100dvh] overflow-hidden bg-[#FAFAF9] px-4 py-10">
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(27,107,58,0.10),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.04),_transparent_34%)]"
	></div>
	<div
		class="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl items-center justify-center"
	>
		<div class="w-full max-w-md">
			<div
				class="rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] backdrop-blur-xl"
			>
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-10 sm:px-10 text-center">
					<img src="/logo.png" alt="SPCBA" class="mx-auto h-20 w-20" />
					<div class="mt-6 space-y-3">
						<h1 class="text-3xl font-extrabold tracking-tight text-gray-900">Pending Approval</h1>
						<p class="text-sm leading-6 text-gray-500">
							Your account has been created and is awaiting approval from a librarian. You will be
							notified once access is granted.
						</p>
					</div>
					<button
						onclick={logout}
						disabled={loggingOut}
						class="mt-8 w-full rounded-full bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 ring-1 ring-black/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loggingOut ? 'Signing out…' : 'Back to Login'}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
