/**
 * Calls the Express backend to create/ensure a demo account and returns
 * credentials that can be used with supabase.auth.signInWithPassword().
 *
 * The backend needs SUPABASE_SERVICE_ROLE_KEY (never exposed to the browser).
 * Set VITE_BACKEND_URL in your .env to point to the Render backend URL.
 */
export async function ensureDemoAccount(data: {
  data: { role: "customer" | "admin" };
}): Promise<{ email: string; password: string }> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

  if (!backendUrl) {
    throw new Error(
      "VITE_BACKEND_URL is not set. Add it to your .env file pointing to your Render backend.",
    );
  }

  const res = await fetch(`${backendUrl}/api/demo-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: data.data.role }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Backend error: ${res.status}`);
  }

  return res.json() as Promise<{ email: string; password: string }>;
}
