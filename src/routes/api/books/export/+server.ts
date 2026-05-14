import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const { data: books, error } = await locals.supabase
		.from('books')
		.select('title, author, category, serial_no, total_copies, available_copies, created_at')
		.order('title');

	if (error) return json({ message: error.message }, { status: 500 });

	const rows = (books ?? []).map((b) => ({
		Title: b.title,
		Author: b.author,
		Category: b.category ?? '',
		'Serial No': b.serial_no,
		'Total Copies': b.total_copies,
		'Available Copies': b.available_copies,
		'Added On': new Date(b.created_at).toLocaleDateString()
	}));

	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Books');

	const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	return new Response(buf, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="books-${new Date().toISOString().split('T')[0]}.xlsx"`
		}
	});
};
