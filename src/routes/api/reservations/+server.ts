import { json } from '@sveltejs/kit';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data, error } = await locals.supabase
		.from('reservations')
		.select('id, user_id, book_id, status, position, created_at, ready_at, expires_at, books(title, author, serial_no)')
		.eq('user_id', locals.user.id)
		.in('status', ['waiting', 'ready'])
		.order('position', { ascending: true });

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data ?? []);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { book_id } = await request.json();
	if (!book_id) return json({ message: 'book_id is required.' }, { status: 400 });

	const systemSupabase = createServiceRoleClient() ?? locals.supabase;
	const { data: book, error: bookError } = await systemSupabase
		.from('books')
		.select('id, available_copies')
		.eq('id', book_id)
		.maybeSingle();

	if (bookError) return json({ message: bookError.message }, { status: 500 });
	if (!book) return json({ message: 'Book not found.' }, { status: 404 });
	if (book.available_copies > 0) {
		return json({ message: 'This book is currently available. Please borrow it directly.' }, { status: 409 });
	}

	const { data: existingReservation, error: reservationError } = await locals.supabase
		.from('reservations')
		.select('id')
		.eq('user_id', locals.user.id)
		.eq('book_id', book_id)
		.in('status', ['waiting', 'ready'])
		.limit(1)
		.maybeSingle();

	if (reservationError) return json({ message: reservationError.message }, { status: 500 });
	if (existingReservation) {
		return json({ message: 'You already have an active reservation for this book.' }, { status: 409 });
	}

	const { data: activeBorrow, error: borrowError } = await locals.supabase
		.from('borrow_records')
		.select('id')
		.eq('user_id', locals.user.id)
		.eq('book_id', book_id)
		.is('returned_at', null)
		.limit(1)
		.maybeSingle();

	if (borrowError) return json({ message: borrowError.message }, { status: 500 });
	if (activeBorrow) return json({ message: 'You already have this book borrowed.' }, { status: 409 });

	const { count, error: countError } = await systemSupabase
		.from('reservations')
		.select('id', { count: 'exact', head: true })
		.eq('book_id', book_id)
		.in('status', ['waiting', 'ready']);

	if (countError) return json({ message: countError.message }, { status: 500 });

	const position = (count ?? 0) + 1;
	const { error: insertError } = await locals.supabase.from('reservations').insert({
		user_id: locals.user.id,
		book_id,
		status: 'waiting',
		position
	});

	if (insertError) return json({ message: insertError.message }, { status: 500 });

	return json({ success: true, position });
};
