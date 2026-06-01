-- Drop dependent policy first
DROP POLICY IF EXISTS "Models can view own model_dashboard" ON public.model_dashboard;

-- 1. Add new columns
ALTER TABLE public.model_dashboard
  ADD COLUMN IF NOT EXISTS model_id uuid,
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_fetched_month smallint,
  ADD COLUMN IF NOT EXISTS last_fetched_year smallint;

-- 2. Backfill model_id
UPDATE public.model_dashboard md
SET model_id = a.model_id
FROM public.accounts a
WHERE a.id = md.account_id AND a.model_id IS NOT NULL;

-- 3. Aggregate to latest row per model
WITH ranked AS (
  SELECT id, model_id,
    ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY updated_at DESC NULLS LAST) AS rn
  FROM public.model_dashboard WHERE model_id IS NOT NULL
),
agg AS (
  SELECT model_id,
    COALESCE(SUM(fourbased_revenue),0) AS fourbased_revenue,
    COALESCE(SUM(maloum_revenue),0) AS maloum_revenue,
    COALESCE(SUM(brezzels_revenue),0) AS brezzels_revenue,
    BOOL_OR(fourbased_submitted) AS fourbased_submitted,
    BOOL_OR(maloum_submitted) AS maloum_submitted,
    BOOL_OR(brezzels_submitted) AS brezzels_submitted,
    BOOL_OR(botdm_done) AS botdm_done,
    BOOL_OR(massdm_done) AS massdm_done,
    BOOL_OR(fourbased_botdm_done) AS fourbased_botdm_done,
    BOOL_OR(fourbased_massdm_done) AS fourbased_massdm_done,
    BOOL_OR(maloum_botdm_done) AS maloum_botdm_done,
    BOOL_OR(maloum_massdm_done) AS maloum_massdm_done,
    BOOL_OR(brezzels_botdm_done) AS brezzels_botdm_done,
    BOOL_OR(brezzels_massdm_done) AS brezzels_massdm_done
  FROM public.model_dashboard WHERE model_id IS NOT NULL
  GROUP BY model_id
)
UPDATE public.model_dashboard md
SET fourbased_revenue = agg.fourbased_revenue,
    maloum_revenue = agg.maloum_revenue,
    brezzels_revenue = agg.brezzels_revenue,
    monthly_revenue = agg.fourbased_revenue + agg.maloum_revenue + agg.brezzels_revenue,
    fourbased_submitted = agg.fourbased_submitted,
    maloum_submitted = agg.maloum_submitted,
    brezzels_submitted = agg.brezzels_submitted,
    botdm_done = agg.botdm_done,
    massdm_done = agg.massdm_done,
    fourbased_botdm_done = agg.fourbased_botdm_done,
    fourbased_massdm_done = agg.fourbased_massdm_done,
    maloum_botdm_done = agg.maloum_botdm_done,
    maloum_massdm_done = agg.maloum_massdm_done,
    brezzels_botdm_done = agg.brezzels_botdm_done,
    brezzels_massdm_done = agg.brezzels_massdm_done
FROM agg, ranked
WHERE ranked.model_id = agg.model_id AND ranked.rn = 1 AND md.id = ranked.id;

-- 4. Delete duplicates + null model_id
DELETE FROM public.model_dashboard md
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY model_id ORDER BY updated_at DESC NULLS LAST) AS rn
  FROM public.model_dashboard WHERE model_id IS NOT NULL
) dup
WHERE md.id = dup.id AND dup.rn > 1;
DELETE FROM public.model_dashboard WHERE model_id IS NULL;

-- 5. Drop old account_id
ALTER TABLE public.model_dashboard DROP CONSTRAINT IF EXISTS model_dashboard_account_id_fkey;
ALTER TABLE public.model_dashboard DROP CONSTRAINT IF EXISTS model_dashboard_account_id_key;
ALTER TABLE public.model_dashboard DROP COLUMN IF EXISTS account_id;

-- 6. Enforce model_id
ALTER TABLE public.model_dashboard ALTER COLUMN model_id SET NOT NULL;
ALTER TABLE public.model_dashboard ADD CONSTRAINT model_dashboard_model_id_key UNIQUE (model_id);
ALTER TABLE public.model_dashboard
  ADD CONSTRAINT model_dashboard_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;

-- 7. Recreate model view policy via model_id
CREATE POLICY "Models can view own model_dashboard"
ON public.model_dashboard
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.model_users mu
    WHERE mu.user_id = auth.uid() AND mu.model_id = model_dashboard.model_id
  )
);