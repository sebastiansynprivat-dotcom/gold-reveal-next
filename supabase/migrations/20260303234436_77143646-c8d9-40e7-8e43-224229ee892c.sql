ALTER TABLE public.profiles 
ADD COLUMN account_email text DEFAULT '',
ADD COLUMN account_password text DEFAULT '',
ADD COLUMN account_domain text DEFAULT '';