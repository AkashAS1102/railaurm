import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function useIsAdmin() {
  const { user, loading } = useSession();
  const q = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
  });
  return { isAdmin: q.data === true, checking: loading || q.isLoading };
}
