import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { name, email, password } = await request.json();

	if (!name || !email || !password) {
		return json({ message: 'Name, email, and password are required.' }, { status: 400 });
	}

	const { data, error } = await locals.supabase.auth.signUp({
		email,
		password,
		options: {
			data: { name }
		}
	});

	if (error) {
		return json({ message: error.message }, { status: 400 });
	}

	// If email confirmation is required, session will be null
	if (!data.session) {
		return json({ message: 'Check your email to confirm your account.' }, { status: 200 });
	}

	return json({ redirect: '/dashboard' });
};
