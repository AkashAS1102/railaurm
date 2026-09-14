import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL"] : []),
    ...(!SUPABASE_ANON_KEY ? ["VITE_SUPABASE_ANON_KEY"] : []),
  ];
  throw new Error(
    `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
      `Add them to your .env file (copy .env.example as a template).`,
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
