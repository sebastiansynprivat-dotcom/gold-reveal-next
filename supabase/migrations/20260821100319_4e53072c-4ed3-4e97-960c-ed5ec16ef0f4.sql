CREATE TABLE public.admin_request_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.model_requests(id) ON DELETE CASCADE,
  last_read_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (admin_id, request_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_request_read_states TO authenticated;
GRANT ALL ON public.admin_request_read_states TO service_role;

ALTER TABLE public.admin_request_read_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own request read states"
ON public.admin_request_read_states
FOR ALL
TO authenticated
USING (admin_id = auth.uid() AND public.is_admin())
WITH CHECK (admin_id = auth.uid() AND public.is_admin());

CREATE TRIGGER update_admin_request_read_states_updated_at
BEFORE UPDATE ON public.admin_request_read_states
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX admin_request_read_states_admin_id_idx
ON public.admin_request_read_states(admin_id);