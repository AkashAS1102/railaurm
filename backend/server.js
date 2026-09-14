import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — only allow requests from the Vercel frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or missing origin (e.g. curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "RailAurum backend" });
});

// --- Demo Account Endpoint ---
const DEMO_ACCOUNTS = {
  customer: {
    email: "demo@railaurum.app",
    password: "railaurum-demo-2026",
    name: "Demo Traveller",
  },
  admin: {
    email: "admin@railaurum.app",
    password: "railaurum-admin-2026",
    name: "Demo Admin",
  },
};

function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

app.post("/api/demo-account", async (req, res) => {
  const { role } = req.body;
  if (role !== "customer" && role !== "admin") {
    return res.status(400).json({ error: "role must be 'customer' or 'admin'" });
  }

  try {
    const supabaseAdmin = createSupabaseAdmin();
    const account = DEMO_ACCOUNTS[role];

    // Create user if not exists
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { name: account.name },
    });

    if (error && !/already|exists|registered/i.test(error.message)) {
      throw new Error(error.message);
    }

    // Grant admin role if needed
    if (role === "admin") {
      let userId = created?.user?.id;
      if (!userId) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 200,
        });
        userId = list?.users.find((u) => u.email === account.email)?.id;
      }
      if (userId) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      }
    }

    return res.json({ email: account.email, password: account.password });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[demo-account]", message);
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`RailAurum backend running on port ${PORT}`);
});
