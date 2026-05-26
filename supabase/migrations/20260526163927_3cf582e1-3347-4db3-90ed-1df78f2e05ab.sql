CREATE TABLE public.library_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_key TEXT NOT NULL,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_reads TO authenticated;
GRANT ALL ON public.library_reads TO service_role;

ALTER TABLE public.library_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own library_reads" ON public.library_reads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all library_reads" ON public.library_reads
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE TRIGGER update_library_reads_updated_at
  BEFORE UPDATE ON public.library_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();