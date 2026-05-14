import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '$lib/email';
import { releaseHeldReservationCopy } from '$lib/server/reservations';
import { createServiceRoleClient } from '$lib/server/supabase';

type NotificationType = 'reservation_ready' | 'due_soon' | 'due_today' | 'overdue';

type NotificationInput = {
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	referenceId: string | null;
	sendEmailIfCreated?: boolean;
};

function getNotificationClient(fallback: SupabaseClient) {
	return createServiceRoleClient() ?? fallback;
}

function getNotificationEmailHtml(title: string, message: string) {
	return `
		<div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #111827;">
			<h2 style="margin: 0 0 12px; color: #1B6B3A;">${title}</h2>
			<p style="margin: 0 0 16px;">${message}</p>
			<p style="margin: 0; color: #6B7280; font-size: 14px;">SPCBA Library System</p>
		</div>
	`;
}

async function getUserEmail(userId: string) {
	const serviceClient = createServiceRoleClient();
	if (!serviceClient) return null;

	const { data, error } = await serviceClient.auth.admin.getUserById(userId);
	if (error) return null;

	return data.user?.email ?? null;
}

export async function createNotificationIfNeeded(supabase: SupabaseClient, input: NotificationInput) {
	const client = getNotificationClient(supabase);
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	let existingQuery = client
		.from('notifications')
		.select('id')
		.eq('user_id', input.userId)
		.eq('type', input.type)
		.gt('created_at', since);

	existingQuery = input.referenceId
		? existingQuery.eq('reference_id', input.referenceId)
		: existingQuery.is('reference_id', null);

	const { data: existing, error: existingError } = await existingQuery.limit(1).maybeSingle();
	if (existingError) throw new Error(existingError.message);
	if (existing) return { created: false };

	const { data: created, error } = await client
		.from('notifications')
		.insert({
			user_id: input.userId,
			type: input.type,
			title: input.title,
			message: input.message,
			reference_id: input.referenceId
		})
		.select('id')
		.single();

	if (error) throw new Error(error.message);

	if (input.sendEmailIfCreated) {
		const email = await getUserEmail(input.userId);
		if (email) {
			await sendEmail(email, input.title, getNotificationEmailHtml(input.title, input.message));
		}
	}

	return { created: true, id: created.id };
}

export async function generateDueNotifications(supabase: SupabaseClient, userId: string) {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrowStart = new Date(todayStart);
	tomorrowStart.setDate(tomorrowStart.getDate() + 1);
	const dayAfterTomorrowStart = new Date(tomorrowStart);
	dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1);

	const { data: borrows, error } = await supabase
		.from('borrow_records')
		.select('id, due_date, books(title, serial_no)')
		.eq('user_id', userId)
		.is('returned_at', null)
		.not('due_date', 'is', null);

	if (error) throw new Error(error.message);

	let createdCount = 0;

	for (const borrow of borrows ?? []) {
		if (!borrow.due_date) continue;

		const dueDate = new Date(borrow.due_date);
		const book = Array.isArray(borrow.books) ? borrow.books[0] : borrow.books;
		const bookLabel = book?.title ? `${book.title}${book.serial_no ? ` (${book.serial_no})` : ''}` : 'Your borrowed book';
		let payload: Omit<NotificationInput, 'userId' | 'referenceId' | 'sendEmailIfCreated'> | null = null;

		if (dueDate < todayStart) {
			payload = {
				type: 'overdue',
				title: 'Book overdue',
				message: `${bookLabel} is overdue. Please return it as soon as possible.`
			};
		} else if (dueDate >= todayStart && dueDate < tomorrowStart) {
			payload = {
				type: 'due_today',
				title: 'Book due today',
				message: `${bookLabel} is due today. Please return or renew it on time.`
			};
		} else if (dueDate >= tomorrowStart && dueDate < dayAfterTomorrowStart) {
			payload = {
				type: 'due_soon',
				title: 'Book due tomorrow',
				message: `${bookLabel} is due tomorrow. Plan your return in advance.`
			};
		}

		if (!payload) continue;

		const result = await createNotificationIfNeeded(supabase, {
			userId,
			referenceId: borrow.id,
			sendEmailIfCreated: true,
			...payload
		});

		if (result.created) createdCount += 1;
	}

	return { createdCount };
}

export async function processExpiredReservations(supabase: SupabaseClient) {
	const client = getNotificationClient(supabase);
	const nowIso = new Date().toISOString();
	const { data: expiredReservations, error } = await client
		.from('reservations')
		.select('id, book_id')
		.eq('status', 'ready')
		.not('expires_at', 'is', null)
		.lt('expires_at', nowIso)
		.order('expires_at', { ascending: true });

	if (error) throw new Error(error.message);

	let expiredCount = 0;
	let promotedCount = 0;

	for (const reservation of expiredReservations ?? []) {
		const { error: updateError } = await client
			.from('reservations')
			.update({ status: 'expired' })
			.eq('id', reservation.id)
			.eq('status', 'ready');

		if (updateError) throw new Error(updateError.message);

		expiredCount += 1;
		const result = await releaseHeldReservationCopy(client, reservation.book_id);
		if (result.promoted) promotedCount += 1;
	}

	return { expiredCount, promotedCount };
}
