ALTER TABLE public.model_requests
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS compliance_reason text,
  ADD COLUMN IF NOT EXISTS compliance_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_forwarded boolean NOT NULL DEFAULT false;

ALTER TABLE public.model_requests
  DROP CONSTRAINT IF EXISTS model_requests_compliance_status_check;
ALTER TABLE public.model_requests
  ADD CONSTRAINT model_requests_compliance_status_check
  CHECK (compliance_status IN ('pending','approved','flagged','skipped'));

-- Existing requests: treat as already reviewed by humans
UPDATE public.model_requests
SET compliance_status = 'skipped', compliance_checked_at = now()
WHERE compliance_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_model_requests_compliance
  ON public.model_requests (compliance_status);