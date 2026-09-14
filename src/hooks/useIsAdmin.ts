import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { getPreauthorizedAdmins } from "@/lib/admin";

export function useIsAdmin() {
  const { user, loading } = useSession();
  const q = useQuery({
    queryKey: ["is-admin", user?.id, user?.email],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const userEmail = user?.email?.toLowerCase().trim() ?? "";
      const preauth = getPreauthorizedAdmins();
      const isPreauthorized =
        preauth.includes(userEmail) || userEmail === "admin@railaurum.app";

      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user!.id,
          _role: "admin",
        });
        if (!error && data === true) return true;
      } catch (e) {
        console.warn("has_role check fallback:", e);
      }

      if (isPreauthorized) {
        try {
          await supabase.from("user_roles").upsert(
            { user_id: user!.id, role: "admin" as any },
            { onConflict: "user_id,role" },
          );
        } catch {
          // ignore
        }
        return true;
      }

      return false;
    },
  });
  return { isAdmin: q.data === true, checking: loading || q.isLoading };
}
