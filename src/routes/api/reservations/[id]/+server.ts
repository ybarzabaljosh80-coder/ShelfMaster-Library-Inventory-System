import { json } from '@sveltejs/kit';
import { recalculateReservationPositions, releaseHeldReservationCopy } from '$lib/server/reservations';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const reservationId = params.id;
	const { data: reservation, error } = await locals.supabase
		.from('reservations')
		.select('id, user_id, book_id, status')
		.eq('id', reservationId)
		.maybeSingle();

	if (error) return json({ message: error.message }, { status: 500 });
	if (!reservation) return json({ message: 'Reservation not found.' }, { status: 404 });
	if (reservation.user_id !== locals.user.id) return json({ message: 'Forbidden.' }, { status: 403 });
	if (!['waiting', 'ready'].includes(reservation.status)) {
		return json({ message: 'Only active reservations can be cancelled.' }, { status: 409 });
	}

	const systemSupabase = createServiceRoleClient() ?? locals.supabase;
	const { error: cancelError } = await systemSupabase
		.from('reservations')
		.update({ status: 'cancelled' })
		.eq('id', reservation.id);

	if (cancelError) return json({ message: cancelError.message }, { status: 500 });

	try {
		if (reservation.status === 'ready') {
			await releaseHeldReservationCopy(systemSupabase, reservation.book_id);
		} else {
			await recalculateReservationPositions(systemSupabase, reservation.book_id);
		}
	} catch (helperError) {
		return json(
			{ message: helperError instanceof Error ? helperError.message : 'Failed to update queue.' },
			{ status: 500 }
		);
	}

	return json({ success: true });
};
