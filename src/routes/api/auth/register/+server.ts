import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ request }) => {
	const { firstName, lastName, email, password } = await request.json();

	if (!firstName || !lastName || !email || !password) {
		return json(
			{ message: 'First name, last name, email, and password are required.' },
			{ status: 400 }
		);
	}

	const name = `${String(firstName).trim()} ${String(lastName).trim()}`;
	const serviceClient = createServiceRoleClient();

	if (!serviceClient) {
		return json({ message: 'Service role not configured.' }, { status: 500 });
	}

	const { error } = await serviceClient.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { name }
	});

	if (error) {
		return json({ message: error.message }, { status: 400 });
	}

	return json({
		message: 'Registration successful. Your account is pending approval from a librarian.'
	});
};
