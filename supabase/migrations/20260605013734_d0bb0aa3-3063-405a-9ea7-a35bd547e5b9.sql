ALTER TABLE public.accounts_revenue RENAME TO accounts_data;

ALTER TABLE public.accounts_data
  ADD COLUMN followers integer,
  ADD COLUMN subscribers integer,
  ADD COLUMN oldest_chat integer,
  ADD COLUMN unread_chats integer,
  ADD COLUMN mass_dms integer;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_data TO authenticated;
GRANT ALL ON public.accounts_data TO service_role;