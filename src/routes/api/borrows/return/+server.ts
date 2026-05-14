import { json } from '@sveltejs/kit';
import { handleReturnedBook } from '$lib/server/reservations';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { borrow_id } = await request.json();
	if (!borrow_id) return json({ message: 'borrow_id is required.' }, { status: 400 });

	const { data: record } = await locals.supabase
		.from('borrow_records')
		.select('id, book_id, user_id, returned_at')
		.eq('id', borrow_id)
		.single();

	if (!record) return json({ message: 'Borrow record not found.' }, { status: 404 });
	if (record.user_id !== locals.user.id) return json({ message: 'Forbidden.' }, { status: 403 });
	if (record.returned_at) return json({ message: 'Already returned.' }, { status: 409 });

	const { error } = await locals.supabase
		.from('borrow_records')
		.update({ returned_at: new Date().toISOString() })
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
