import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { TrainFront, LogOut, Ticket, Radar, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";

export function SiteHeader({ variant = "light" }: { variant?: "light" | "onDark" }) {
  const { user, loading } = useSession();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();


  const tone = variant === "onDark" ? "text-primary-foreground" : "text-foreground";
  const subtle =
    variant === "onDark" ? "text-primary-foreground/70" : "text-muted-foreground";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <Link to="/" className={`flex items-center gap-2.5 ${tone}`}>
        <span className="grid size-9 place-items-center rounded-xl bg-gold/90 text-accent-foreground">
          <TrainFront className="size-5" />
        </span>
        <span className="font-display text-2xl leading-none">Rail<span className="text-gold">Aurum</span></span>
      </Link>

      <nav className="flex items-center gap-2">
        <Link
          to="/live"
          className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:text-gold sm:flex ${subtle}`}
        >
          <Radar className="size-4" /> Live map
        </Link>
        {!loading && user ? (
          <>
            <Link
              to="/bookings"
              className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:text-gold sm:flex ${subtle}`}
            >
              <Ticket className="size-4" /> My trips
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:text-gold sm:flex ${subtle}`}
              >
                <ShieldCheck className="size-4" /> Admin
              </Link>
            )}

            <span className={`hidden text-sm md:block ${subtle}`}>{user.email}</span>
            <Button
              variant={variant === "onDark" ? "secondary" : "outline"}
              size="sm"
              onClick={signOut}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </>
        ) : (
          <Link to="/auth">
            <Button size="sm" className="bg-gold text-accent-foreground hover:bg-gold/90">
              Sign in
            </Button>
          </Link>
        )}
      </nav>
    </header>
  );
}
