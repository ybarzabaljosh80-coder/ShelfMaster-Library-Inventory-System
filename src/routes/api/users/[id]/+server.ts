import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

	// Check for active borrows
	const { data: activeBorrows } = await locals.supabase
		.from('borrow_records')
		.select('id')
		.eq('user_id', params.id)
		.is('returned_at', null);

	if (activeBorrows && activeBorrows.length > 0) {
		return json(
			{ message: `Cannot remove user with ${activeBorrows.length} active borrow(s). Force-return them first.` },
			{ status: 409 }
		);
	}

	// Delete profile (cascades from auth.users FK, but we delete profile directly)
	const { error } = await locals.supabase.from('profiles').delete().eq('id', params.id);

	if (error) return json({ message: error.message }, { status: 500 });

	return json({ success: true });
};
