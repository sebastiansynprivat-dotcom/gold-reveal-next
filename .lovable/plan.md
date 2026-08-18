# Former assignments per chatter (main chatter list)

Add a muted, collapsed "Frühere Zuweisungen" section inside each expanded chatter row in the main chatter list (Chatter tab), below the current account cards.

## Behaviour
- A small muted toggle row: chevron arrow + text `Frühere Zuweisungen (n)`. Collapsed by default, per chatter.
- Only rendered when the chatter has at least one closed assignment (`end_date` is not null).
- On expand: one card per closed assignment, visually muted (no platform accent border, muted text, lower opacity) so they don't compete with active accounts.
- Card header shows platform + account domain, plus the period: `12.03.2026 – 04.06.2026` (start and end date, `dd.MM.yyyy`).
- Card body shows the stats for that assignment window only: total revenue in the window, number of days, average per day, and the last known Mass-DMs / oldest open chat at the end of the window. No "Heute/Gestern/Woche/Monat" rows — those are meaningless for a closed period.
- Below the stats, a muted line chart of revenue per date across the whole assignment period (Recharts `LineChart`, muted stroke, no gold accent). Long periods get a horizontally scrollable wrapper (`overflow-x-auto`) with a minimum width scaled by the number of days, so points stay readable instead of compressed.
- Stats load lazily, only when the section is expanded.

## Data
- Load closed assignments for the visible chatters (account_id, user_id, profile_id, start_date, end_date) and map them to accounts already loaded in the chatter list. Accounts that were deleted meanwhile show the platform stored on the assignment row if available, otherwise a muted "Account entfernt" label.
- Window-scoped stats come from a new server-side function `get_account_chatter_stats_window(p_account_id, p_user_id, p_start, p_end)` returning a single row: `total`, `days`, `avg_per_day`, `mass_dms`, `oldest_chat`, plus `series` as a JSON array of `{ date, total }` for the window. Same admin/self auth check as the existing `get_account_chatter_stats`; all aggregation stays in the database — no daily rows are fetched into the browser, the chart consumes the returned array directly.


## Technical notes
- `src/pages/AdminDashboard.tsx`: extend `loadChatters` with a second `account_assignments` query filtered to `end_date is not null`, stored as `former_assignments` on the enriched chatter; add `expandedFormer` state keyed by chatter row key; render the toggle + list in the expanded block after the active account cards.
- New component `src/components/admin/FormerAssignmentCard.tsx`: header with period, calls the new RPC once, renders muted stat rows (mirrors the layout of `AccountStatsRows`) plus the scrollable Recharts line chart from the returned `series` array.
- New migration for `get_account_chatter_stats_window` (security definer, returns one row including a `jsonb` series, `GRANT EXECUTE` to `authenticated`).
