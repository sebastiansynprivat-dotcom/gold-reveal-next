
CREATE TABLE public.model_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_name text NOT NULL,
  request_type text NOT NULL DEFAULT 'general',
  price numeric,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own requests"
  ON public.model_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
  ON public.model_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all requests"
  ON public.model_requests FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
