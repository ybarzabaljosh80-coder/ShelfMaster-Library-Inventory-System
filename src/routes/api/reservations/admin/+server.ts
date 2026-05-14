import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	const { data, error } = await locals.supabase
		.from('reservations')
		.select('id, user_id, book_id, status, position, created_at, ready_at, expires_at, profiles(name), books(title, serial_no)')
		.in('status', ['waiting', 'ready'])
		.order('position', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data ?? []);
};
