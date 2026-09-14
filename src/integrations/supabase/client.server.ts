// Server-side Supabase client with service role key - bypasses RLS.
// Use this ONLY inside the Express backend (backend/server.js).
// Never import this in frontend code — the service role key would be exposed.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
