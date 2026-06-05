## Wire revenue cards + chart to `accounts_data.total`

Switch the chatter Dashboard's revenue cards, the "Earnings this month" widget, and the 7‑day chart from `daily_revenue` to `accounts_data.total`. Scope = accounts currently assigned to the chatter via `account_assignments` where `unassigned_at IS NULL`. Rows with a non‑null `unassigned_at` are ignored entirely.

### Backend: new RPC

```sql
create or replace function public.get_chatter_revenue_series(
  p_from date,
  p_to   date
)
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
```

One call returns a daily series; the client derives every number from it.

### Frontend changes

**`src/pages/Dashboard.tsx`** — revenue loader (~lines 447‑477)
- Drop the `daily_revenue` query.
- Call `supabase.rpc("get_chatter_revenue_series", { p_from: <Jan 1 of current year>, p_to: today })`.
- Derive:
  - `umsatz` (today) = row where `date === today` → `total`
  - `yesterdayRevenue` = row where `date === yesterday` → `total`
  - `monthlyRevenue` = sum where `date >= monthStart` ← also feeds `<MonthSummaryWidget monthlyRevenue={…}/>` ("Earnings this month")
  - `totalRevenue` = sum of all returned rows ("Total Revenue Ratio")

No prop changes needed on `MonthSummaryWidget` — it already consumes `monthlyRevenue`, so it updates automatically.

**`src/components/RevenueChart.tsx`** — the "Last 7 days" area chart below the cards (rendered at `Dashboard.tsx:1114`)
- Replace the `daily_revenue` query (`from("daily_revenue").select("date, amount")…`) with the same RPC:
  `supabase.rpc("get_chatter_revenue_series", { p_from: format(subDays(today,6),"yyyy-MM-dd"), p_to: format(today,"yyyy-MM-dd") })`
- Map response rows (`{date, total}`) onto the existing 7‑day skeleton, treating missing days as `0` — keep the same mapping/rendering logic, gold gradient, tooltip, and trend arrow.

### Out of scope
- No UI/layout changes.
- No change to admin views, model dashboards, or the `daily_revenue` ingest path.
