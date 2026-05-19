import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { email, password } = await request.json();

	if (!email || !password) {
		return json({ message: 'Email and password are required.' }, { status: 400 });
	}

	const { data, error } = await locals.supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return json({ message: error.message }, { status: 401 });
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', data.user.id)
		.single();

	if (profile?.role === 'pending') {
		return json({ redirect: '/pending-approval' });
	}

	const adminRoles = ['admin', 'moderator'];
	return json({ redirect: adminRoles.includes(profile?.role ?? '') ? '/admin/dashboard' : '/dashboard' });
};
