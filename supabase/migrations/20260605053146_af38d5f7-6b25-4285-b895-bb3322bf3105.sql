create or replace function public.get_chatter_revenue_series(p_from date, p_to date)
returns table(date date, total numeric)
language sql stable security definer set search_path = public as $$
  select ad.date, sum(ad.total)::numeric as total
  from account_assignments aa
  join accounts_data ad on ad.account_id = aa.account_id
  where aa.user_id = auth.uid()
    and aa.unassigned_at is null
    and ad.date between p_from and p_to
  group by ad.date
  order by ad.date;
$$;
grant execute on function public.get_chatter_revenue_series(date, date) to authenticated;