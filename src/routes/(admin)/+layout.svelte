<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import type { LayoutData } from './$types';

	let { data, children } = $props<{ data: LayoutData; children: Snippet }>();
	let mobileOpen = $state(false);
	let notificationRefreshKey = $state(0);

	onMount(() => {
		void (async () => {
			await fetch('/api/notifications/check', { method: 'POST' });
			notificationRefreshKey += 1;
		})();
	});
</script>

<div class="min-h-[100dvh] bg-[#FAFAF9] pb-12">
	{#if mobileOpen}
		<div class="fixed inset-0 z-40 bg-white/90 backdrop-blur-3xl sm:hidden">
			<div class="flex min-h-[100dvh] flex-col px-6 py-24">
				<div class="space-y-3">
					<a
						href={resolve('/admin/dashboard')}
						onclick={() => (mobileOpen = false)}
						class="block text-3xl font-semibold tracking-tight text-gray-900"
						style="animation: nav-reveal 0.45s cubic-bezier(0.32,0.72,0,1) both; animation-delay: 0.05s;"
					>
						Dashboard
					</a>
					<a
						href={resolve('/admin/books')}
						onclick={() => (mobileOpen = false)}
						class="block text-3xl font-semibold tracking-tight text-gray-900"
						style="animation: nav-reveal 0.45s cubic-bezier(0.32,0.72,0,1) both; animation-delay: 0.12s;"
					>
						Books
					</a>
					{#if data.profile?.role === 'admin' || data.profile?.role === 'moderator'}
						<a
							href={resolve('/admin/users')}
							onclick={() => (mobileOpen = false)}
							class="block text-3xl font-semibold tracking-tight text-gray-900"
							style="animation: nav-reveal 0.45s cubic-bezier(0.32,0.72,0,1) both; animation-delay: 0.19s;"
						>
							Users
						</a>
					{/if}
					<a
						href={resolve('/admin/borrows')}
						onclick={() => (mobileOpen = false)}
						class="block text-3xl font-semibold tracking-tight text-gray-900"
						style="animation: nav-reveal 0.45s cubic-bezier(0.32,0.72,0,1) both; animation-delay: 0.26s;"
					>
						Borrows
					</a>
					<a
						href={resolve('/admin/reports')}
						onclick={() => (mobileOpen = false)}
						class="block text-3xl font-semibold tracking-tight text-gray-900"
						style="animation: nav-reveal 0.45s cubic-bezier(0.32,0.72,0,1) both; animation-delay: 0.33s;"
					>
						Reports
					</a>
				</div>
				<div
					class="mt-auto rounded-[2rem] bg-white/70 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
				>
					<div class="rounded-[calc(2rem-0.375rem)] bg-white px-5 py-5">
						<div class="flex items-center justify-between gap-4">
							<div>
								<p class="text-xs font-medium tracking-[0.2em] text-gray-400 uppercase">
									Admin Portal
								</p>
								<p class="mt-2 text-lg font-semibold text-gray-900">
									{data.profile?.name ?? 'Admin'}
								</p>
							</div>
							<div class="flex items-center gap-3">
								<NotificationBell refreshKey={notificationRefreshKey} />
								<button
									onclick={async () => {
										await fetch('/api/auth/logout', { method: 'POST' });
										window.location.href = '/login';
									}}
									class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
								>
									Logout
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<nav class="relative z-50 mt-4 px-4">
		<div
			class="mx-auto max-w-5xl rounded-2xl bg-white/70 px-4 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06] backdrop-blur-xl sm:px-6"
		>
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<img
						src="/logo.png"
						alt="SPCBA"
						class="h-10 w-10 rounded-2xl shadow-[0_10px_25px_rgba(27,107,58,0.14)]"
					/>
					<div>
						<p class="text-sm font-semibold tracking-tight text-gray-900">SPCBA Library</p>
						<p class="text-xs text-gray-500">Admin Portal</p>
					</div>
				</div>

				<button
					onclick={() => (mobileOpen = !mobileOpen)}
					class="relative z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-700 ring-1 ring-black/[0.06] transition-all duration-300 hover:bg-white sm:hidden"
					aria-label="Toggle menu"
				>
					<div class="relative h-4 w-4">
						<span
							class={`absolute top-0 left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'translate-y-[0.45rem] rotate-45' : ''}`}
						></span>
						<span
							class={`absolute top-[0.45rem] left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`}
						></span>
						<span
							class={`absolute top-[0.9rem] left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${mobileOpen ? '-translate-y-[0.45rem] -rotate-45' : ''}`}
						></span>
					</div>
				</button>

				<div class="hidden items-center gap-6 sm:flex">
					<a
						href={resolve('/admin/dashboard')}
						class="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-gray-900"
						>Dashboard</a
					>
					<a
						href={resolve('/admin/books')}
						class="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-gray-900"
						>Books</a
					>
					{#if data.profile?.role === 'admin' || data.profile?.role === 'moderator'}
						<a
							href={resolve('/admin/users')}
							class="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-gray-900"
							>Users</a
						>
					{/if}
					<a
						href={resolve('/admin/borrows')}
						class="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-gray-900"
						>Borrows</a
					>
					<a
						href={resolve('/admin/reports')}
						class="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-gray-900"
						>Reports</a
					>
					<NotificationBell refreshKey={notificationRefreshKey} />
					<div class="h-6 w-px bg-gray-300"></div>
					<span
						class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-black/[0.04]"
						>{data.profile?.name ?? 'Admin'}</span
					>
					<button
						onclick={async () => {
							await fetch('/api/auth/logout', { method: 'POST' });
							window.location.href = '/login';
						}}
						class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-black/[0.08] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-gray-50 hover:ring-black/[0.12] active:scale-[0.98]"
					>
						Logout
					</button>
				</div>
			</div>
		</div>
	</nav>

	<div class="pt-2">
		{@render children()}
	</div>
</div>

<style>
	@keyframes nav-reveal {
		from {
			opacity: 0;
			transform: translateY(14px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
