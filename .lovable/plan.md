## Goal
After assigning an account to a chatter, update the affected row in-place instead of reloading the whole "Alle Chatter" + accounts lists (which causes a visible flash/scroll reset and slowdown).

## Changes

### 1. `src/components/admin/AssignAccountToChatterButton.tsx`
- Change the `onAssigned` prop signature from `() => void` to `(chatterId: string) => void`.
- Pass the assigned chatter's `user_id` when calling `onAssigned(selected.user_id)`.

### 2. `src/pages/AdminDashboard.tsx` (line 9504)
Replace the `onAssigned` handler with an optimistic in-place update — no `loadAccounts()` / `loadChatters()` calls:

```ts
onAssigned={(chatterId) => {
  const nowIso = new Date().toISOString();
  // patch the single account row
  setAccounts((prev) =>
    prev.map((a) =>
      a.id === acc.id ? { ...a, assigned_to: chatterId, assigned_at: nowIso } : a,
    ),
  );
  // patch the chatter's assigned_accounts so the row reflects the new account immediately
  setChatters((prev) =>
    prev.map((c) =>
      c.user_id === chatterId
        ? { ...c, assigned_accounts: [...(c.assigned_accounts || []), { ...acc, assigned_to: chatterId, assigned_at: nowIso }] }
        : c,
    ),
  );
}}
```

This keeps the Alle Chatter list mounted (no spinner / `setLoading(true)` from `loadChatters`), preserves scroll position, and the assigned row updates silently.

## Out of scope
- No backend/RLS changes.
- No changes to other call sites of `loadAccounts` / `loadChatters`.
- No styling changes.