
-- 1) Track who created an account
ALTER TABLE public.accounts ADD COLUMN created_by uuid;

-- 2) Allow sub-admins to INSERT their own accounts
CREATE POLICY "Sub admins can insert own accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid()
);

-- 3) Allow sub-admins to DELETE their own accounts
CREATE POLICY "Sub admins can delete own accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid()
);

-- 4) Auto-link new sub-admin accounts to admin_account_access
CREATE OR REPLACE FUNCTION public.auto_link_sub_admin_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If creator is a sub_admin, auto-grant access
  IF NEW.created_by IS NOT NULL AND has_role(NEW.created_by, 'sub_admin') THEN
    INSERT INTO admin_account_access (admin_user_id, account_id, granted_by)
    VALUES (NEW.created_by, NEW.id, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_link_sub_admin_account
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_sub_admin_account();
