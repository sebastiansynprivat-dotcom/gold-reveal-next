# Account stats in the chatter's account card: why Monat / All-Time look wrong

## What the numbers currently mean

The card sums only the days on which **this** chatter was assigned to **this** account. For the selected card (account assigned to the current chatter since 17.08.2026) the only qualifying day with revenue is 17.08. (42 €), so Gestern = Woche = Monat = All-Time = 42 €. Earlier revenue on that account (e.g. 21 € on 29.07., 7 € on 06./07.08.) belongs to the previous chatter window and is excluded by design.

So the equal values aren't a data bug — but three real defects make the labels misleading:

1. **Today is never counted.** "Monat" and "All-Time" only add days with `date >= monthStart` / any day, but the loop still skips nothing for today — today's row is included only if already ingested; for this account today's row (18.08.) doesn't exist yet, while "Gestern" is the only visible number. Result: All-Time can lag the account's real total by a full day, and there is no "Heute" figure at all.
2. **All aggregation happens in the browser.** The card fetches every daily row of `accounts_data` for the account and sums it in the component. That also hits the API's 1000-row cap (one account already has 1004 daily rows), silently dropping the oldest days from "All-Time". None of these rows are rendered — only the totals are.
3. **No indication of scope.** Nothing on the card says the figures are limited to this chatter's assignment period, which is exactly why they read as "false".

## Changes

- Label the block so the scope is explicit: a small header such as `Umsatz (seit Zuweisung 17.08.2026)` above the four revenue rows, and add a `Heute` row so today's ingested revenue is visible.
- Make All-Time and Monat include today explicitly (they already do arithmetically once today's row exists; add `Heute` so a missing ingest is obvious rather than looking like wrong totals).
- Move the math to the backend: a single database function returns the finished totals (Heute, Gestern, Woche, Monat, All-Time) plus the latest Mass-DMs / offene Chats / ältester Chat and the assignment start date, already scoped to this chatter's assignment windows. The card just renders those numbers — no row lists in the browser, no row-cap truncation.
- Optional toggle (only if you want it): a small switch to show account-lifetime totals (all chatters) next to the assignment-scoped totals, for accounts where you want the full history.

## Technical notes

- New security-definer RPC `get_account_chatter_stats(p_account_id uuid, p_user_id uuid)` in the database: joins `accounts_data` against `account_assignments` windows for that user+account (`date between start_date and coalesce(end_date, current_date)`), returns one row with `today, yesterday, week, month, all_time, mass_dms, open_chats, oldest_chat, assigned_since`. Latest-day metrics taken from the newest qualifying row. Execute granted to `authenticated`, with the same admin/access check the account views already use (`can_access_account`).
- `src/components/admin/AccountStatsRows.tsx`: replace the two client queries with one `supabase.rpc("get_account_chatter_stats", ...)` call, render a `Heute` row and the `Umsatz (seit Zuweisung …)` header, and report `assigned_since` through the existing `onAssignedDate` callback.

