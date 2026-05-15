import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/supabase';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	// Prevent self-deletion
	if (params.id === locals.user.id) {
		return json({ message: 'You cannot remove yourself.' }, { status: 403 });
	}

	// Check target role — moderators can't remove admins or other moderators
	const { data: target } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', params.id)
		.single();

	if (!target) return json({ message: 'User not found.' }, { status: 404 });

	if (profile.role === 'moderator' && (target.role === 'admin' || target.role === 'moderator')) {
		return json({ message: 'Moderators cannot remove admins or other moderators.' }, { status: 403 });
	}

	const serviceClient = createServiceRoleClient();
	if (!serviceClient) return json({ message: 'Service role not configured.' }, { status: 500 });

	// Check for active borrows
	const { data: activeBorrows, error: activeBorrowsError } = await serviceClient
		.from('borrow_records')
		.select('id')
		.eq('user_id', params.id)
		.is('returned_at', null);

	if (activeBorrowsError) return json({ message: activeBorrowsError.message }, { status: 500 });

	if (activeBorrows && activeBorrows.length > 0) {
		return json(
			{ message: `Cannot remove user with ${activeBorrows.length} active borrow(s). Force-return them first.` },
			{ status: 409 }
		);
	}

	const { error: forceReturnedByError } = await serviceClient
		.from('borrow_records')
		.update({ force_returned_by: null })
		.eq('force_returned_by', params.id);

	if (forceReturnedByError) return json({ message: forceReturnedByError.message }, { status: 500 });

	const { error: borrowHistoryError } = await serviceClient
		.from('borrow_records')
		.delete()
		.eq('user_id', params.id)
		.not('returned_at', 'is', null);

	if (borrowHistoryError) return json({ message: borrowHistoryError.message }, { status: 500 });

	// Delete the Supabase Auth user; the profile is removed by the auth.users FK cascade.
	const { error } = await serviceClient.auth.admin.deleteUser(params.id);

	if (error) return json({ message: error.message }, { status: 500 });

	return json({ success: true });
};
