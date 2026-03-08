ALTER TABLE public.model_dashboard 
  ADD COLUMN maloum_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN brezzels_submitted boolean NOT NULL DEFAULT false;