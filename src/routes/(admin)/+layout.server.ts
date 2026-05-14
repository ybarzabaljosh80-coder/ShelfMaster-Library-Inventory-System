import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, name, role')
		.eq('id', locals.user.id)
		.single();

	const adminRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !adminRoles.includes(profile.role)) throw redirect(302, '/dashboard');

	return { profile };
};
