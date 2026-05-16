import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ message: 'Unauthorized' }, { status: 401 });

	const query = url.searchParams.get('q') ?? '';
	const category = url.searchParams.get('category') ?? '';
	const page = Number(url.searchParams.get('page'));
	const pageSize = Number(url.searchParams.get('pageSize'));
	const paginated =
		Number.isInteger(page) && page > 0 && Number.isInteger(pageSize) && pageSize > 0;

	let dbQuery = locals.supabase
		.from('books')
		.select('id, title, author, serial_no, category, total_copies, available_copies', {
			count: paginated ? 'exact' : undefined
		})
		.order('title');

	if (query) {
		dbQuery = dbQuery.or(
			`title.ilike.%${query}%,author.ilike.%${query}%,serial_no.ilike.%${query}%`
		);
	}

	if (category) {
		dbQuery = dbQuery.eq('category', category);
	}

	if (paginated) {
		const from = (page - 1) * pageSize;
		dbQuery = dbQuery.range(from, from + pageSize - 1);
	}

	const { data, error, count } = await dbQuery;

	if (error) return json({ message: error.message }, { status: 500 });
	if (paginated) return json({ books: data ?? [], total: count ?? 0 });

	return json(data);
};
