ALTER TABLE public.accounts_data DROP CONSTRAINT accounts_data_account_id_fkey;
ALTER TABLE public.accounts_data ADD CONSTRAINT accounts_data_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.accounts_data DROP CONSTRAINT accounts_data_model_id_fkey;
ALTER TABLE public.accounts_data ADD CONSTRAINT accounts_data_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;