CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lang text := lower(COALESCE(NEW.raw_user_meta_data->>'language', 'de'));
BEGIN
  IF v_lang NOT IN ('de','en') THEN
    v_lang := 'en';
  END IF;

  INSERT INTO public.profiles (user_id, group_name, name, language, ui_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'group_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_lang,
    v_lang
  );
  RETURN NEW;
END;
$$;