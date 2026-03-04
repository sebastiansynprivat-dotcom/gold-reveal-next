CREATE TABLE public.chatter_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  summary text NOT NULL DEFAULT '',
  summary_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

ALTER TABLE public.chatter_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage chatter summaries"
  ON public.chatter_summaries FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());