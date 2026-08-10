-- Link Martin Kienemund's real login profile and consolidate his assignments
UPDATE public.profiles
SET name = COALESCE(NULLIF(name,''), 'martin_kienemund'),
    group_name = COALESCE(NULLIF(group_name,''), 'Martin Kienemund'),
    telegram_id = COALESCE(NULLIF(telegram_id,''), '8703254485')
WHERE id = '301494f6-79dc-487b-8f96-2ff6308c27f0';

UPDATE public.account_assignments
SET profile_id = '301494f6-79dc-487b-8f96-2ff6308c27f0',
    user_id = '8b583e44-2ae9-4212-a9e9-89cd89f92653'
WHERE profile_id = '7dc303ea-30ff-4cf0-ba22-304aea1fd5d4';

UPDATE public.account_assignments
SET profile_id = '301494f6-79dc-487b-8f96-2ff6308c27f0'
WHERE user_id = '8b583e44-2ae9-4212-a9e9-89cd89f92653' AND profile_id IS NULL;

DELETE FROM public.profiles WHERE id = '7dc303ea-30ff-4cf0-ba22-304aea1fd5d4';