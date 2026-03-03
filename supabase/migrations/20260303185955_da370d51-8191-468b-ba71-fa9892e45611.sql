
-- Update the profile creation trigger to also save group_name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, group_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'group_name', ''));
  RETURN NEW;
END;
$$;
