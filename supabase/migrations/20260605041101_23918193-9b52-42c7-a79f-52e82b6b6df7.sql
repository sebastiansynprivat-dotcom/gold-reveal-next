ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, group_name, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'group_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$function$;