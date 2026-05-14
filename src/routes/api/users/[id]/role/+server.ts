import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_ROLES = ['user', 'staff', 'moderator', 'admin'];

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
		return json({ message: 'Forbidden' }, { status: 403 });
	}

	// Prevent self-modification
	if (params.id === locals.user.id) {
		return json({ message: 'You cannot change your own role.' }, { status: 403 });
	}

	const { role } = await request.json();
	if (!VALID_ROLES.includes(role)) {
		return json({ message: 'Invalid role.' }, { status: 400 });
	}

	// Moderators can only assign user/staff, not admin/moderator
	if (profile.role === 'moderator' && (role === 'admin' || role === 'moderator')) {
		return json({ message: 'Moderators cannot promote to admin or moderator.' }, { status: 403 });
	}

	// Check target — moderators can't modify admins or other moderators
	if (profile.role === 'moderator') {
		const { data: target } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', params.id)
			.single();

		if (target?.role === 'admin' || target?.role === 'moderator') {
			return json({ message: 'Moderators cannot modify admins or other moderators.' }, { status: 403 });
		}
	}

	const { data, error } = await locals.supabase
		.from('profiles')
		.update({ role })
		.eq('id', params.id)
		.select('id, name, role, created_at')
		.single();

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data);
};
