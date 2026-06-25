
-- 1) Backfill: create profile rows for any auth user that has none
INSERT INTO public.profiles (user_id, group_name, name)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'group_name', ''),
       COALESCE(u.raw_user_meta_data->>'name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- 2) Prevent duplicates going forward
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON public.profiles (user_id)
  WHERE user_id IS NOT NULL;
