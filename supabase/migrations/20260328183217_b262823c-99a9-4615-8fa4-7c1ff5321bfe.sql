
-- Add created_by column
ALTER TABLE public.chatters ADD COLUMN created_by uuid;

-- Drop old blanket policy
DROP POLICY IF EXISTS "Admin full access on chatters" ON public.chatters;

-- Super-admins keep full access
CREATE POLICY "Super admins full access on chatters"
ON public.chatters FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Sub-admins only own chatters
CREATE POLICY "Sub admins manage own chatters"
ON public.chatters FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid());
