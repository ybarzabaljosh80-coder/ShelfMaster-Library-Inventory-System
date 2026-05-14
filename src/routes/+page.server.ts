import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const adminRoles = ['admin', 'staff', 'moderator'];
	throw redirect(302, adminRoles.includes(profile?.role ?? '') ? '/admin/dashboard' : '/dashboard');
};
