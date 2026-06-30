## Goal
Add client-side pagination to three heavy admin lists. No backend / data-loading changes — pagination is purely a slice of the already-filtered arrays plus Prev/Next controls.

## Page sizes
- Setup list (Admin Dashboard → Setup tab): **50 / page**
- Model dashboard list (`ModelDashboardTab`): **50 / page**
- Chatter list (`ChatterDashboardTab`): **10 / page**

## Changes

### 1. `src/pages/AdminDashboard.tsx` — Setup list
- Add `const [setupPage, setSetupPage] = useState(1)` and `const SETUP_PAGE_SIZE = 50`.
- Where `filteredSetupAccounts` is computed (~line 7904), derive:
  - `totalPages = Math.max(1, Math.ceil(filteredSetupAccounts.length / 50))`
  - `pagedAccounts = filteredSetupAccounts.slice((setupPage-1)*50, setupPage*50)`
- Render `.map` over `pagedAccounts` instead of `filteredSetupAccounts` (line 7959).
- Reset `setupPage` to 1 whenever the existing setup filters/search change (single `useEffect` watching those state deps).
- When the `setup-attention-focus` listener expands a target row, also jump to the page that contains it (compute index in filtered list → page).
- Append a Prev/Next bar below the list: "Seite X / Y", « Zurück / Weiter », disabled at bounds. Hidden when only 1 page.

### 2. `src/components/ModelDashboardTab.tsx` — Model list
- Add `const [modelPage, setModelPage] = useState(1)`; `PAGE_SIZE = 50`.
- After `filteredModels` memo (line 1105), compute `pagedModels` slice + `totalPages`.
- Replace the existing `filteredModels.map(...)` render with `pagedModels.map(...)`.
- `useEffect(() => setModelPage(1), [searchQuery, agencyFilter, steckbriefFilter, showDuplicatesOnly, sortMode])`.
- Prev/Next footer identical pattern.

### 3. `src/components/ChatterDashboardTab.tsx` — Chatter list
- Add `chatterPage` state, `PAGE_SIZE = 10`.
- Slice `filteredChatters` for the render at line 479; keep the count badge (line 575) showing the full filtered total.
- Reset page on filter/search change.
- Prev/Next footer.

## Shared pagination footer
Inline tiny component in each file (no new file) so we avoid touching shared UI:

```tsx
<div className="flex items-center justify-between mt-3 text-xs">
  <span className="text-muted-foreground">Seite {page} / {totalPages}</span>
  <div className="flex gap-1">
    <Button size="sm" variant="outline" disabled={page<=1} onClick={() => setPage(p=>p-1)}>Zurück</Button>
    <Button size="sm" variant="outline" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Weiter</Button>
  </div>
</div>
```

## Safety / non-regression
- Filtering, sorting, search, autosave, approval workflow, setup-attention navigation, realtime updates all operate on the full filtered arrays — only the final `.map` uses the paged slice.
- No DB, edge function, RLS, or API change.
- Reset-to-page-1 effects prevent landing on an empty page after filter change.
- Expanded rows / open dialogs remain controlled by their own ids; switching pages just unmounts off-screen rows (same behavior as scroll virtualization would have).