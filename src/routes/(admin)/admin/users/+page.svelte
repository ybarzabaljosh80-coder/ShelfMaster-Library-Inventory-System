<script lang="ts">
	import { onMount } from 'svelte';
	import type { LayoutData } from '../../$types';

	type AdminUser = { id: string; name: string; role: string; created_at: string };

	let { data: layoutData } = $props<{ data: LayoutData }>();

	let allUsers = $state<AdminUser[]>([]);
	let loading = $state(false);
	let updatingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let message = $state('');
	let messageType = $state<'success' | 'error'>('success');
	let searchQuery = $state('');
	let roleFilter = $state('');

	const currentUserId = $derived(layoutData.profile?.id);
	const currentUserRole = $derived(layoutData.profile?.role);

	const filteredUsers = $derived(() => {
		let result = allUsers;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter((u) => u.name.toLowerCase().includes(q));
		}
		if (roleFilter) {
			result = result.filter((u) => u.role === roleFilter);
		}
		return result;
	});

	const ROLES = ['user', 'staff', 'moderator', 'admin'];

	function availableRoles(targetUser: AdminUser): string[] {
		if (currentUserRole === 'admin') return ROLES;
		if (currentUserRole === 'moderator') {
			if (targetUser.role === 'admin' || targetUser.role === 'moderator') return [];
			return ['user', 'staff'];
		}
		return [];
	}

	onMount(() => {
		loadUsers();
	});

	async function loadUsers() {
		loading = true;
		message = '';

		const res = await fetch('/api/users');
		const data = await res.json();
		loading = false;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
			allUsers = [];
			return;
		}

		allUsers = data;
	}

	async function changeRole(user: AdminUser, newRole: string) {
		if (newRole === user.role) return;
		updatingId = user.id;
		message = '';

		const res = await fetch(`/api/users/${user.id}/role`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: newRole })
		});
		const data = await res.json();
		updatingId = null;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
			return;
		}

		allUsers = allUsers.map((u) => (u.id === user.id ? data : u));
		message = `${user.name} is now a ${newRole}.`;
		messageType = 'success';
	}

	async function deleteUser(user: AdminUser) {
		if (!confirm(`Remove "${user.name}" from the system? This cannot be undone.`)) return;
		deletingId = user.id;
		message = '';

		const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
		const data = await res.json();
		deletingId = null;

		if (!res.ok) {
			message = data.message;
			messageType = 'error';
			return;
		}

		allUsers = allUsers.filter((u) => u.id !== user.id);
		message = `${user.name} has been removed.`;
		messageType = 'success';
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function roleBadgeClass(role: string) {
		switch (role) {
			case 'admin':
				return 'bg-[#FDF8E8] text-[#C5A832] ring-[#C5A832]/15';
			case 'moderator':
				return 'bg-[#E8F5EC] text-[#1B6B3A] ring-[#1B6B3A]/10';
			case 'staff':
				return 'bg-[#E8F5EC] text-[#155A2F] ring-[#155A2F]/10';
			default:
				return 'bg-gray-100 text-gray-600 ring-black/[0.04]';
		}
	}
</script>

<svelte:head>
	<title>Manage Users — SPCBA Library</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-12">
	<div class="max-w-3xl">
		<h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
			Manage Users
		</h1>
		<p class="mt-4 text-sm leading-6 text-gray-500">
			Search accounts, adjust permissions, and keep administrative controls clearly separated by
			role.
		</p>
	</div>

	<div
		class="mt-10 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
	>
		<div class="rounded-[calc(2rem-0.375rem)] bg-white p-6 text-gray-900 sm:p-8">
			<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by name…"
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				/>
				<select
					bind:value={roleFilter}
					class="rounded-xl border-0 bg-gray-50/80 px-4 py-3 text-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30"
				>
					<option value="">All roles</option>
					<option value="user">User</option>
					<option value="staff">Staff</option>
					<option value="moderator">Moderator</option>
					<option value="admin">Admin</option>
				</select>
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

	{#if loading}
		<div
			class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-12 text-center text-gray-900">
				<p class="text-sm text-gray-500">Loading users…</p>
			</div>
		</div>
	{:else if filteredUsers().length === 0}
		<div
			class="mt-6 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="rounded-[calc(2rem-0.375rem)] bg-white px-8 py-12 text-center text-gray-900">
				<p class="text-sm text-gray-500">No users found.</p>
			</div>
		</div>
	{:else}
		<p class="mt-4 text-xs text-gray-500">{filteredUsers().length} user(s)</p>
		<div
			class="mt-3 rounded-[2rem] bg-white/60 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]"
		>
			<div class="overflow-x-auto rounded-[calc(2rem-0.375rem)] bg-white">
				<table class="w-full text-sm text-gray-900">
					<thead>
						<tr class="border-b border-gray-100 bg-gray-50/50">
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Name</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Role</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Joined</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Change Role</th
							>
							<th
								class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
							></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each filteredUsers() as user (user.id)}
							{@const isSelf = user.id === currentUserId}
							{@const roles = availableRoles(user)}
							<tr
								class={`transition-colors duration-200 hover:bg-gray-50/50 ${isSelf ? 'bg-[#E8F5EC]' : ''}`}
							>
								<td class="px-6 py-4 font-semibold text-gray-900">
									{user.name}
									{#if isSelf}
										<span
											class="ml-2 rounded-full bg-[#1B6B3A] px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-white uppercase"
											>you</span
										>
									{/if}
								</td>
								<td class="px-6 py-4">
									<span
										class={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${roleBadgeClass(user.role)}`}
										>{user.role}</span
									>
								</td>
								<td class="px-6 py-4 text-gray-600">{formatDate(user.created_at)}</td>
								<td class="px-6 py-4">
									{#if isSelf}
										<span class="text-xs text-gray-400 italic">Cannot change own role</span>
									{:else if roles.length === 0}
										<span class="text-xs text-gray-400 italic">No permission</span>
									{:else}
										<select
											value={user.role}
											onchange={(e) => changeRole(user, (e.target as HTMLSelectElement).value)}
											disabled={updatingId === user.id}
											class="rounded-xl border-0 bg-gray-50/80 px-3 py-2 text-xs ring-1 ring-black/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none focus:bg-white focus:ring-2 focus:ring-[#1B6B3A]/30 disabled:opacity-50"
										>
											{#each roles as role (role)}
												<option value={role}>{role}</option>
											{/each}
										</select>
									{/if}
									{#if updatingId === user.id}
										<span class="ml-2 text-xs text-gray-400">Saving…</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-right">
									{#if !isSelf && roles.length > 0}
										<button
											onclick={() => deleteUser(user)}
											disabled={deletingId === user.id}
											class="rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-red-100 active:scale-[0.98] disabled:opacity-50"
											>{deletingId === user.id ? 'Removing…' : 'Remove'}</button
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
</main>
