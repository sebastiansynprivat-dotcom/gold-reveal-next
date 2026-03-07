
-- Create account_assignments table
CREATE TABLE public.account_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_assignments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on account_assignments"
  ON public.account_assignments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create trigger function to auto-track assignments
CREATE OR REPLACE FUNCTION public.track_account_assignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Close previous assignment if assigned_to changed
  IF OLD.assigned_to IS NOT NULL AND (NEW.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    UPDATE public.account_assignments
    SET unassigned_at = now()
    WHERE account_id = OLD.id
      AND user_id = OLD.assigned_to
      AND unassigned_at IS NULL;
  END IF;

  -- Create new assignment record
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.account_assignments (account_id, user_id, assigned_at)
    VALUES (NEW.id, NEW.assigned_to, COALESCE(NEW.assigned_at, now()));
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to accounts table
CREATE TRIGGER trg_track_account_assignment
  AFTER UPDATE OF assigned_to ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.track_account_assignment();

-- Index for faster lookups
CREATE INDEX idx_account_assignments_account_id ON public.account_assignments(account_id);
CREATE INDEX idx_account_assignments_user_id ON public.account_assignments(user_id);
