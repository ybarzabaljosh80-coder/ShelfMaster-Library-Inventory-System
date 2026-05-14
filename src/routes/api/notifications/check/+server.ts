import { json } from '@sveltejs/kit';
import { generateDueNotifications, processExpiredReservations } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	try {
		const [dueNotifications, expiredReservations] = await Promise.all([
			generateDueNotifications(locals.supabase, locals.user.id),
			processExpiredReservations(locals.supabase)
		]);

		return json({
			success: true,
			dueNotificationsCreated: dueNotifications.createdCount,
			expiredReservations: expiredReservations.expiredCount,
			promotedReservations: expiredReservations.promotedCount
		});
	} catch (error) {
		return json(
			{ message: error instanceof Error ? error.message : 'Failed to check notifications.' },
			{ status: 500 }
		);
	}
};
