// components/auth/RequireAdmin2FA.tsx
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const RequireAdmin2FA = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setIsVerified(false);
        return;
      }

      // 1. Check if the 2FA flag exists in sessionStorage
      const has2FA = sessionStorage.getItem("admin_2fa_verified");

      // 2. Check if the user is actually an admin (Server-side check)
      const { data: isAdmin } = await supabase.rpc("is_admin");

      if (has2FA && isAdmin) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
      }
    };

    checkStatus();
  }, [user]);

  if (loading || isVerified === null) return <div>Loading...</div>;

  if (!isVerified) {
    // Redirect to login if not verified, saving the original location
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
