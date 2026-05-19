import { json } from '@sveltejs/kit';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const adminRoles = ['admin', 'moderator'];
	if (!profile || !adminRoles.includes(profile.role)) {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	const serviceClient = createServiceRoleClient();
	if (!serviceClient) return json({ message: 'Service role not configured.' }, { status: 500 });

	const { data, error } = await serviceClient
		.from('reservations')
		.select('id, user_id, book_id, status, position, created_at, ready_at, expires_at, profiles(name), books(title, serial_no)')
		.in('status', ['waiting', 'ready'])
		.order('position', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data ?? []);
};
