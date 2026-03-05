INSERT INTO public.ai_prompts (prompt_key, prompt_text)
SELECT 'analysis_prompt', 'Du bist ein hilfreicher Assistent für Chat-Analysen.'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_prompts WHERE prompt_key = 'analysis_prompt');