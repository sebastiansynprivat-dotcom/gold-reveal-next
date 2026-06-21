## Per-model rows in Chatter Report download

Change only the **download** report in Admin → Reports so each chatter is split into one row per assigned model. The on-screen table is untouched and keeps reading from `profiles_data` as today.

### Scope

- File: `src/components/admin/ChatterReportsTab.tsx`
- Only the download payload (`buildReport` + the extra data it needs) changes.
- On-screen table: **unchanged** (still sourced from `profiles_data`).

### New row shape (download only)

One row per **chatter × model**. Columns:

```
Date | Name | Telegram ID | Platform | Model |
Yesterday Revenue | Goal | Streak |
Last Week Revenue | Last Month Revenue | All Time Revenue |
Mass DM | Unread Chats | Oldest Chat | Notes | Start Date
```

- Chatters with no assigned model still produce one row (`Model = "Unassigned"`, falls back to chatter-level numbers from `profiles_data`).
- `Goal`, `Streak`, `Start Date` stay chatter-level (no per-model concept exists). Repeated on each model row.

### Per-model data source — `accounts_data`

`accounts_data` is per-account-per-day and contains `total`, `mass_dms`, `unread_chats`, `oldest_chat`.

For each chatter × model row:

1. Group the chatter's assigned `account_id`s by model display name.
2. Filter `accounts_data` rows by the chatter's per-account `account_assignments` window (same in-window pattern as `AccountStatsRows.tsx`).
3. Compute per range:
   - `Yesterday Revenue` = sum of `total` on the day before the selected date
   - `Last Week / Last Month / All Time Revenue` = sum of `total` over the existing ranges
4. Chat metrics from the latest in-window row per account, then aggregated across the model's accounts:
   - `Mass DM` = sum of latest `mass_dms`
   - `Unread Chats` = sum of latest `unread_chats`
   - `Oldest Chat` = max of latest `oldest_chat` (days, biggest = oldest)

Numbers rounded to integers.

### Data fetch addition

One extra batched query in the existing `useEffect`, in parallel with current fetches:

```ts
supabase
  .from("accounts_data")
  .select("account_id,date,total,mass_dms,unread_chats,oldest_chat")
  .in("account_id", allAssignedAccountIds)
  .lte("date", selISO)
```

Paginated in 1000-row pages, chunked by 100 account ids — same pattern as the existing `profiles_data` loader. Aggregation is client-side per chatter × model.

### Filename

`{platform}_Chatter_Report_by_Model_{date}.{xlsx|csv}`

### Fallback

If a chatter has no assigned accounts (or no `accounts_data` rows), the single "Unassigned" row uses the existing chatter-level numbers from `profiles_data` so the report doesn't go blank.

### Out of scope

- On-screen table (stays as-is, still from `profiles_data`)
- Per-model goal / streak (not tracked per model)
- New UI controls
