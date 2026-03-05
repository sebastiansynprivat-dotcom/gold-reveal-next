
CREATE POLICY "Service role can read ai_prompts"
ON public.ai_prompts FOR SELECT TO service_role
USING (true);
