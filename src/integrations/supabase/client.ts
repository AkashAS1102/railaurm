import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL : "")) as string;
const SUPABASE_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_ANON_KEY : "")) as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    "Supabase URL or Key is not defined in environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

function isOpaqueApiKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

const customFetch: typeof fetch = (input, init) => {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request
      ? input.headers
      : undefined
  );

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  // Supabase opaque keys (sb_publishable_*) must not be passed as Bearer tokens in Authorization header
  if (isOpaqueApiKey(SUPABASE_KEY) && headers.get("Authorization") === `Bearer ${SUPABASE_KEY}`) {
    headers.delete("Authorization");
  }

  headers.set("apikey", SUPABASE_KEY);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: customFetch,
  },
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
