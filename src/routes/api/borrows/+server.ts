import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const userFilter = url.searchParams.get('user') ?? '';
	const bookFilter = url.searchParams.get('book') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';

	let query = locals.supabase
		.from('borrow_records')
		.select('id, borrowed_at, due_date, returned_at, force_returned, force_returned_by, user_id, book_id, profiles(name), books(title, author, serial_no)')
		.order('borrowed_at', { ascending: false });

	if (userFilter) {
		query = query.ilike('profiles.name', `%${userFilter}%`);
	}
	if (bookFilter) {
		query = query.ilike('books.title', `%${bookFilter}%`);
	}
	if (from) {
		query = query.gte('borrowed_at', from);
	}
	if (to) {
		query = query.lte('borrowed_at', to + 'T23:59:59.999Z');
	}

	const { data, error } = await query;

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data);
};
