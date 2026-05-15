import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';
import { createServiceRoleClient } from '$lib/server/supabase';

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
			'borrowed_at, returned_at, force_returned, profiles!borrow_records_user_id_fkey(name), books(title, author, serial_no)'
		)
		.order('borrowed_at', { ascending: false });

	if (from) query = query.gte('borrowed_at', from);
	if (to) query = query.lte('borrowed_at', to + 'T23:59:59.999Z');
	if (userFilter) query = query.ilike('profiles.name', `%${userFilter}%`);
	if (bookFilter) query = query.ilike('books.title', `%${bookFilter}%`);

	const { data, error } = await query;

	if (error) return json({ message: error.message }, { status: 500 });

	const rows = ((data ?? []) as BorrowReportRecord[]).map((r) => {
		const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
		const book = Array.isArray(r.books) ? r.books[0] : r.books;

		return {
			Borrower: profile?.name ?? '',
			'Book Title': book?.title ?? '',
			Author: book?.author ?? '',
			'Serial No': book?.serial_no ?? '',
			'Borrowed At': new Date(r.borrowed_at).toLocaleDateString(),
			'Returned At': r.returned_at ? new Date(r.returned_at).toLocaleDateString() : '',
			'Force Returned': r.force_returned ? 'Yes' : 'No'
		};
	});

	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Borrow Records');

	const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	return new Response(buf, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="borrow-records-${new Date().toISOString().split('T')[0]}.xlsx"`
		}
	});
};
