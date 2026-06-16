## Goal
Make the downloaded Chatter Report (XLSX + CSV) strictly follow this column order:

`Date, Name, Telegram ID, Models, Yesterday Revenue, Goal, Streak, Last Week Revenue, Last Month Revenue, All Time Revenue, Mass DM, Unread Chats, Oldest Chat, Notes, Start Date`

## Changes (single file: `src/components/admin/ChatterReportsTab.tsx`, `buildReport`)

1. **Reorder headers** to match the spec above (move `Start Date` to the end, move `Models` before revenue, insert `Notes` before `Start Date`).
2. **Rename** `Day Revenue` → `Yesterday Revenue`.
3. **Yesterday Revenue value** = revenue on the day *before* the selected report date. Source it from the existing `r.daily` array: `daily[daily.length - 2].total` (selected date is the last entry, previous day is the second-to-last). Fallback to `0` if missing.
4. **Notes column** = always empty string `""`.
5. Row values emitted in the new order accordingly.

No other UI, table, or filtering logic changes. XLSX column widths auto-adjust since they derive from header lengths.
