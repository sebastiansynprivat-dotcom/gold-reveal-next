UPDATE public.model_request_messages
SET visible_to_chatter = true
WHERE sender_role = 'admin'
  AND visible_to_chatter = false;

CREATE OR REPLACE FUNCTION public.ensure_admin_request_message_visible()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_role = 'admin' THEN
    NEW.visible_to_chatter := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_admin_request_message_visible ON public.model_request_messages;
CREATE TRIGGER trg_ensure_admin_request_message_visible
BEFORE INSERT OR UPDATE OF sender_role, visible_to_chatter
ON public.model_request_messages
FOR EACH ROW
EXECUTE FUNCTION public.ensure_admin_request_message_visible();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'model_request_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_request_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'model_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_requests;
  END IF;
END;
$$;