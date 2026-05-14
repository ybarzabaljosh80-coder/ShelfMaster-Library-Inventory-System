import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const query = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? '';

	let dbQuery = locals.supabase
		.from('books')
		.select('id, title, author, serial_no, category, total_copies, available_copies')
		.order('title');

	if (query) {
		dbQuery = dbQuery.or(
			`title.ilike.%${query}%,author.ilike.%${query}%,serial_no.ilike.%${query}%`
		);
	}

	if (category) {
		dbQuery = dbQuery.eq('category', category);
	}

	const { data, error } = await dbQuery;

	if (error) return json({ message: error.message }, { status: 500 });

	return json(data);
};
