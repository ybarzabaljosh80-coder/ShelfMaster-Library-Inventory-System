import { RESEND_API_KEY } from '$env/static/private';

export async function sendEmail(to: string, subject: string, html: string) {
	if (!RESEND_API_KEY) {
		console.warn('[Email] Skipped: no API key configured');
		return { success: false, reason: 'no_api_key' };
	}

	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'SPCBA Library <library@spcba.edu.ph>',
				to,
				subject,
				html
			})
		});
		return { success: res.ok };
	} catch {
		return { success: false, reason: 'send_failed' };
	}
}
