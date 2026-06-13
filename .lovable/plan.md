## Correction

You are right. The current table logic is wrong for what this report is supposed to show.

Right now the UI calculates:

```text
D = selected day
W = rolling/current 7-day window ending on selected day
M = current calendar month-to-date
```

But based on your report requirement, it should calculate:

```text
D = yesterday / selected report day
W = previous completed week
M = previous completed month
All Time = all revenue inside assignment windows
```

So for Ifeanyi Odo, if his 4Based assignment started only 4 days ago:

```text
W = 0
M = 0
All Time = revenue from assignment start until report date
```

## Plan

Update `src/components/admin/ChatterReportsTab.tsx` only.

### 1. Fix period definitions

Replace the current rolling/current-period buckets with completed periods:

```text
Selected/report date: yesterday or the date picker value
Last Week: the completed 7-day period before the current/report week
Last Month: the completed calendar month before the report month
All Time: every revenue row that falls inside the chatter's assignment window
```

Example if report date is `2026-06-13`:

```text
D = 2026-06-13 or yesterday depending on context
W = 2026-06-01 → 2026-06-07, if using Monday-Sunday completed week
M = 2026-05-01 → 2026-05-31
All Time = assignment start → report date
```

Because Ifeanyi started on `2026-06-09`, both W and M become `0`.

### 2. Make all revenue numbers assignment-bounded

For each chatter/platform row:

- Load assignments for that chatter.
- Load account revenue rows for the relevant accounts.
- Count a revenue row only if:

```text
account_id matches the assignment account
AND revenue date is between assignment.start_date and assignment.end_date/report date
```

No revenue before assignment start should ever appear in D, W, M, or All Time.

### 3. Remove the inconsistent batching issue

Replace the current split fetch:

```text
recent 160 days fetch
older all-time fetch
```

with one paginated fetch using `.range()` so no rows are silently capped at 1000.

Then calculate D, W, M, and All Time from the same dataset.

### 4. Keep report/download format unchanged

No change to headers or file format:

```text
Date, Name, Telegram ID, Models, Yesterday, Goal, Streak,
Last Week Revenue, Last Month Revenue, All Time Revenue,
Mass DM, Unread Chats, Oldest Chat
```

Only the values behind `Last Week Revenue`, `Last Month Revenue`, and `All Time Revenue` change.

### 5. Add a guard for impossible math

Add a dev-only sanity check:

```text
if Last Week > All Time or Last Month > All Time:
  warn with chatter name, platform, assignment window, and values
```

This prevents this exact mistake from coming back.