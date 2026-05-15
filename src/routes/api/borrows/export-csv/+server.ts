import { json } from '@sveltejs/kit';
import { createServiceRoleClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

type BorrowReportRecord = {
	borrowed_at: string;
	returned_at: string | null;
	force_returned: boolean | null;
	profiles: { name: string | null } | { name: string | null }[] | null;
	books:
		| { title: string | null; author: string | null; serial_no: string | null }
		| { title: string | null; author: string | null; serial_no: string | null }[]
		| null;
};

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role))
		return json({ message: 'Forbidden' }, { status: 403 });

	const serviceClient = createServiceRoleClient();
	if (!serviceClient) return json({ message: 'Service role not configured.' }, { status: 500 });

	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const userFilter = url.searchParams.get('user') ?? '';
	const bookFilter = url.searchParams.get('book') ?? '';

	let query = serviceClient
		.from('borrow_records')
		.select(
			'id, borrowed_at, returned_at, force_returned, user_id, book_id, profiles!borrow_records_user_id_fkey(name), books(title, author, serial_no)'
		)
		.order('borrowed_at', { ascending: false });

	if (from) query = query.gte('borrowed_at', from);
	if (to) query = query.lte('borrowed_at', to + 'T23:59:59.999Z');
	if (userFilter) query = query.ilike('profiles.name', `%${userFilter}%`);
	if (bookFilter) query = query.ilike('books.title', `%${bookFilter}%`);

	const { data, error } = await query;

	if (error) return json({ message: error.message }, { status: 500 });

	const headers = [
		'Borrower',
		'Book Title',
		'Author',
		'Serial No',
		'Borrowed At',
		'Returned At',
		'Force Returned'
	];
	const rows = ((data ?? []) as BorrowReportRecord[]).map((r) => {
		const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
		const book = Array.isArray(r.books) ? r.books[0] : r.books;

		return [
			profile?.name ?? '',
			book?.title ?? '',
			book?.author ?? '',
			book?.serial_no ?? '',
			r.borrowed_at,
			r.returned_at ?? '',
			r.force_returned ? 'Yes' : 'No'
		];
	});

	const csvContent = [headers, ...rows]
		.map((row) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		.join('\n');

	return new Response(csvContent, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="borrow-report-${new Date().toISOString().split('T')[0]}.csv"`
		}
	});
};
