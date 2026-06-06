## Ping Button next to Email/Password in Setup Account Row

### Where
`src/pages/AdminDashboard.tsx` — inside the expanded account row in the Setup tab, right of the email + password copy buttons (lines ~7559-7590).

### State
Add a per-account state map: `Record<string, "idle" | "loading" | "ok" | "fail">`. State persists indefinitely (no auto-reset). Clicking the button again re-runs the check from whatever state it is in.

### UI
- Add a single **Ping** button to the right of the password field, same row as email/password copy buttons.
- States:
  - **Idle** (`ok` / `fail` / `idle`): neutral outline, icon = `Activity` (or `Wifi` if unavailable, fallback `Target`/`Zap`)
  - **Loading**: spinner (`Loader2 animate-spin`), disabled
  - **OK** (`ok`): green background (`bg-emerald-500/20 border-emerald-500/40 text-emerald-400`), check icon (`CheckCircle2`)
  - **Fail** (`fail`): red background (`bg-destructive/20 border-destructive/40 text-destructive`), X icon (`XCircle`)
- On fail, also `toast.error(data.reason || "Endpoint not live")`.
- On network/throw: `toast.error(err.message || "Failed to ping")`, state = `fail`.

### Request
```ts
POST https://api.shexadmin.ngrok.pro/checkliveness
headers: {
  "Content-Type": "application/json",
  "x-api-key": "|info@sharify.de+revenue+profaimusa@gmail.com|",
}
body: {
  id: acc.id,
  platform: acc.platform,
  email: acc.account_email,
  password: acc.account_password,
}
```

### Response handling
```ts
interface PingResult {
  success: boolean;
  id: string;
  live: boolean;
  reason?: string;
}
```
- `result.success && result.live` → state `ok`
- Otherwise → state `fail`, toast reason

### No changes needed
- No DB schema changes.
- No new components/files.
- Reuses existing toast and copy patterns.

### Note on CORS
Same preflight issue as the other media endpoints. Server-side CORS config is still required for the browser request to succeed. No client workaround.