import { json } from '@sveltejs/kit';
import { handleReturnedBook } from '$lib/server/reservations';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const { borrow_id } = await request.json();
	if (!borrow_id) return json({ message: 'borrow_id is required.' }, { status: 400 });

	const { data: record } = await locals.supabase
		.from('borrow_records')
		.select('id, book_id, returned_at')
		.eq('id', borrow_id)
		.single();

	if (!record) return json({ message: 'Borrow record not found.' }, { status: 404 });
	if (record.returned_at) return json({ message: 'Already returned.' }, { status: 409 });

	const { error } = await locals.supabase
		.from('borrow_records')
		.update({
			returned_at: new Date().toISOString(),
			force_returned: true,
			force_returned_by: locals.user.id
		})
		.eq('id', borrow_id);

	if (error) return json({ message: error.message }, { status: 500 });

	try {
		await handleReturnedBook(createServiceRoleClient() ?? locals.supabase, record.book_id);
	} catch (helperError) {
		return json(
			{ message: helperError instanceof Error ? helperError.message : 'Failed to update reservations.' },
			{ status: 500 }
		);
	}

	return json({ success: true });
};
