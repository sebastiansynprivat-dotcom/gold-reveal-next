
CREATE TABLE public.setup_attention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL CHECK (type IN ('post','message','campaign')),
  reason text NOT NULL,
  resolved_by_user boolean NOT NULL DEFAULT false,
  resolved_by_user_id uuid,
  resolved_by_name text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, date, type)
);

GRANT SELECT, UPDATE ON public.setup_attention TO authenticated;
GRANT ALL ON public.setup_attention TO service_role;

ALTER TABLE public.setup_attention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view attention"
  ON public.setup_attention FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update attention"
  ON public.setup_attention FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER trg_setup_attention_updated_at
  BEFORE UPDATE ON public.setup_attention
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_setup_attention_date ON public.setup_attention (date DESC);
CREATE INDEX idx_setup_attention_account ON public.setup_attention (account_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.setup_attention;

CREATE OR REPLACE FUNCTION public.refresh_setup_attention()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_count integer := 0;
BEGIN
  DELETE FROM public.setup_attention WHERE date = v_today;

  -- Rule 1: POST_MISSING — post=true, no posted>0 in last 3 days (today inclusive)
  INSERT INTO public.setup_attention (account_id, date, type, reason)
  SELECT a.id, v_today, 'post',
         'Keine Posts in den letzten 3 Tagen'
  FROM public.accounts a
  WHERE a.post = true
    AND NOT EXISTS (
      SELECT 1 FROM public.post_reports pr
      WHERE pr.account_id = a.id
        AND pr.date >= v_today - 2
        AND pr.date <= v_today
        AND COALESCE(pr.posted, 0) > 0
    )
  ON CONFLICT (account_id, date, type) DO NOTHING;

  -- Rule 2: MESSAGE_MISSING — message=true, no message_reports.total>0 in last 7 days
  INSERT INTO public.setup_attention (account_id, date, type, reason)
  SELECT a.id, v_today, 'message',
         'Keine Nachrichten in den letzten 7 Tagen'
  FROM public.accounts a
  WHERE a.message = true
    AND NOT EXISTS (
      SELECT 1 FROM public.message_reports mr
      WHERE mr.account_id = a.id
        AND mr.date >= v_today - 6
        AND mr.date <= v_today
        AND COALESCE(mr.total, 0) > 0
    )
  ON CONFLICT (account_id, date, type) DO NOTHING;

  -- Rule 3: CAMPAIGN_LOW — message=true AND campaign=true AND yesterday's total < 200
  INSERT INTO public.setup_attention (account_id, date, type, reason)
  SELECT a.id, v_today, 'campaign',
         'Kampagne nur ' || COALESCE((
            SELECT mr.total FROM public.message_reports mr
            WHERE mr.account_id = a.id AND mr.date = v_yesterday
            LIMIT 1
         ), 0) || ' Nachrichten gestern (Ziel ≥ 200)'
  FROM public.accounts a
  WHERE a.message = true
    AND a.campaign = true
    AND COALESCE((
      SELECT mr.total FROM public.message_reports mr
      WHERE mr.account_id = a.id AND mr.date = v_yesterday
      LIMIT 1
    ), 0) < 200
  ON CONFLICT (account_id, date, type) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.setup_attention WHERE date = v_today;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_setup_attention() TO service_role;
