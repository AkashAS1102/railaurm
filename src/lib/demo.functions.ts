/**
 * Ensures demo credentials for one-click demo login.
 * Tries the Java/Render backend first, and falls back to verified demo accounts.
 */
const DEMO_CREDENTIALS = {
  customer: {
    email: "demo@railaurum.app",
    password: "railaurum-demo-2026",
  },
  admin: {
    email: "admin@railaurum.app",
    password: "railaurum-admin-2026",
  },
} as const;

export async function ensureDemoAccount(data: {
  data: { role: "customer" | "admin" };
}): Promise<{ email: string; password: string }> {
  const role = data.data.role;
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/demo-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.email && json.password) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Backend demo account call failed, using default demo credentials:", e);
    }
  }

  // Guaranteed fallback to confirmed demo credentials
  return DEMO_CREDENTIALS[role];
}
