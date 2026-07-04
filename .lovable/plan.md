## Plan: Add "Copy ID" Button in Admin Model Dashboard Tab

### Where
- **File:** `src/components/ModelDashboardTab.tsx`
- **Location:** In the model detail header (lines ~2246–2271), directly beneath the username line.

### Current UI
```
[Avatar]  Model Name                              [Buttons]
          @username · 3 Plattform-Accounts
```

### Target UI
```
[Avatar]  Model Name                              [Buttons]
          @username · 3 Plattform-Accounts
          [Copy icon] Copy ID
```

### Implementation
1. In the model header block (inside the `flex-1 min-w-0` column), add a new row directly below the `<p>` that shows `@username · X Plattform-Accounts`.
2. Add a small button or clickable text element with a `Copy` icon and the label **"ID kopieren"** / **"Copy ID"**.
3. On click: `navigator.clipboard.writeText(selectedModel.id)`.
4. Provide 1.5s feedback (swap icon to `Check`, or use `sonner` toast).
5. Keep styling minimal — `text-xs text-muted-foreground` with hover state, so it doesn't compete with primary actions.

### No backend changes required.
This is a purely presentational frontend change using the already-available `selectedModel.id`.