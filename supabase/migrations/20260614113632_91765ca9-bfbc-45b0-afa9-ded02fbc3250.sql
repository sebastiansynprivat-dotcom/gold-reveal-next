
CREATE TABLE public.profiles_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id text NOT NULL,
  date date NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  mass_dm integer,
  unread_chats integer,
  oldest_chat integer,
  models jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_data_telegram_date_unique UNIQUE (telegram_id, date)
);

CREATE INDEX idx_profiles_data_telegram_id ON public.profiles_data (telegram_id);
CREATE INDEX idx_profiles_data_date ON public.profiles_data (date);

GRANT SELECT ON public.profiles_data TO authenticated;
GRANT ALL ON public.profiles_data TO service_role;

ALTER TABLE public.profiles_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage profiles_data"
  ON public.profiles_data
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own profiles_data"
  ON public.profiles_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND lower(regexp_replace(p.telegram_id, '^@', '')) =
            lower(regexp_replace(profiles_data.telegram_id, '^@', ''))
    )
  );

CREATE TRIGGER update_profiles_data_updated_at
  BEFORE UPDATE ON public.profiles_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
