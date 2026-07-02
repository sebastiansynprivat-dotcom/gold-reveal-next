-- Claim Martin Kienemund's pre-create profile for his existing auth user.
-- Auth user: 8b583e44-2ae9-4212-a9e9-89cd89f92653 (martin.kienemund@googlemail.com)
-- Pre-create profile: 7dc303ea-30ff-4cf0-ba22-304aea1fd5d4 (telegram 8703254485)
UPDATE public.profiles
   SET user_id   = '8b583e44-2ae9-4212-a9e9-89cd89f92653',
       pre_create = false,
       group_name = COALESCE(NULLIF(group_name, ''), 'Roseboy'),
       updated_at = now()
 WHERE id = '7dc303ea-30ff-4cf0-ba22-304aea1fd5d4'
   AND user_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.profiles p2
      WHERE p2.user_id = '8b583e44-2ae9-4212-a9e9-89cd89f92653'
   );

-- Also link the open account_assignments to his user_id so revenue RPCs pick them up.
UPDATE public.account_assignments
   SET user_id = '8b583e44-2ae9-4212-a9e9-89cd89f92653'
 WHERE profile_id = '7dc303ea-30ff-4cf0-ba22-304aea1fd5d4'
   AND user_id IS NULL;