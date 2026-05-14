import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';

let serviceRoleClient: SupabaseClient | null | undefined;

export function createClient(cookies: Cookies) {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

export function createServiceRoleClient() {
	if (serviceRoleClient !== undefined) return serviceRoleClient;

	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
	serviceRoleClient = serviceRoleKey
		? createSupabaseClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
				auth: { autoRefreshToken: false, persistSession: false }
			})
		: null;

	return serviceRoleClient;
}
