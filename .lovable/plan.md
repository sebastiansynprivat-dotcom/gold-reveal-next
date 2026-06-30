## Goal
In the Setup section header, between the "Setup" title (left) and the accounts badge + bell (right), surface flashing red `ATTENTION !!!` text when one or more accounts fail daily setup-health checks. Click it to open a searchable/filterable popup. A daily cron repopulates the table from scratch.

## Detection rules (per account, no `model_active` filter)
For each account in `public.accounts`:
1. **POST_MISSING** — `accounts.post = true` AND no `post_reports` row with `posted > 0` in the last 3 days (today inclusive).
2. **MESSAGE_MISSING** — `accounts.message = true` AND no `message_reports` row with `total > 0` in the last 7 days.
3. **CAMPAIGN_LOW** — `accounts.message = true` AND `accounts.campaign = true` AND yesterday's `message_reports.total < 200` (or no row for yesterday).

Each violation becomes one `setup_attention` row.

## Data model
New table `public.setup_attention`:
- `id` uuid pk
- `account_id` uuid fk → `accounts.id` on delete cascade
- `date` date — evaluation day
- `type` text check in (`post`,`message`,`campaign`)
- `reason` text — e.g. "Keine Posts seit 3 Tagen", "Kampagne nur 142 Nachrichten gestern"
- `resolved_by_user` bool default false
- `resolved_by_user_id` uuid nullable (auth user id)
- `resolved_by_name` text nullable (snapshot of the resolver's display name)
- `resolved_at` timestamptz nullable
- `created_at`, `updated_at`
- unique `(account_id, date, type)`
- GRANTs: `SELECT, UPDATE` to `authenticated`, `ALL` to `service_role`. RLS: select/update only when `is_admin()`. Insert/delete via service role only.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.setup_attention`.

## Backend
- SQL function `public.refresh_setup_attention()` (SECURITY DEFINER):
  - `DELETE FROM setup_attention WHERE date = current_date` (fresh set, no stacking).
  - Insert rows for the three rule violations.
  - Returns inserted count.
- Edge function `refresh-setup-attention` (`verify_jwt = false`) — invokes the SQL function via service role. Used by cron and the manual refresh button.
- `pg_cron` job: daily at 03:00 Europe/Berlin → POSTs to the edge function (cron SQL via `supabase--insert`, not migration, since it contains the project URL + anon key).

## Frontend
New component `src/components/admin/SetupAttentionAlert.tsx`:
- Realtime-subscribed `useEffect` channel on `setup_attention` filtered to today.
- Renders nothing if no rows for today.
- Otherwise renders bare flashing red text `ATTENTION !!!` (no pill, no background): bold uppercase, `text-red-500`, custom keyframe `@keyframes attention-flash { 0%,100% { opacity:1 } 50% { opacity:0.25 } }` ~1s infinite, with `drop-shadow` for visibility. Clickable button wrapper for the dialog trigger.
- Dialog content:
  - Search input (filters across platform, email, username, reason).
  - Filter chips: Type (`alle / post / message / campaign`), Status (`alle / offen / ✓ erledigt`), Platform (dynamic from current rows).
  - Sortable table: Platform · Account (email + username) · Type badge · Reason · Resolver · ✓ toggle.
  - Toggle writes `resolved_by_user`, `resolved_by_user_id = auth.uid()`, `resolved_by_name` (from current admin profile name), `resolved_at = now()`. Row stays visible with green check + strikethrough. Untoggling clears the fields.
  - Manual "Jetzt neu prüfen" admin button → invokes `refresh-setup-attention`.

Mount in `src/pages/AdminDashboard.tsx` (~line 7707) — header becomes a 3-zone flex:
- left: `<CheckCircle2/>` + `Setup`
- center (flex-1, justify-center): `<SetupAttentionAlert/>`
- right: `{accounts.length} Accounts` badge + `<SetupNotificationsBell/>`

## Files
- New migration: `setup_attention` table + GRANTs + RLS + `refresh_setup_attention()` + realtime publication.
- Cron job inserted via `supabase--insert`.
- New edge function: `supabase/functions/refresh-setup-attention/index.ts`.
- New component: `src/components/admin/SetupAttentionAlert.tsx`.
- Edit: `src/pages/AdminDashboard.tsx` (Setup header layout + mount).
