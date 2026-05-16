import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, name, role')
		.eq('id', locals.user.id)
		.single();

	if (!profile) {
		const meta = locals.user.user_metadata;
		const { data: created } = await locals.supabase
			.from('profiles')
			.insert({ id: locals.user.id, name: meta?.name ?? locals.user.email ?? 'User', role: 'pending' })
			.select('id, name, role')
			.single();

		if (!created) throw redirect(302, '/login');
		if (created.role === 'admin') throw redirect(302, '/admin/dashboard');
		return { profile: created };
	}

	const adminRoles = ['admin', 'staff', 'moderator'];
	if (adminRoles.includes(profile.role)) throw redirect(302, '/admin/dashboard');
	if (profile.role === 'pending') throw redirect(302, '/pending-approval');

	return { profile };
};
