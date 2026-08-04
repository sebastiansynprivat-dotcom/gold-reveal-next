update public.model_requests r
set model_id = m.id
from public.models m
where r.model_id is null
  and lower(trim(m.name)) = lower(trim(r.model_name))
  and (select count(*) from public.models m2 where lower(trim(m2.name)) = lower(trim(r.model_name))) = 1;