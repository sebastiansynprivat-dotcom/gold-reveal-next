
-- Table to store individual bot messages per user
CREATE TABLE public.bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;

-- Admin can manage all bot messages
CREATE POLICY "Admin full access on bot_messages"
  ON public.bot_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can view their own bot message
CREATE POLICY "Users can view own bot message"
  ON public.bot_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bot_messages_updated_at
  BEFORE UPDATE ON public.bot_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
