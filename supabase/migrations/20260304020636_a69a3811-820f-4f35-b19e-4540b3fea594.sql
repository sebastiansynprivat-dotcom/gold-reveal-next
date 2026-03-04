
-- Add account_id and follow_up_message to bot_messages
ALTER TABLE public.bot_messages ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.bot_messages ADD COLUMN follow_up_message text NOT NULL DEFAULT '';

-- Drop old unique constraint on user_id and add one on account_id
ALTER TABLE public.bot_messages DROP CONSTRAINT IF EXISTS bot_messages_user_id_key;
ALTER TABLE public.bot_messages ADD CONSTRAINT bot_messages_account_id_key UNIQUE (account_id);
