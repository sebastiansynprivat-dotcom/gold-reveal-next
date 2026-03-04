-- Allow admin to delete accounts
CREATE POLICY "Admin can delete accounts"
ON public.accounts
FOR DELETE
USING (is_admin());