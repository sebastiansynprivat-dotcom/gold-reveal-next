
-- Add manual flag to accounts table for manually assigned accounts
ALTER TABLE public.accounts ADD COLUMN is_manual boolean NOT NULL DEFAULT false;
