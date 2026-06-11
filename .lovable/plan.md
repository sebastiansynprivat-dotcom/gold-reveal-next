## Goal
Include pre-create profiles in the admin chatters list with full stats and assigned-account expansion, while gracefully degrading for things that need a real user account (push, login activity, PWA).

## Backend

Extend `public.get_chatter_real_stats` to accept profile ids as well, since pre-create rows have no `user_id`:

```sql
get_chatter_real_stats(p_user_ids uuid[], p_profile_ids uuid[] DEFAULT '{}')
```

- Build `targets` from `p_user_ids` (resolving `profile_id` via `profiles`) **plus** `p_profile_ids` (resolving `user_id` if any).
- Return one row per input id, keyed by `user_id` when present, otherwise by `profile_id`. Add a `profile_id` column to the output so the frontend can map back unambiguously.
- Existing match logic (`aa.user_id = uid OR aa.profile_id = pid`) already covers pre-create assignments.

## Frontend (`src/pages/AdminDashboard.tsx`)

1. **`loadChatters`**
   - Drop `.or("pre_create.is.null,pre_create.eq.false")` and `.not("user_id","is",null)`.
   - Also select `id` from `profiles` (always need it now).
   - Fetch all open `account_assignments` once (`account_id, user_id, profile_id` where `end_date IS NULL`) to resolve accounts for pre-create rows.
   - `assigned_accounts` resolution:
     - real users: `accounts.assigned_to === user_id` (unchanged), plus any account whose open assignment matches `user_id`.
     - pre-create: accounts whose open assignment has `profile_id === profile.id`.

2. **`ChatterProfile` type / row key**
   - Add `id: string` (profile id) and `pre_create?: boolean`.
   - Use `user_id ?? profile.id` as the React `key` and as the row identifier in `expandedChatter`, `checkedChatters`, etc. Stored once as a derived `rowKey` per chatter so existing maps keep working.

3. **Real-stats fetch**
   - Split visible chatters into `userIds` and `profileIds`, call the RPC once with both arrays, then key the resulting map by `rowKey`.
   - `ChatterStatsCard` continues to read from this map via the `stats` prop.

4. **Pre-create row UX**
   - Add a small "Pre-Create" badge next to the name.
   - Disable push button, hide the "active today" pulse, treat PWA/push tri-state filters as "not installed" / "no push" (consistent with reality).
   - Login stats / `loginStats[user_id]` lookups guarded by `if (user_id)`.

5. **Filters/sorts**
   - `top_*`, `open_2d` sorts already key off `chatterRealStats[user_id]`; switch to `rowKey` so pre-create rows participate.
   - `no_telegram` works as-is.

No visual redesign — same list, same expansion, just one extra badge and a couple of disabled controls for pre-create rows.

## Edge cases

- Pre-create profile with zero assignments → still listed, all stats 0, no badge highlight.
- Pre-create profile that gets claimed mid-session → next `loadChatters` shows it as a normal row (the trigger already deletes the pre-create row).
- Duplicate `telegram_id` between a real user and a pre-create row should not happen (claim trigger merges them), but the `rowKey` would still keep them distinct in the list if it ever did.
