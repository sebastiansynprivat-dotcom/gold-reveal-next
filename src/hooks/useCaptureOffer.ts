import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persists the offer/platform the user was routed to, so the post-auth sync in
 * /auth can write it into profiles.offer (which triggers the account assignment).
 *
 * Works both for users coming from the quiz (already set there) and for users
 * that open an offer page directly via link.
 */
export const useCaptureOffer = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem("pending_offer")) return;
        const { data } = await supabase
          .from("quiz_routes")
          .select("name, target_path")
          .eq("target_path", pathname)
          .maybeSingle();
        if (!cancelled && data?.name) {
          localStorage.setItem("pending_offer", data.name);
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);
};

export default useCaptureOffer;
