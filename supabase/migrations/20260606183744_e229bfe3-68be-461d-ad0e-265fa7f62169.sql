
-- Cleanup duplicates, keep newest
DELETE FROM public.bot_notifications a
USING public.bot_notifications b
WHERE a.id <> b.id
  AND COALESCE(a.account_email,'') = COALESCE(b.account_email,'')
  AND COALESCE(a.platform,'') = COALESCE(b.platform,'')
  AND COALESCE(a.type,'') = COALESCE(b.type,'')
  AND COALESCE(a.message,'') = COALESCE(b.message,'')
  AND a.created_at < b.created_at;

ALTER TABLE public.bot_notifications
  ADD CONSTRAINT bot_notifications_dedup_key
  UNIQUE (account_email, platform, type, message);
