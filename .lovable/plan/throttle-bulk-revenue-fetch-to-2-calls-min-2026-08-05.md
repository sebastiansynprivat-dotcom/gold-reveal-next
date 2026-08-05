# Throttle bulk revenue fetch to 2 calls/min

## Goal
The group-wide "fetch all" revenue run currently fires one edge-function call immediately after the previous one finishes. Rapid calls trip platform rate limits and burn the backend IP. Cap it to 2 calls per minute and notify the admin when the whole run is done.

## Changes

### 1. Rate limiting (ModelGroupsPanel, `fetchAllInGroup`)
- Enforce a minimum 30s gap between consecutive `fetch-model-revenue` invocations: track the start time of each call and wait `30s - elapsed` before starting the next one (no wait after the last model).
- First call still starts instantly, so a group of N models takes roughly `(N-1) * 30s`.
- Sequential loop stays as-is (no parallelism).

### 2. Progress + cancel
- Extend the button's progress state with a countdown/ETA label: `3/12 · nächster in 22s` and total remaining time estimate.
- Add a "Abbrechen" option while a run is active (abort flag checked before each call and during each wait), so a long queue isn't locked in.
- Keep the existing auto-retry for `RATE_LIMITED` models, and space those retries the same 30s apart instead of firing them all at once.

### 3. Completion notification
- Keep the current summary toasts (success / partial errors / rate-limited).
- Additionally fire a browser notification when the run finishes, since long runs mean the tab is likely in the background: if `Notification.permission === "granted"`, show "Umsatz-Fetch abgeschlossen — X/Y ok" via the existing service worker registration; fall back silently to the toast only when permission is missing.
- Play the existing sound-effect hook cue (same one used for other admin completions) so it is noticeable when returning to the tab.

## Notes
- Single-model manual fetch and the retry button keep their current immediate behaviour; only the bulk loop is throttled.
- Per-month "extra billing" fetches in the model dashboard are single-shot user actions and stay unchanged.
- No backend or database changes.
