import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const [{ data: notifications, error: notificationsError }, { count, error: countError }] =
		await Promise.all([
			locals.supabase
				.from('notifications')
				.select('id, user_id, type, title, message, read, reference_id, created_at')
				.eq('user_id', locals.user.id)
				.order('created_at', { ascending: false })
				.limit(20),
			locals.supabase
				.from('notifications')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', locals.user.id)
				.eq('read', false)
		]);

	if (notificationsError) return json({ message: notificationsError.message }, { status: 500 });
	if (countError) return json({ message: countError.message }, { status: 500 });

	return json({ notifications: notifications ?? [], unreadCount: count ?? 0 });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	let query = locals.supabase.from('notifications').update({ read: true }).eq('user_id', locals.user.id);

	if (body?.all === true) {
		query = query.eq('read', false);
	} else if (Array.isArray(body?.ids) && body.ids.length > 0) {
		query = query.in('id', body.ids);
	} else {
		return json({ message: 'Provide ids or all=true.' }, { status: 400 });
	}

	const { error } = await query;
	if (error) return json({ message: error.message }, { status: 500 });

	return json({ success: true });
};
