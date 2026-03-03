-- Account pool table
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT '',
  account_email text NOT NULL DEFAULT '',
  account_password text NOT NULL DEFAULT '',
  account_domain text NOT NULL DEFAULT '',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admin full access on accounts"
ON public.accounts FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can view their own assigned account
CREATE POLICY "Users can view own assigned account"
ON public.accounts FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Function to auto-assign an account when a new user registers
CREATE OR REPLACE FUNCTION public.auto_assign_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer text;
  v_account_id uuid;
BEGIN
  -- Get the offer/platform from the user's profile
  v_offer := COALESCE(NEW.raw_user_meta_data->>'group_name', '');
  
  -- We need to match by checking pending_offer stored later, 
  -- so we use a separate approach: match by the offer stored in profiles
  -- Actually, at registration time we don't have the offer yet in profiles.
  -- The offer comes from localStorage after auth. So we handle this differently.
  -- We'll use a trigger on profiles.offer update instead.
  RETURN NEW;
END;
$$;

-- Trigger: when offer is set on a profile, auto-assign an unassigned account
CREATE OR REPLACE FUNCTION public.assign_account_on_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  -- Only run if offer was just set (changed from empty to something)
  IF (OLD.offer IS NULL OR OLD.offer = '') AND NEW.offer IS NOT NULL AND NEW.offer != '' THEN
    -- Check if user already has an assigned account
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE assigned_to = NEW.user_id) THEN
      -- Find first unassigned account for this platform
      SELECT id INTO v_account_id
      FROM public.accounts
      WHERE platform = NEW.offer
        AND assigned_to IS NULL
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
      
      IF v_account_id IS NOT NULL THEN
        UPDATE public.accounts
        SET assigned_to = NEW.user_id, assigned_at = now()
        WHERE id = v_account_id;
        
        -- Also update the profile with the account data
        UPDATE public.profiles
        SET account_email = (SELECT account_email FROM public.accounts WHERE id = v_account_id),
            account_password = (SELECT account_password FROM public.accounts WHERE id = v_account_id),
            account_domain = (SELECT account_domain FROM public.accounts WHERE id = v_account_id)
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_account_on_offer
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_account_on_offer_update();