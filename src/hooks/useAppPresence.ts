import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks PWA installation + last-active timestamp for the current user.
 * Push status is tracked separately when the user subscribes.
 */
export function useAppPresence(role: "chatter" | "marketer" | "model" | "admin") {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const isStandalone =
          typeof window !== "undefined" &&
          (window.matchMedia?.("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true);

        const payload: Record<string, any> = {
          user_id: user.id,
          role,
          last_active_at: new Date().toISOString(),
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        };
        if (isStandalone) payload.pwa_installed_at = new Date().toISOString();

        // Don't overwrite pwa_installed_at if it's already set and we're not standalone right now.
        if (!isStandalone) {
          await supabase
            .from("app_install_status")
            .upsert(payload, { onConflict: "user_id" });
        } else {
          // When standalone, also record install time (only if not previously set)
          const { data: existing } = await supabase
            .from("app_install_status")
            .select("pwa_installed_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (existing?.pwa_installed_at) delete payload.pwa_installed_at;
          await supabase
            .from("app_install_status")
            .upsert(payload, { onConflict: "user_id" });
        }
      } catch (e) {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [role]);
}
