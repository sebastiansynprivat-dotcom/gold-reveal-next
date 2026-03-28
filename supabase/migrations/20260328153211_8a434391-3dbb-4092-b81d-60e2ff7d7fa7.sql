CREATE TABLE public.chatters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT '–',
  role text NOT NULL DEFAULT 'chatter',
  compensation_type text NOT NULL DEFAULT 'percentage',
  revenue_percentage numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  hours_worked numeric NOT NULL DEFAULT 0,
  fourbased_revenue numeric NOT NULL DEFAULT 0,
  maloum_revenue numeric NOT NULL DEFAULT 0,
  brezzels_revenue numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  crypto_address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chatters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on chatters"
  ON public.chatters FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER set_chatters_updated_at
  BEFORE UPDATE ON public.chatters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();