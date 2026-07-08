
CREATE TABLE public.chatter_daily_commitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  slots text[] NOT NULL DEFAULT '{}',
  daily_goal numeric,
  committed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by_user boolean,
  confirmed_at timestamptz,
  auto_confirmed_by_revenue boolean NOT NULL DEFAULT false,
  honesty_verdict text CHECK (honesty_verdict IN ('confirmed','soft_unclear','disproved','honest_no')),
  verified_at timestamptz,
  signal_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  streak_snapshot int,
  tier_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE ON public.chatter_daily_commitment TO authenticated;
GRANT ALL ON public.chatter_daily_commitment TO service_role;

ALTER TABLE public.chatter_daily_commitment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chatters read own commitment"
  ON public.chatter_daily_commitment FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Chatters insert own commitment"
  ON public.chatter_daily_commitment FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Chatters update own commitment (confirmation only)"
  ON public.chatter_daily_commitment FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update any commitment"
  ON public.chatter_daily_commitment FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER chatter_daily_commitment_updated_at
  BEFORE UPDATE ON public.chatter_daily_commitment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cdc_user_date ON public.chatter_daily_commitment(user_id, date DESC);

-- Streak + tier calculator
CREATE OR REPLACE FUNCTION public.get_commitment_streak(p_user_id uuid)
RETURNS TABLE(streak int, tier text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak int := 0;
  v_day date;
  v_row record;
  v_tier text;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_day := (now() AT TIME ZONE 'Europe/Berlin')::date;
  -- Skip today if not yet verified/confirmed
  FOR i IN 0..120 LOOP
    SELECT * INTO v_row
      FROM public.chatter_daily_commitment
     WHERE user_id = p_user_id AND date = v_day - i;
    IF NOT FOUND THEN
      IF i = 0 THEN CONTINUE; ELSE EXIT; END IF;
    END IF;
    -- Streak counts: confirmed_by_user=true AND verdict != 'disproved'
    IF v_row.confirmed_by_user = true
       AND (v_row.honesty_verdict IS NULL OR v_row.honesty_verdict IN ('confirmed','soft_unclear')) THEN
      v_streak := v_streak + 1;
    ELSIF v_row.honesty_verdict = 'honest_no' THEN
      -- pauses (does not reset, does not add)
      CONTINUE;
    ELSE
      IF i = 0 THEN CONTINUE; ELSE EXIT; END IF;
    END IF;
  END LOOP;

  IF v_streak >= 30 THEN v_tier := 'elite';
  ELSIF v_streak >= 14 THEN v_tier := 'priority';
  ELSIF v_streak >= 7  THEN v_tier := 'reliable';
  ELSIF v_streak >= 3  THEN v_tier := 'consistent';
  ELSE v_tier := 'rookie';
  END IF;

  RETURN QUERY SELECT v_streak, v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commitment_streak(uuid) TO authenticated, service_role;
