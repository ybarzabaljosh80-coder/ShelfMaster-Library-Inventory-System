import { json } from '@sveltejs/kit';
import { recalculateReservationPositions } from '$lib/server/reservations';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { book_id, borrow_days } = await request.json();
	if (!book_id) return json({ message: 'book_id is required.' }, { status: 400 });

	const days = [1, 3, 5].includes(borrow_days) ? borrow_days : 5;
	const due_date = new Date();
	due_date.setDate(due_date.getDate() + days);

	const systemSupabase = createServiceRoleClient() ?? locals.supabase;
	const { data: book, error: bookError } = await systemSupabase
		.from('books')
		.select('id, total_copies, available_copies')
		.eq('id', book_id)
		.single();

	if (bookError) return json({ message: bookError.message }, { status: 500 });
	if (!book) return json({ message: 'Book not found.' }, { status: 404 });

	const nowIso = new Date().toISOString();

	const { count: activeBorrowCount, error: activeBorrowCountError } = await locals.supabase
		.from('borrow_records')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', locals.user.id)
		.is('returned_at', null);

	if (activeBorrowCountError) {
		return json({ message: activeBorrowCountError.message }, { status: 500 });
	}

	if ((activeBorrowCount ?? 0) >= 3) {
		return json(
			{
				message: 'You have reached the maximum of 3 active borrows. Please return a book first.'
			},
			{ status: 409 }
		);
	}

	const { data: overdueBorrow, error: overdueBorrowError } = await locals.supabase
		.from('borrow_records')
		.select('id')
		.eq('user_id', locals.user.id)
		.is('returned_at', null)
		.lt('due_date', nowIso)
		.limit(1)
		.maybeSingle();

	if (overdueBorrowError) {
		return json({ message: overdueBorrowError.message }, { status: 500 });
	}

	if (overdueBorrow) {
		return json(
			{ message: 'You have overdue books. Please return them before borrowing new ones.' },
			{ status: 409 }
		);
	}

	const { data: existing, error: existingError } = await locals.supabase
		.from('borrow_records')
		.select('id')
		.eq('user_id', locals.user.id)
		.eq('book_id', book_id)
		.is('returned_at', null)
		.limit(1)
		.maybeSingle();

	if (existingError) return json({ message: existingError.message }, { status: 500 });
	if (existing) return json({ message: 'You already have this book borrowed.' }, { status: 409 });

	const { data: activeReservation, error: reservationError } = await systemSupabase
		.from('reservations')
		.select('id, status')
		.eq('book_id', book_id)
		.eq('user_id', locals.user.id)
		.in('status', ['waiting', 'ready'])
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (reservationError) return json({ message: reservationError.message }, { status: 500 });

	const [{ count: readyReservationCountForOthers, error: readyCountError }, { count: activeBookBorrowCount, error: activeBookBorrowCountError }] =
		await Promise.all([
			systemSupabase
				.from('reservations')
				.select('id', { count: 'exact', head: true })
				.eq('book_id', book_id)
				.eq('status', 'ready')
				.neq('user_id', locals.user.id),
			systemSupabase
				.from('borrow_records')
				.select('id', { count: 'exact', head: true })
				.eq('book_id', book_id)
				.is('returned_at', null)
		]);

	if (readyCountError) return json({ message: readyCountError.message }, { status: 500 });
	if (activeBookBorrowCountError) {
		return json({ message: activeBookBorrowCountError.message }, { status: 500 });
	}

	const hasReadyReservation = activeReservation?.status === 'ready';
	const effectiveAvailable =
		(book.total_copies ?? 0) - (activeBookBorrowCount ?? 0) - (readyReservationCountForOthers ?? 0);

	if (!hasReadyReservation && effectiveAvailable <= 0) {
		return json({ message: 'No copies available.' }, { status: 409 });
	}

	const { error: borrowError } = await locals.supabase.from('borrow_records').insert({
		user_id: locals.user.id,
		book_id,
		due_date: due_date.toISOString()
	});

	if (borrowError) return json({ message: borrowError.message }, { status: 500 });

	if (activeReservation) {
		const { error: reservationUpdateError } = await systemSupabase
			.from('reservations')
			.update({ status: 'fulfilled' })
			.eq('id', activeReservation.id);

		if (reservationUpdateError) {
			return json({ message: reservationUpdateError.message }, { status: 500 });
		}

		try {
			await recalculateReservationPositions(systemSupabase, book_id);
		} catch (helperError) {
			return json(
				{ message: helperError instanceof Error ? helperError.message : 'Failed to update queue.' },
				{ status: 500 }
			);
		}
	}

	if (!hasReadyReservation) {
		const { error: decrementError } = await systemSupabase.rpc('decrement_available_copies', {
			book_id_input: book_id
		});

		if (decrementError) return json({ message: decrementError.message }, { status: 500 });
	}

	return json({ success: true });
};
