
-- 1. Fix is_super_admin to ONLY match super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
$$;

-- 2. Guard has_role against role enumeration
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin','super_admin','sub_admin')
     )
  THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

-- 3. Guard can_access_account similarly
CREATE OR REPLACE FUNCTION public.can_access_account(p_user_id uuid, p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin','super_admin','sub_admin')
     )
  THEN
    RETURN FALSE;
  END IF;

  RETURN
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_account_access
      WHERE admin_user_id = p_user_id AND account_id = p_account_id
    );
END;
$$;

-- 4. Restrict agency_billing_status SELECT to admins only
DROP POLICY IF EXISTS "Anyone authenticated can view agency billing status" ON public.agency_billing_status;
CREATE POLICY "Admins view agency billing status"
ON public.agency_billing_status
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 5. Server-side admin 2FA sessions
CREATE TABLE IF NOT EXISTS public.admin_2fa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours')
);

GRANT SELECT ON public.admin_2fa_sessions TO authenticated;
GRANT ALL ON public.admin_2fa_sessions TO service_role;

ALTER TABLE public.admin_2fa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own 2fa sessions"
ON public.admin_2fa_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_2fa_sessions_user ON public.admin_2fa_sessions(user_id, expires_at);

CREATE OR REPLACE FUNCTION public.validate_admin_2fa_session(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_2fa_sessions
    WHERE user_id = auth.uid()
      AND session_token = p_token
      AND expires_at > now()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.validate_admin_2fa_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_admin_2fa_session(text) TO authenticated;
