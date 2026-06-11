## Goal

Add a new toggle card in the admin dashboard top stats row that shows how many chatters are **assigned** vs **unassigned** (including pre-create profiles). It should behave exactly like the existing `DualCard` filters (Mit/Ohne Telegram, Push aktiv/inaktiv, etc.)

## What to build

### Frontend changes (`src/pages/AdminDashboard.tsx`)

1. **New filter state**
   - `const [filterAssigned, setFilterAssigned] = useState<boolean | null>(null);`

2. **Computed counts (inside the stats IIFE)**
   - `assignedYes` = chatters with `assigned_accounts?.length > 0`
   - `assignedNo` = chatters with `!assigned_accounts || assigned_accounts.length === 0`

3. **New `DualCard` instance**
   - `labelA="Zugewiesen"`, `labelB="Unzugewiesen"`
   - `filterState={filterAssigned}`
   - Toggle logic identical to existing cards

4. **Apply filter to chatter list**
   - After the existing `filterPwa` block, add:
   ```ts
   if (filterAssigned === true) {
     result = result.filter((c) => (c.assigned_accounts?.length ?? 0) > 0);
   } else if (filterAssigned === false) {
     result = result.filter((c) => !c.assigned_accounts || c.assigned_accounts.length === 0);
   }
   ```

5. **Grid column adjustment**
   - Change `grid-cols-5` to `grid-cols-6` at the `lg` breakpoint so the new card fits.
   - Verify `sm` breakpoint (`grid-cols-3`) still works with 6 cards (it will wrap to 2 rows, same as current 5-card layout).

### Why this works for pre-create

`assigned_accounts` is already enriched from both `accounts.assigned_to` (real users) and open `account_assignments.profile_id` (pre-create). The count and filter naturally include pre-create chatters because they appear in the `chatters` array with their `assigned_accounts` populated from `account_assignments`.

---

## Technical notes

- No database changes required.
- No new edge functions.
- Purely additive UI; does not change existing card behavior.
