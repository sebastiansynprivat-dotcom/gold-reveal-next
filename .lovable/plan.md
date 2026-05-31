## Wire up Media Stats + Reset Media + remove DMs Per Day

In `src/pages/AdminDashboard.tsx`, Setup → Account expansion:

### 1. Media stats fetch (Posting Behavior block)
- Add state `mediaStats: Record<string, { active: number; posted: number; failed: number; remaining: number }>` and `mediaLoading: Record<string, boolean>`.
- Add helper `fetchMediaStats(acc)` that POSTs to a blank URL (constant `MEDIA_STATS_URL = ""` at top of the section, easy to fill in later) with JSON body:
  ```
  { id: acc.id, platform: acc.platform, email: acc.account_email }
  ```
  Expects response `{ active, posted, failed, remaining }`, stores into `mediaStats[acc.id]`. Guarded so empty URL is a no-op.
- Trigger it in the existing `useEffect` that runs on `expandedBot` change (same place reports7d is fetched), once per expanded account.
- Replace the four `—` placeholders with `mediaStats[acc.id]?.active ?? "—"` etc.

### 2. Reset Media button (Posting Behavior block)
- Add a small button under the stats grid labeled "Reset Media" (subtle destructive style, matching existing button language).
- On click: POST to `MEDIA_RESET_URL = ""` (also blank) with the same body `{ id, platform, email }`. Response shape `{ active, posted, failed, remaining }` — write straight into `mediaStats[acc.id]` so the UI updates.
- Disabled + spinner state while in flight; toast on success/error.

### 3. Remove "DMs Per Day" row (Mass DM Behavior block)
- Delete lines ~7100-7103 (the `DMs Per Day: —` row). Nothing else in that block changes.

### Technical notes
- Both endpoints are plain `fetch` calls with `Content-Type: application/json`. URLs left as empty string constants near the component for the user to fill in later; no edge function created.
- No DB schema or migration changes.
- Stats are fetched lazily on account expand and after a reset — no polling.