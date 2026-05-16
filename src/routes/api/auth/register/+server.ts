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

	const normalizedEmail = String(email).trim().toLowerCase();

	// Basic format validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
		return json({ message: 'Please enter a valid email address.' }, { status: 400 });
	}

	// Domain restriction: only allow institutional emails
	// Remove or modify this check if you want to allow external emails (e.g., Gmail)
	const allowedDomains = ['spcba.edu.ph'];
	const domain = normalizedEmail.split('@')[1];
	if (!allowedDomains.includes(domain)) {
		return json(
			{ message: 'Registration is limited to institutional email addresses (@spcba.edu.ph).' },
			{ status: 400 }
		);
	}

	const name = `${String(firstName).trim()} ${String(lastName).trim()}`;
	const serviceClient = createServiceRoleClient();

	if (!serviceClient) {
		return json({ message: 'Service role not configured.' }, { status: 500 });
	}

	const { data: authData, error } = await serviceClient.auth.admin.createUser({
		email: normalizedEmail,
		password,
		email_confirm: true,
		user_metadata: { name }
	});

	if (error) {
		return json({ message: error.message }, { status: 400 });
	}

	if (authData?.user?.id) {
		await serviceClient.auth.admin
			.updateUserById(authData.user.id, { email_confirm: true })
			.catch(() => {});
	}

	return json({
		message: 'Registration successful. Your account is pending approval from a librarian.'
	});
};
