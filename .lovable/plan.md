# Account stats in the chatter's account card: why Monat / All-Time look wrong

## What the numbers currently mean

The card sums only the days on which **this** chatter was assigned to **this** account. For the selected card (account assigned to the current chatter since 17.08.2026) the only qualifying day with revenue is 17.08. (42 €), so Gestern = Woche = Monat = All-Time = 42 €. Earlier revenue on that account (e.g. 21 € on 29.07., 7 € on 06./07.08.) belongs to the previous chatter window and is excluded by design.

So the equal values aren't a data bug — but three real defects make the labels misleading:

1. **Today is never counted.** "Monat" and "All-Time" only add days with `date >= monthStart` / any day, but the loop still skips nothing for today — today's row is included only if already ingested; for this account today's row (18.08.) doesn't exist yet, while "Gestern" is the only visible number. Result: All-Time can lag the account's real total by a full day, and there is no "Heute" figure at all.
2. **Row limit truncation.** The revenue query fetches `accounts_data` without a limit, so the backend caps it at 1000 rows ordered by newest date. One account already has 1004 daily rows, so its oldest days silently drop out of "All-Time". More accounts will cross that line over time.
3. **No indication of scope.** Nothing on the card says the figures are limited to this chatter's assignment period, which is exactly why they read as "false".

## Changes

- Label the block so the scope is explicit: a small header such as `Umsatz (seit Zuweisung 17.08.2026)` above the four revenue rows, and add a `Heute` row so today's ingested revenue is visible.
- Make All-Time and Monat include today explicitly (they already do arithmetically once today's row exists; add `Heute` so a missing ingest is obvious rather than looking like wrong totals).
- Remove the row cap risk: request `accounts_data` with an explicit high limit / date-range filter (`date >= earliest assignment start`) instead of an unbounded newest-first select, so the assignment window is always fully covered.
- Optional toggle (only if you want it): a small switch to show account-lifetime totals (all chatters) next to the assignment-scoped totals, for accounts where you want the full history.

## Technical notes

All in `src/components/admin/AccountStatsRows.tsx`:
- Compute `earliestStart` from the fetched `account_assignments` rows and add `.gte("date", earliestStart)` plus `.limit(5000)` to the `accounts_data` query.
- Add `today` accumulator (`row.date === todayISO`) and render a `Heute` row.
- Render the scope header from the latest assignment `start_date` already reported via `onAssignedDate`.
No database or RPC changes needed.
