CREATE TABLE public.fanvue_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  account_setup boolean NOT NULL DEFAULT false,
  chatter_assigned boolean NOT NULL DEFAULT false,
  chatter_name text NOT NULL DEFAULT '',
  social_linked boolean NOT NULL DEFAULT false,
  instagram_url text NOT NULL DEFAULT '',
  tiktok_url text NOT NULL DEFAULT '',
  twitter_url text NOT NULL DEFAULT '',
  other_social text NOT NULL DEFAULT '',
  marketers jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fanvue_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage fanvue_models"
ON public.fanvue_models FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Fanvue partners manage fanvue_models"
ON public.fanvue_models FOR ALL TO authenticated
USING (has_role(auth.uid(), 'fanvue_partner'::app_role))
WITH CHECK (has_role(auth.uid(), 'fanvue_partner'::app_role));

CREATE TRIGGER update_fanvue_models_updated_at
BEFORE UPDATE ON public.fanvue_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();