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

        const now = new Date().toISOString();
        const payload: Record<string, any> = {
          user_id: user.id,
          role,
          last_active_at: now,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        };

        if (isStandalone) {
          // Only set pwa_installed_at if not already recorded (first standalone open).
          const { data: existing } = await (supabase as any)
            .from("app_install_status")
            .select("pwa_installed_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (!existing?.pwa_installed_at) {
            payload.pwa_installed_at = now;
          }
        }

        await supabase
          .from("app_install_status" as any)
          .upsert(payload, { onConflict: "user_id" });
      } catch (e) {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [role]);
}
