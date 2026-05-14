import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const { total_copies, category } = await request.json();

	// Get current book to calculate available_copies adjustment
	const { data: book } = await locals.supabase
		.from('books')
		.select('total_copies, available_copies')
		.eq('id', params.id)
		.single();

	if (!book) return json({ message: 'Book not found.' }, { status: 404 });

	const newTotal = Math.max(1, parseInt(total_copies) || book.total_copies);
	const diff = newTotal - book.total_copies;
	const newAvailable = Math.max(0, book.available_copies + diff);

	const { error } = await locals.supabase
		.from('books')
		.update({
			total_copies: newTotal,
			available_copies: newAvailable,
			category: category ?? null
		})
		.eq('id', params.id);

	if (error) return json({ message: error.message }, { status: 500 });

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	// Check for active borrows
	const { data: activeBorrows } = await locals.supabase
		.from('borrow_records')
		.select('id')
		.eq('book_id', params.id)
		.is('returned_at', null);

	if (activeBorrows && activeBorrows.length > 0) {
		return json(
			{ message: 'Cannot delete a book with active borrows. Force-return them first.' },
			{ status: 409 }
		);
	}

	const { error } = await locals.supabase.from('books').delete().eq('id', params.id);

	if (error) return json({ message: error.message }, { status: 500 });

	return json({ success: true });
};
