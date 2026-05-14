import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const nowIso = new Date().toISOString();

	const [booksRes, borrowsRes, usersRes, overdueRes] = await Promise.all([
		locals.supabase.from('books').select('id, total_copies, available_copies'),
		locals.supabase.from('borrow_records').select('id, returned_at'),
		locals.supabase.from('profiles').select('id').eq('role', 'user'),
		locals.supabase
			.from('borrow_records')
			.select('id', { count: 'exact', head: true })
			.is('returned_at', null)
			.not('due_date', 'is', null)
			.lt('due_date', nowIso)
	]);

	const books = booksRes.data ?? [];
	const borrows = borrowsRes.data ?? [];
	const users = usersRes.data ?? [];

	return {
		stats: {
			totalBooks: books.reduce((sum, b) => sum + (b.total_copies ?? 1), 0),
			booksOut: books.reduce(
				(sum, b) => sum + ((b.total_copies ?? 1) - (b.available_copies ?? 0)),
				0
			),
			registeredUsers: users.length,
			totalBorrows: borrows.length,
			activeBorrows: borrows.filter((b) => !b.returned_at).length,
			overdueBorrows: overdueRes.count ?? 0
		}
	};
};
