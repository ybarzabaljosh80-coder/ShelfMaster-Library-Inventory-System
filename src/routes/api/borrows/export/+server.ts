import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';

	let query = locals.supabase
		.from('borrow_records')
		.select('borrowed_at, returned_at, force_returned, profiles(name), books(title, author, serial_no)')
		.order('borrowed_at', { ascending: false });

	if (from) query = query.gte('borrowed_at', from);
	if (to) query = query.lte('borrowed_at', to + 'T23:59:59.999Z');

	const { data, error } = await query;

	if (error) return json({ message: error.message }, { status: 500 });

	const rows = (data ?? []).map((r: any) => ({
		Borrower: r.profiles?.name ?? '',
		'Book Title': r.books?.title ?? '',
		Author: r.books?.author ?? '',
		'Serial No': r.books?.serial_no ?? '',
		'Borrowed At': new Date(r.borrowed_at).toLocaleDateString(),
		'Returned At': r.returned_at ? new Date(r.returned_at).toLocaleDateString() : '',
		'Force Returned': r.force_returned ? 'Yes' : 'No'
	}));

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
