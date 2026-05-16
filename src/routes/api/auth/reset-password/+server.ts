import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { password } = await request.json();
	const newPassword = typeof password === 'string' ? password : '';

	if (!locals.user) {
		return json({ message: 'Reset link is invalid or has expired.' }, { status: 401 });
	}

	if (newPassword.length < 6) {
		return json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
	}

	const { error } = await locals.supabase.auth.updateUser({ password: newPassword });

	if (error) {
		return json({ message: error.message }, { status: 400 });
	}

	await locals.supabase.auth.signOut();

	return json({ message: 'Password updated. You can now sign in with your new password.' });
};
