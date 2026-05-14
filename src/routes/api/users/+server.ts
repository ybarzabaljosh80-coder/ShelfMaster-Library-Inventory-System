import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	const { data, error } = await locals.supabase
		.from('profiles')
		.select('id, name, role, created_at')
		.order('created_at', { ascending: false });

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data ?? []);
};
