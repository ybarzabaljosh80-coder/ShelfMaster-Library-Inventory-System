import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const nowIso = new Date().toISOString();

	const [{ data: activeBorrows }, { count: overdueCount }, { count: reservationCount }] =
		await Promise.all([
			locals.supabase
				.from('borrow_records')
				.select('id, borrowed_at, due_date, books(title, author, serial_no)')
				.eq('user_id', locals.user!.id)
				.is('returned_at', null)
				.order('borrowed_at', { ascending: false }),
			locals.supabase
				.from('borrow_records')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', locals.user!.id)
				.is('returned_at', null)
				.lt('due_date', nowIso),
			locals.supabase
				.from('reservations')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', locals.user!.id)
				.in('status', ['waiting', 'ready'])
		]);

	return {
		activeBorrows: activeBorrows ?? [],
		overdueCount: overdueCount ?? 0,
		reservationCount: reservationCount ?? 0
	};
};
