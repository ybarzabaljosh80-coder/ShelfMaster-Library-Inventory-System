import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
		.select('id, borrowed_at, returned_at, force_returned, user_id, book_id, profiles(name), books(title, author, serial_no)')
		.order('borrowed_at', { ascending: false });

	if (from) query = query.gte('borrowed_at', from);
	if (to) query = query.lte('borrowed_at', to + 'T23:59:59.999Z');

	const { data, error } = await query;

	if (error) return json({ message: error.message }, { status: 500 });

	// Build CSV
	const headers = ['Borrower', 'Book Title', 'Author', 'Serial No', 'Borrowed At', 'Returned At', 'Force Returned'];
	const rows = (data ?? []).map((r: any) => [
		r.profiles?.name ?? '',
		r.books?.title ?? '',
		r.books?.author ?? '',
		r.books?.serial_no ?? '',
		r.borrowed_at,
		r.returned_at ?? '',
		r.force_returned ? 'Yes' : 'No'
	]);

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
