## Bot Notifications System

Wire the existing `SetupNotificationsBell` to a real `bot_notifications` table, add an ingest endpoint, dismiss via trash icon, sortable date, per-tab clear, and a cleaner UI.

### 1. Database

New table `public.bot_notifications`:
- `id uuid pk default gen_random_uuid()`
- `account_id uuid` (nullable, FK accounts.id on delete set null)
- `platform text not null`
- `date date not null default current_date`
- `type text not null` (POST, DM, CHATTER, LOGIN — free text, tabs derived dynamically)
- `account_email text`
- `message text not null`
- `created_at timestamptz default now()`

Indexes on `(type)`, `(date desc)`, `(account_id)`.

GRANT + RLS:
- `GRANT SELECT, DELETE ON public.bot_notifications TO authenticated`
- `GRANT ALL TO service_role`
- Policies: admins (`is_admin()`) can `SELECT` / `DELETE`; inserts only via service role from the edge function.
- Add table to `supabase_realtime` publication.

### 2. Edge function `ingest-bot-notifications`

`POST`, header auth via `BOT_NOTIF_KEY` secret (you provide). Accepts:
```json
{ "rows": [
  { "account_id?": "uuid", "account_email?": "alice_mo", "platform": "4BASED",
    "date?": "2026-05-28", "type": "POST", "message": "Failed to create database" }
] }
```
- Resolves `account_id` from `account_email` + `platform` if missing.
- Bulk insert; returns `{ inserted, errors }`.
- Uses service role; `verify_jwt = false`.

### 3. Frontend — `SetupNotificationsBell.tsx`

- Replace `MOCK` with live fetch from `bot_notifications` ordered by `date` (default desc), then `created_at` desc.
- Subscribe to realtime inserts/deletes — keeps bell badge and tab counts live.
- Tabs derived dynamically from distinct `type` values (preferred order POST, DM, CHATTER, LOGIN, then any extras alphabetically). Animated underline kept.
- **Dismiss**: each row shows a trash button on the right (always visible, not hover-only). Click trash → delete that row from DB with optimistic fade-out. Clicking the row itself does nothing.
- **Clear all (per active tab)**: deletes only rows of the current tab from DB, with a confirmation toast/undo would be overkill — single click deletes.
- **Search**: single input matches message / platform / account_email / date fragment (`MM-DD`, `YYYY-MM-DD`, day number).
- **Date sort toggle**: the date column header (and each row's date is part of that column) is clickable — toggles `asc` / `desc`. A small chevron next to the column indicates current direction.
- Model/account link logic still tries `accounts.account_email → model_id` for click-through.

### 4. UI polish (matches admin glass + gold style)

- Header: gold bell + "Bot Notifications" + count chip with gold ring (not red).
- Search bar with `input-gold-shimmer`; right-aligned "Clear (N)" ghost button styled in destructive only on hover.
- Tabs: animated gold underline, count badges using `bg-accent/15 text-accent` (red reserved for `LOGIN`-like critical types only if needed — keep neutral gold for all).
- Column header row (sticky) above the list:
  `Date ⌄  |  Platform  |  Account  |  Message  |  ` (trash column)
  Date header is the only interactive one.
- Rows: tighter 3-col grid `[date | platform | account | message | trash]`, hover row gets subtle `bg-accent/5` and `border-accent/15`. Trash icon turns destructive on hover.
- AnimatePresence fade-out on dismiss.
- Empty state: muted bell-off icon + "Alle Benachrichtigungen erledigt".

### 5. Files

- `supabase/migrations/<ts>_bot_notifications.sql` — table, indexes, grants, RLS, realtime publication.
- `supabase/functions/ingest-bot-notifications/index.ts` — new.
- `supabase/config.toml` — register function with `verify_jwt = false`.
- `src/components/admin/SetupNotificationsBell.tsx` — rewrite for live data + new UI.

### 6. Secret

Needs `BOT_NOTIF_KEY` runtime secret — I'll request it before implementation so the edge function can read it.

No other components or routes touched.
