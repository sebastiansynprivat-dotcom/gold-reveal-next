## Per-model rows in Chatter Report download

Change the download report in **Admin → Reports** so each chatter is split into one row per assigned model. Per-model rows pull revenue **and** chat metrics (Mass DM, Unread, Oldest) from `accounts_data`, since those are per-account fields.

### Scope

- File: `src/components/admin/ChatterReportsTab.tsx`
- Only the download payload (`buildReport` + the data it needs) changes. The on-screen table stays as is.

### New row shape

Today: one row per chatter × platform, `Models` column joins names with commas.

New: **one row per chatter × model**. Columns:

```
Date | Name | Telegram ID | Platform | Model |
Yesterday Revenue | Goal | Streak |
Last Week Revenue | Last Month Revenue | All Time Revenue |
Mass DM | Unread Chats | Oldest Chat | Notes | Start Date
```

- Chatters with no assigned model still produce one row (`Model = "Unassigned"`, falls back to chatter-level numbers from `profiles_data`).
- `Goal`, `Streak`, `Start Date` stay chatter-level (no per-model concept exists). Repeated on each model row of the chatter.

### Per-model data source — `accounts_data`

`accounts_data` is per-account-per-day and contains:

- `total` (revenue)
- `mass_dms`, `unread_chats`, `oldest_chat`

For each chatter × model row:

1. Determine the chatter's assigned accounts for that model (re-use existing `assignments + accounts` join, group `account_id` by the model display name).
2. Fetch `accounts_data` rows for those `account_id`s, respecting the chatter's `account_assignments` window per account (see `AccountStatsRows.tsx` pattern: only count `date` inside any assignment window).
3. Compute per range:
   - `Yesterday Revenue` = sum of `total` on the day before the selected date
   - `Last Week Revenue`, `Last Month Revenue`, `All Time Revenue` = sum of `total` over the existing ranges
4. Chat metrics from the latest in-window `accounts_data` row across the model's accounts:
   - `Mass DM` = sum of `mass_dms` across the model's accounts on their latest in-window date
   - `Unread Chats` = sum of `unread_chats` likewise
   - `Oldest Chat` = max of `oldest_chat` likewise (days, biggest = oldest)

Numbers rounded to integers (consistent with `AccountStatsRows`).

### Data fetch addition

One extra batched query in the existing `useEffect`, running in parallel with current fetches:

```ts
supabase
  .from("accounts_data")
  .select("account_id,date,total,mass_dms,unread_chats,oldest_chat")
  .in("account_id", allAssignedAccountIds)
  .lte("date", selISO)
```

Paginated in 1000-row pages, chunked by 100 account ids — same pattern as the existing `profiles_data` loader.

Aggregation happens client-side per chatter × model using the in-window filter from `AccountStatsRows.tsx`.

### Filename

`{platform}_Chatter_Report_by_Model_{date}.{xlsx|csv}`

### Fallback for chatters without assigned accounts

If the chatter has no `accounts_data` (no assigned accounts, or all empty), the single "Unassigned" model row keeps using the existing chatter-level numbers from `profiles_data` so the report doesn't go blank.

### Out of scope

- On-screen table layout
- Per-model goal / streak (not tracked per model)
- New UI controls — the download just emits the new shape
