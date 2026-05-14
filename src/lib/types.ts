export interface Profile {
	id: string;
	name: string;
	role: 'user' | 'staff' | 'moderator' | 'admin';
	created_at: string;
}

export interface Book {
	id: string;
	title: string;
	author: string;
	serial_no: string;
	category: string | null;
	total_copies: number;
	available_copies: number;
	created_at: string;
}

export interface BorrowRecord {
	id: string;
	user_id: string;
	book_id: string;
	borrowed_at: string;
	due_date: string;
	returned_at: string | null;
	force_returned: boolean;
	force_returned_by: string | null;
}

export interface Reservation {
	id: string;
	user_id: string;
	book_id: string;
	status: 'waiting' | 'ready' | 'fulfilled' | 'cancelled' | 'expired';
	position: number;
	created_at: string;
	ready_at: string | null;
	expires_at: string | null;
}

export interface Notification {
	id: string;
	user_id: string;
	type: 'reservation_ready' | 'due_soon' | 'due_today' | 'overdue';
	title: string;
	message: string;
	read: boolean;
	reference_id: string | null;
	created_at: string;
}
