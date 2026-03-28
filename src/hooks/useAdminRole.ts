import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdminRole() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      try {
        const [superRes, adminRes] = await Promise.all([
          supabase.rpc("is_super_admin"),
          supabase.rpc("is_admin"),
        ]);

        const isSA = superRes.data === true;
        const isAny = adminRes.data === true;

        setIsSuperAdmin(isSA);
        setIsSubAdmin(isAny && !isSA);
      } catch (err) {
        console.error("useAdminRole error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { isSuperAdmin, isSubAdmin, isAdmin: isSuperAdmin || isSubAdmin, loading };
}
