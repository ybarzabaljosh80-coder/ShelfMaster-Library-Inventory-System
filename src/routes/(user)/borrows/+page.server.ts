import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: borrows }, { data: reservations }] = await Promise.all([
		locals.supabase
			.from('borrow_records')
			.select('id, borrowed_at, due_date, returned_at, force_returned, books(title, author, serial_no)')
			.eq('user_id', locals.user!.id)
			.order('borrowed_at', { ascending: false }),
		locals.supabase
			.from('reservations')
			.select('id, user_id, book_id, status, position, created_at, ready_at, expires_at, books(title, author, serial_no)')
			.eq('user_id', locals.user!.id)
			.in('status', ['waiting', 'ready'])
			.order('position', { ascending: true })
	]);

	return { borrows: borrows ?? [], reservations: reservations ?? [] };
};
