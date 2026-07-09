
CREATE TABLE public.model_request_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.model_requests(id) ON DELETE CASCADE,
  admin_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX idx_model_request_followups_request ON public.model_request_followups(request_id, sent_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_request_followups TO authenticated;
GRANT ALL ON public.model_request_followups TO service_role;

ALTER TABLE public.model_request_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage request followups"
  ON public.model_request_followups
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
