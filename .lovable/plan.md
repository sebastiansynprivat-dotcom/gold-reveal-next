## Goal

Replace the single CSV download in `src/components/admin/ChatterReportsTab.tsx` with a **format picker (CSV or XLSX)**, both producing the exact strict format below. File name follows `Platform_Chatter_Report_YYYY-MM-DD.<ext>`.

## Final headers (in order, no `(€)` anywhere, no Notes)

1. Date
2. Name
3. Telegram ID
4. Models
5. Yesterday
6. Goal
7. Streak
8. Last Week Revenue
9. Last Month Revenue
10. All Time Revenue
11. Mass DM
12. Unread Chats
13. Oldest Chat

## Field sources

| Column | Source |
|--------|--------|
| Date | `yesterday = addDays(new Date(), -1)` → `YYYY-MM-DD` (same value in every row) |
| Name | `row.name` |
| Telegram ID | `row.telegram_id` |
| Models | Comma-separated model names from accounts assigned to this chatter on the active platform |
| Yesterday | `row.day` (revenue on the selected report date) |
| Goal | `profiles.daily_goal` (already in `row.goal`) |
| Streak | `row.streak` |
| Last Week Revenue | `row.week` |
| Last Month Revenue | `row.month` |
| All Time Revenue | `row.all_time` |
| Mass DM | `row.mass_dms` (sum of latest `accounts_data.mass_dms` per assigned account) |
| Unread Chats | `row.unread` (sum of latest `accounts_data.unread_chats`) |
| Oldest Chat | `row.oldest` (max of latest `accounts_data.oldest_chat`, days) |

## Scope per export

- One row per chatter on the **currently active platform tab** (matches the on-screen `filtered` set).
- Sheet name (XLSX) = the platform.
- File name: `${Platform}_Chatter_Report_${yyyy-mm-dd}.${ext}` (platform kept readable, spaces → `_`).

## Data additions

`Models` requires a small fetch extension:

1. Add `model_id` to the existing `accounts` select.
2. Batch-fetch `models(id, name)` for distinct `model_id`s.
3. Build `modelByAccount: Map<accountId, modelName>`.
4. While building each row, collect distinct model names for that platform's assignments → `row.models: string[]`.

## UI change — format picker

Replace the single "Download Report" button with a **dropdown menu** (existing `@/components/ui/dropdown-menu`):

```text
[ ⬇ Download Report ▾ ]
   ├─ Download as XLSX
   └─ Download as CSV
```

- Trigger keeps the current gold outline style and Download icon.
- Selecting an option calls `downloadReport("xlsx")` or `downloadReport("csv")`.

## Generation

- Add dependency: `xlsx` (SheetJS).
- One shared `buildRows()` returns `{ headers, rows }` (numbers stay numeric, strings stay strings).
- `downloadReport("csv")` → join with commas, quote strings containing `,` / `"` / `\n`, `Blob` + `URL.createObjectURL`.
- `downloadReport("xlsx")` → `XLSX.utils.aoa_to_sheet([headers, ...rows])`, set column widths, `book_append_sheet(wb, ws, platform)`, `XLSX.writeFile(wb, filename)`.

## Out of scope

No changes to the on-screen table, streak logic, goal editing, or any other tab.

## Technical notes

- Yesterday is computed at click time so the export is always relative to "now", independent of the table's date picker.
- `xlsx` adds ~400KB gzipped; acceptable for an admin-only tab. Loaded with a normal top-level import.
- If `model_id` is null on an account, that account contributes no entry to `Models` (deduped, joined with `", "`).
