import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const { email } = await request.json();
	const normalizedEmail = typeof email === 'string' ? email.trim() : '';

	if (!normalizedEmail) {
		return json({ message: 'Email is required.' }, { status: 400 });
	}

	const { error } = await locals.supabase.auth.resetPasswordForEmail(normalizedEmail, {
		redirectTo: `${url.origin}/auth/callback?next=/reset-password`
	});

	if (error) {
		return json({ message: error.message }, { status: 400 });
	}

	return json({ message: 'If an account exists for that email, a reset link has been sent.' });
};
