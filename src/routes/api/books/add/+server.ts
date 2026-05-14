import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	// Verify admin
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const { title, author, serial_no, category, total_copies } = await request.json();

	if (!title || !author || !serial_no) {
		return json({ message: 'Title, author, and serial number are required.' }, { status: 400 });
	}

	const copies = Math.max(1, parseInt(total_copies) || 1);
	const normalizedCategory =
		typeof category === 'string' && category.trim() ? category.trim() : null;

	const { data, error } = await locals.supabase
		.from('books')
		.insert({
			title,
			author,
			serial_no,
			category: normalizedCategory,
			total_copies: copies,
			available_copies: copies
		})
		.select()
		.single();

	if (error) {
		if (error.code === '23505') {
			return json({ message: 'A book with that serial number already exists.' }, { status: 409 });
		}
		return json({ message: error.message }, { status: 500 });
	}

	return json(data, { status: 201 });
};
