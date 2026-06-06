## Wire up the three media endpoints in AdminDashboard

Replace blank URL constants in `src/pages/AdminDashboard.tsx` (~lines 951‑953) and adjust the three handlers.

### Shared
All three requests send:
```ts
headers: {
  "Content-Type": "application/json",
  "x-api-key": "|info@sharify.de+revenue+profaimusa@gmail.com|",
}
```

### URLs
```ts
const MEDIA_STATS_URL = "https://api.shexadmin.ngrok.pro/postingData";
const MEDIA_RESET_URL = "https://api.shexadmin.ngrok.pro/resetpostingmedia";
const MEDIA_SET_URL   = "https://api.shexadmin.ngrok.pro/setmedia";
```

### 1. `fetchMediaStats` → POST `/postingData`
- Body: `{ id, platform }`
- Response: map `done → posted`; also read `active`, `failed`, `remaining`.

### 2. `resetMedia` → POST `/resetpostingmedia`
- Body: `{ id, platform, email: acc.account_email, password: acc.account_password }`
- Response: `{ success, ...stats }` (handle both root and nested via `data.stats ?? data`); same `done → posted` mapping.

### 3. `setAccountMedia` → POST `/setmedia`
- Body: `{ id, platform, email, password, type: "main" }` (hardcoded per your answer)
- Response: `{ success, id, media }`
- On success, direct supabase update: `supabase.from("accounts").update({ media: data.media }).eq("id", acc.id)`, then patch local `accounts` state so the row reflects immediately.

### Notes
- `accounts.media` already exists — no migration needed.
- No UI changes; existing buttons just start working.
- Stats auto-fetch stays silent on error; explicit actions keep toasts.
