## Goal
Make each row in the Setup Attention popup clickable. Clicking jumps to the matching account in the Setup list, opens (expands) it, and visually highlights it.

## Changes

### 1. `src/components/admin/SetupAttentionAlert.tsx`
- Make each row a `<button>`-like clickable element (cursor-pointer, hover state). Keep the green check toggle as a nested button with `stopPropagation` so toggling resolved status doesn't trigger navigation.
- On row click:
  - Close the dialog.
  - Dispatch `window.dispatchEvent(new CustomEvent("setup-attention-focus", { detail: { accountId, type } }))`.

### 2. `src/pages/AdminDashboard.tsx`
- Add a `useEffect` (top-level in the dashboard component) that listens for `setup-attention-focus`:
  1. `setActiveTab("setup")` (or whatever value the Setup tab uses — confirm from line 4091 area).
  2. Reset filters that could hide the row: `setSetupStatusFilter("alle")`, `setSetupPlatform("all")`, `setSetupSearch("")`.
  3. `setExpandedBot(accountId)` to auto-open the row.
  4. After a short timeout (so the tab/list renders), find the row element via `document.getElementById(\`setup-row-${accountId}\`)`, `scrollIntoView({ behavior: "smooth", block: "center" })`, and apply a temporary gold ring highlight class (~2s) using the existing `sectionHighlight` helper if compatible, else a local class toggle.
- Add `id={\`setup-row-${acc.id}\`}` to the row wrapper at line 7966 (the outer `<div key={acc.id}>`).

### 3. No DB / edge function changes
Pure UI wiring. `setup_attention` schema and refresh logic stay untouched.

## Acceptance
- Clicking any row in the ATTENTION popup closes it, switches to the Setup tab, scrolls the matching account into view, expands it, and briefly highlights it.
- Clicking the green ✓ still toggles resolved without navigating.
- If the account is filtered out, filters are reset so it appears.
