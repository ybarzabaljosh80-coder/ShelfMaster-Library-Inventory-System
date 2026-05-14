<script lang="ts">
	import type { Notification } from '$lib/types';

	let { refreshKey = 0 } = $props<{ refreshKey?: number }>();

	let open = $state(false);
	let loading = $state(false);
	let notifications = $state<Notification[]>([]);
	let unreadCount = $state(0);
	let container = $state<HTMLDivElement | null>(null);

	const typeStyles: Record<Notification['type'], { dot: string; label: string }> = {
		reservation_ready: { dot: 'bg-[#1B6B3A]', label: 'Ready' },
		due_soon: { dot: 'bg-[#C5A832]', label: 'Soon' },
		due_today: { dot: 'bg-orange-500', label: 'Today' },
		overdue: { dot: 'bg-red-500', label: 'Overdue' }
	};

	function formatTimeAgo(dateString: string) {
		const diffMs = Date.now() - new Date(dateString).getTime();
		const minutes = Math.max(1, Math.floor(diffMs / 60000));
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(dateString).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function loadNotifications() {
		loading = true;
		const res = await fetch('/api/notifications');
		const data = await res.json();
		loading = false;

		if (!res.ok) return;
		notifications = data.notifications ?? [];
		unreadCount = data.unreadCount ?? 0;
	}

	async function markAllAsRead() {
		if (unreadCount === 0) return;

		const res = await fetch('/api/notifications', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ all: true })
		});

		if (!res.ok) return;
		notifications = notifications.map((notification) => ({ ...notification, read: true }));
		unreadCount = 0;
	}

	$effect(() => {
		refreshKey;
		void loadNotifications();
	});

	$effect(() => {
		if (!open) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (container && !container.contains(event.target as Node)) {
				open = false;
			}
		};

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="relative" bind:this={container}>
	<button
		type="button"
		onclick={() => {
			open = !open;
			if (!open) return;
			void loadNotifications();
		}}
		class="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-gray-700 ring-1 ring-black/[0.06] transition-all duration-300 hover:bg-white"
		aria-label="Notifications"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
			<path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5" />
			<path d="M10 17a2 2 0 0 0 4 0" />
		</svg>
		{#if unreadCount > 0}
			<span class="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
		{/if}
	</button>

	{#if open}
		<div class="absolute right-0 z-50 mt-3 w-[22rem] rounded-[2rem] bg-white/70 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-2xl sm:w-[25rem]">
			<div class="rounded-[calc(2rem-0.375rem)] bg-white/95 p-4 text-gray-900">
				<div class="flex items-center justify-between gap-3 border-b border-black/5 px-2 pb-3">
					<div>
						<p class="text-sm font-semibold tracking-tight">Notifications</p>
						<p class="text-xs text-gray-500">{unreadCount} unread</p>
					</div>
					<button
						type="button"
						onclick={markAllAsRead}
						disabled={unreadCount === 0}
						class="rounded-full bg-[#FDF8E8] px-3 py-2 text-[11px] font-semibold text-[#C5A832] ring-1 ring-[#C5A832]/15 transition hover:bg-[#F8EFCF] disabled:opacity-50"
					>
						Mark all as read
					</button>
				</div>

				<div class="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
					{#if loading}
						<div class="rounded-3xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]">
							Loading notifications…
						</div>
					{:else if notifications.length === 0}
						<div class="rounded-3xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 ring-1 ring-black/[0.04]">
							You’re all caught up.
						</div>
					{:else}
						{#each notifications as notification (notification.id)}
							<div class={`rounded-[1.5rem] px-4 py-3 ring-1 transition ${notification.read ? 'bg-gray-50/80 ring-black/[0.04]' : 'bg-[#FDF8E8]/60 ring-[#C5A832]/15'}`}>
								<div class="flex items-start gap-3">
									<span class={`mt-1.5 h-2.5 w-2.5 rounded-full ${typeStyles[notification.type].dot}`}></span>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-3">
											<p class="truncate text-sm font-semibold tracking-tight">{notification.title}</p>
											<span class="text-[11px] text-gray-400">{formatTimeAgo(notification.created_at)}</span>
										</div>
										<p class="mt-1 text-sm leading-6 text-gray-500">{notification.message}</p>
										<div class="mt-2 flex items-center gap-2">
											<span class={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${notification.read ? 'bg-white text-gray-400 ring-1 ring-black/[0.05]' : 'bg-white text-gray-700 ring-1 ring-black/[0.05]'}`}>
												{notification.read ? 'Read' : 'New'}
											</span>
											<span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
												{typeStyles[notification.type].label}
											</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
