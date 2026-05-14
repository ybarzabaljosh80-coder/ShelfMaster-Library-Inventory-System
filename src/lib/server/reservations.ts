import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '$lib/server/supabase';

export const ACTIVE_RESERVATION_STATUSES = ['waiting', 'ready'] as const;

function getReservationClient(fallback: SupabaseClient) {
	return createServiceRoleClient() ?? fallback;
}

async function notifyReservationReady(
	supabase: SupabaseClient,
	userId: string,
	reservationId: string,
	bookId: string
) {
	const { data: book, error: bookError } = await supabase
		.from('books')
		.select('title, serial_no')
		.eq('id', bookId)
		.maybeSingle();

	if (bookError) throw new Error(bookError.message);

	const title = 'Your reservation is ready!';
	const message = book
		? `${book.title} (${book.serial_no}) is ready for pickup. Please borrow it within 2 days.`
		: 'Your reserved book is ready for pickup. Please borrow it within 2 days.';

	const { error } = await supabase.from('notifications').insert({
		user_id: userId,
		type: 'reservation_ready',
		title,
		message,
		reference_id: reservationId
	});

	if (error) throw new Error(error.message);
}

export async function recalculateReservationPositions(supabase: SupabaseClient, bookId: string) {
	const client = getReservationClient(supabase);
	const { data: reservations, error } = await client
		.from('reservations')
		.select('id, position, created_at')
		.eq('book_id', bookId)
		.in('status', [...ACTIVE_RESERVATION_STATUSES])
		.order('position', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) throw new Error(error.message);

	for (const [index, reservation] of (reservations ?? []).entries()) {
		const nextPosition = index + 1;
		if (reservation.position === nextPosition) continue;

		const { error: updateError } = await client
			.from('reservations')
			.update({ position: nextPosition })
			.eq('id', reservation.id);

		if (updateError) throw new Error(updateError.message);
	}
}

export async function promoteNextReservation(supabase: SupabaseClient, bookId: string) {
	const client = getReservationClient(supabase);
	const { data: nextReservation, error } = await client
		.from('reservations')
		.select('id, user_id, position, created_at')
		.eq('book_id', bookId)
		.eq('status', 'waiting')
		.order('position', { ascending: true })
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!nextReservation) return null;

	const readyAt = new Date();
	const expiresAt = new Date(readyAt);
	expiresAt.setDate(expiresAt.getDate() + 2);

	const { error: updateError } = await client
		.from('reservations')
		.update({
			status: 'ready',
			ready_at: readyAt.toISOString(),
			expires_at: expiresAt.toISOString()
		})
		.eq('id', nextReservation.id)
		.eq('status', 'waiting');

	if (updateError) throw new Error(updateError.message);

	await notifyReservationReady(client, nextReservation.user_id, nextReservation.id, bookId);

	return {
		...nextReservation,
		status: 'ready' as const,
		ready_at: readyAt.toISOString(),
		expires_at: expiresAt.toISOString()
	};
}

export async function handleReturnedBook(supabase: SupabaseClient, bookId: string) {
	const client = getReservationClient(supabase);
	await recalculateReservationPositions(client, bookId);

	const promoted = await promoteNextReservation(client, bookId);
	if (promoted) {
		return { promoted: true, reservation: promoted };
	}

	const { error } = await client.rpc('increment_available_copies', { book_id_input: bookId });
	if (error) throw new Error(error.message);

	return { promoted: false, reservation: null };
}

export async function releaseHeldReservationCopy(supabase: SupabaseClient, bookId: string) {
	const client = getReservationClient(supabase);
	await recalculateReservationPositions(client, bookId);

	const promoted = await promoteNextReservation(client, bookId);
	if (promoted) {
		return { promoted: true, incremented: false, reservation: promoted };
	}

	const { error } = await client.rpc('increment_available_copies', { book_id_input: bookId });
	if (error) throw new Error(error.message);

	return { promoted: false, incremented: true, reservation: null };
}
