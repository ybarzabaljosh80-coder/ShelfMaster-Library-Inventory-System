<script lang="ts">
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		error = '';

		if (!email.trim()) {
			error = 'Email is required.';
			return;
		}
		if (!password) {
			error = 'Password is required.';
			return;
		}

		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.message || 'Login failed. Please try again.';
				loading = false;
				return;
			}

			window.location.href = data.redirect;
		} catch {
			error = 'Network error. Please check your connection.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login — SPCBA Library</title>
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
				<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-10 sm:px-10">
					<div class="mb-8 space-y-4 text-center">
						<img src="/logo.png" alt="SPCBA" class="mx-auto h-20 w-20" />
						<div class="space-y-3">
							<h1 class="text-4xl font-extrabold tracking-tight text-gray-900">Welcome back</h1>
							<p class="text-sm leading-6 text-gray-500">
								Sign in to review borrows, manage books, and keep your library in motion.
							</p>
						</div>
					</div>

					<form class="space-y-5">
						<div class="space-y-2">
							<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								autocomplete="email"
								placeholder="you@example.com"
								class="block w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
							/>
						</div>

						<div class="space-y-2">
							<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
							<input
								id="password"
								type="password"
								bind:value={password}
								required
								autocomplete="current-password"
								placeholder="••••••••"
								class="block w-full rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
							/>
						</div>

						{#if error}
							<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
								{error}
							</p>
						{/if}

						<button
							type="button"
							onclick={handleLogin}
							disabled={loading}
							class="w-full rounded-full bg-[#1B6B3A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#155A2F] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? 'Signing in…' : 'Sign In'}
						</button>
					</form>

					<p class="mt-6 text-center text-sm text-gray-500">
						Don&apos;t have an account?
						<a
							href={resolve('/register')}
							class="font-semibold text-[#1B6B3A] transition-colors duration-300 hover:text-[#155A2F]"
							>Register</a
						>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
