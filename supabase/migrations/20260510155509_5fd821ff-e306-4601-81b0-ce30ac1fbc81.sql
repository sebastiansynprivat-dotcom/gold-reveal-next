-- 1. Add model_id, make account_id nullable
ALTER TABLE public.model_users
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE CASCADE;

ALTER TABLE public.model_users
  ALTER COLUMN account_id DROP NOT NULL;

-- 2. Unique: one login per model
CREATE UNIQUE INDEX IF NOT EXISTS model_users_model_id_unique
  ON public.model_users(model_id) WHERE model_id IS NOT NULL;

-- 3. Update RLS policies to support model_id-based access

-- accounts
DROP POLICY IF EXISTS "Models can view own account" ON public.accounts;
CREATE POLICY "Models can view own account"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      WHERE mu.user_id = auth.uid()
        AND (mu.account_id = accounts.id OR mu.model_id = accounts.model_id)
    )
  );

-- credit_notes
DROP POLICY IF EXISTS "Models can view own credit_notes" ON public.credit_notes;
CREATE POLICY "Models can view own credit_notes"
  ON public.credit_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      LEFT JOIN public.accounts a ON a.id = credit_notes.account_id
      WHERE mu.user_id = auth.uid()
        AND (
          mu.account_id = credit_notes.account_id
          OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id)
        )
    )
  );

-- model_dashboard
DROP POLICY IF EXISTS "Models can view own model_dashboard" ON public.model_dashboard;
CREATE POLICY "Models can view own model_dashboard"
  ON public.model_dashboard FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      LEFT JOIN public.accounts a ON a.id = model_dashboard.account_id
      WHERE mu.user_id = auth.uid()
        AND (
          mu.account_id = model_dashboard.account_id
          OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id)
        )
    )
  );

-- account_assignments
DROP POLICY IF EXISTS "Models can view assignments for own account" ON public.account_assignments;
CREATE POLICY "Models can view assignments for own account"
  ON public.account_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      LEFT JOIN public.accounts a ON a.id = account_assignments.account_id
      WHERE mu.user_id = auth.uid()
        AND (
          mu.account_id = account_assignments.account_id
          OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id)
        )
    )
  );

-- daily_revenue
DROP POLICY IF EXISTS "Models can view assigned chatter revenue" ON public.daily_revenue;
CREATE POLICY "Models can view assigned chatter revenue"
  ON public.daily_revenue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.model_users mu
      JOIN public.account_assignments aa ON aa.user_id = daily_revenue.user_id
      LEFT JOIN public.accounts a ON a.id = aa.account_id
      WHERE mu.user_id = auth.uid()
        AND (
          mu.account_id = aa.account_id
          OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id)
        )
    )
  );