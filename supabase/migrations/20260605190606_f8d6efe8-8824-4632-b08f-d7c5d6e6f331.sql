
CREATE TABLE public.wallet_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  serial_number text NOT NULL UNIQUE,
  pass_url text NOT NULL,
  last_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_passes TO authenticated;
GRANT ALL ON public.wallet_passes TO service_role;

ALTER TABLE public.wallet_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own pass"
  ON public.wallet_passes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());

CREATE TRIGGER update_wallet_passes_updated_at
  BEFORE UPDATE ON public.wallet_passes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
