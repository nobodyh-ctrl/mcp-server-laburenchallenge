import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types/env";

export function createSupabaseClient(env: Env): SupabaseClient {
	const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Supabase URL and Key must be provided in environment variables");
	}

	return createClient(supabaseUrl, supabaseKey);
}
