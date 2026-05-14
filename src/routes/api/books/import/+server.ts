import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', locals.user.id)
		.single();

	const staffRoles = ['admin', 'staff', 'moderator'];
	if (!profile || !staffRoles.includes(profile.role)) return json({ message: 'Forbidden' }, { status: 403 });

	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) return json({ message: 'No file uploaded.' }, { status: 400 });

	const buffer = await file.arrayBuffer();
	const workbook = XLSX.read(buffer, { type: 'array' });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

	if (rows.length === 0) {
		return json({ message: 'The file is empty or has no data rows.' }, { status: 400 });
	}

	// Normalize: lowercase, strip all non-alphanumeric chars
	const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

	// Fuzzy match a normalized key against known aliases
	const titleAliases = ['title', 'booktitle', 'bookname', 'name'];
	const authorAliases = ['author', 'authorname', 'writer', 'by'];
	const serialAliases = [
		'serialno',
		'serial',
		'serialnumber',
		'serialnum',
		'sn',
		'bookid',
		'code',
		'isbn'
	];
	const categoryAliases = ['category', 'genre', 'subject', 'type'];
	const copiesAliases = ['copies', 'quantity', 'qty', 'totalcopies', 'count', 'stock'];

	function matchField(normalizedKey: string, aliases: string[]): boolean {
		return aliases.some((a) => normalizedKey === a || normalizedKey.includes(a));
	}

	const books = rows.map((row) => {
		let title = '';
		let author = '';
		let serial_no = '';
		let category: string | null = null;
		let copies = 1;

		for (const [key, val] of Object.entries(row)) {
			const nk = normalize(key);
			const v = String(val).trim();
			if (!title && matchField(nk, titleAliases)) title = v;
			else if (!author && matchField(nk, authorAliases)) author = v;
			else if (!serial_no && matchField(nk, serialAliases)) serial_no = v;
			else if (!category && matchField(nk, categoryAliases)) category = v || null;
			else if (matchField(nk, copiesAliases)) copies = Math.max(1, parseInt(v) || 1);
		}

		return { title, author, serial_no, category, total_copies: copies, available_copies: copies };
	});

	// Validate all rows
	const invalid = books.filter((b, i) => !b.title || !b.author || !b.serial_no);
	if (invalid.length > 0) {
		return json(
			{
				message: `${invalid.length} row(s) are missing title, author, or serial_no. Please ensure all columns are present.`
			},
			{ status: 400 }
		);
	}

	// Insert all books (skip duplicates)
	let inserted = 0;
	let updated = 0;
	const errors: string[] = [];

	for (const book of books) {
		const { error } = await locals.supabase.from('books').insert(book);
		if (error) {
			if (error.code === '23505') {
				// Duplicate serial — add copies to existing book
				const copiesToAdd = book.total_copies;
				const { error: updateErr } = await locals.supabase.rpc('add_book_copies', {
					serial: book.serial_no,
					extra: copiesToAdd
				});
				if (updateErr) {
					errors.push(`${book.serial_no}: ${updateErr.message}`);
				} else {
					updated++;
				}
			} else {
				errors.push(`${book.serial_no}: ${error.message}`);
			}
		} else {
			inserted++;
		}
	}

	const parts = [`Imported ${inserted} new book(s).`];
	if (updated) parts.push(`${updated} existing book(s) had copies added.`);
	if (errors.length) parts.push(`${errors.length} error(s).`);

	return json({
		message: parts.join(' '),
		inserted,
		updated,
		errors
	});
};
