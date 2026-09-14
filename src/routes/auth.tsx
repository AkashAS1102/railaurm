import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { TrainFront } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useSession } from "@/hooks/useSession";
import { ensureDemoAccount } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/bookings", replace: true });
  }, [loading, user, navigate]);

  function isConfigured() {
    const url = import.meta.env.VITE_SUPABASE_URL || "";
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
    return url && !url.includes("your-project-id") && key && !key.includes("your-anon");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfigured()) {
      toast.error("Please add your Supabase URL and Key in your .env file to sign in.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, phone } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm, or sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/bookings" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function demo(role: "customer" | "admin") {
    if (!isConfigured()) {
      toast.error("Please add your Supabase URL and Key in your .env file to enable demo login.");
      return;
    }
    setBusy(true);
    try {
      const creds = await ensureDemoAccount({ data: { role } });
      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw error;
      navigate({ to: "/bookings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <div className="ink-panel relative hidden flex-col justify-between p-12 md:flex">
        <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-gold/90 text-accent-foreground">
            <TrainFront className="size-5" />
          </span>
          <span className="font-display text-2xl leading-none">
            Rail<span className="text-gold">Aurum</span>
          </span>
        </Link>
        <div>
          <h1 className="text-5xl leading-tight text-primary-foreground">
            Every journey,
            <br />
            <span className="italic text-gold">on record.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">
            Your PNRs, passengers and printable e-tickets stay saved to your account.
          </p>
        </div>
        <span className="text-xs text-primary-foreground/50">
          Secure reservations · Live seat availability
        </span>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your booking."
              : "It takes less than a minute."}
          </p>

          {!isConfigured() && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              <strong className="block font-semibold">Supabase Keys Required</strong>
              Please add your active <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file to enable login and booking.
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <label className="block">
                  <span className="eyebrow mb-1.5 block">Full name</span>
                  <input
                    className={field}
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Asha Menon"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1.5 block">Phone</span>
                  <input
                    className={field}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="eyebrow mb-1.5 block">Email</span>
              <input
                type="email"
                required
                className={field}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="eyebrow mb-1.5 block">Password</span>
              <input
                type="password"
                required
                minLength={6}
                className={field}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-gold text-accent-foreground hover:bg-gold/90"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              disabled={busy}
              className="h-12 w-full rounded-xl border-gold/50 text-foreground hover:bg-gold/10"
              onClick={() => demo("customer")}
            >
              Demo passenger
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              className="h-12 w-full rounded-xl border-gold/50 text-foreground hover:bg-gold/10"
              onClick={() => demo("admin")}
            >
              Demo admin
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            One click — no sign-up or email confirmation needed.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to RailAurum?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline decoration-gold underline-offset-4"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
