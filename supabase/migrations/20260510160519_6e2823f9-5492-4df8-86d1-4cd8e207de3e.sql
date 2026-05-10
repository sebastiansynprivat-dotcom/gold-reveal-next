CREATE TABLE public.model_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL UNIQUE,
  account_name TEXT,
  name TEXT,
  age TEXT,
  city TEXT,
  place_of_birth TEXT,
  favorite_color TEXT,
  favorite_movie TEXT,
  favorite_food TEXT,
  favorite_music TEXT,
  occupation TEXT,
  hobbies TEXT,
  dream TEXT,
  work TEXT,
  education TEXT,
  languages TEXT,
  special_marks TEXT,
  natural_hair TEXT,
  shoe_size TEXT,
  bra_size TEXT,
  height TEXT,
  weight TEXT,
  content_preferences TEXT,
  no_gos TEXT,
  additional_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.model_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Model can view own profile"
ON public.model_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.model_users mu
    WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Model can insert own profile"
ON public.model_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.model_users mu
    WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Model can update own profile"
ON public.model_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.model_users mu
    WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_model_profiles_updated_at
BEFORE UPDATE ON public.model_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();