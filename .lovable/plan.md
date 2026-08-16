# View chatter dashboard read-only

## It already exists (partly)

Admins can already open a chatter's dashboard exactly as that chatter sees it: in the Admin Dashboard, expand a chatter row and click "Als Chatter ansehen". That opens `/admin/chatter/<id>/view` in a new tab, mints a real session for that chatter, and renders their dashboard with their own permissions — so what you see is truly their view.

What's missing is the safety part: right now that session is fully functional, so a stray click could change the chatter's data (submit a request, tick a task, save a profile field).

## What to add: a read-only guard

1. **Read-only mode flag** set while the impersonated view is active.
2. **Block all writes at the network layer**: while the flag is on, intercept requests going to the backend and let only reads (GET) through. Any write (insert/update/delete, edge-function POSTs) is cancelled and a toast appears: "Nur-Lese-Modus – Änderungen sind deaktiviert." This catches every write path automatically, including ones added later, instead of relying on disabling individual buttons.
3. **Visual clarity**: the existing gold admin banner gets a "Nur ansehen" badge so it's obvious no changes are possible.
4. **Optional escape hatch**: a small "Bearbeiten erlauben" toggle in the banner, off by default, in case you deliberately want to fix something on the chatter's behalf.

Everything else stays as is: the banner's "Zurück zum Admin" still restores your admin session.

## Technical notes

- New module (e.g. `src/lib/readOnlyMode.ts`) holding a module-level flag plus a `window.fetch` wrapper installed once. Requests whose URL contains the Supabase REST/functions/rpc endpoints and whose method is not GET/HEAD/OPTIONS get rejected with a friendly toast; auth/token endpoints stay allowed so session refresh keeps working.
- `src/pages/AdminChatterView.tsx` enables the flag right after `setSession` succeeds and disables it on unmount / when restoring the admin session, and renders the badge + optional toggle in its sticky header.
- No database or RLS changes; the guard is client-side only (it prevents accidents, it is not a security boundary — the chatter session itself keeps its normal rights).
