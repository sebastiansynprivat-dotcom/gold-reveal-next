## Ziel

Du willst das neue Commitment-Ritual live testen, ohne dass alle Chatter es sofort sehen. Lösung: **Feature-Flag mit Allowlist** — nur freigeschaltete User-IDs (du + optional Test-Chatter) sehen den Prompt und bekommen die Pushes. Alle anderen sehen/bekommen nichts, bis wir den Flag global aktivieren.

## Umsetzung

### 1. Allowlist im Code (schnell, kein DB-Aufwand)
- Neue Datei `src/lib/commitmentFlag.ts` mit hartkodierter Liste von `user_id`s, die Zugriff haben. Export `isCommitmentTester(userId)`.
- In `CommitmentPrompt.tsx`: früh im Render abbrechen, wenn `!isCommitmentTester(user.id)`.
- In `chatter-pulse-pushes/index.ts`: in den vier neuen Blöcken (`commitment_morning`, `commitment_evening_recap`, honesty sweep) skip, wenn `uid` nicht in der Allowlist.
- Gleiche Allowlist als Konstante in einer geteilten Edge-Datei (`supabase/functions/_shared/commitmentFlag.ts`) — muss dupliziert werden, weil Edge Functions nicht aus `src/` importieren.

### 2. Test-Trigger für dich
- URL-Parameter existieren bereits (`?commit=1` / `?checkin=1`) — damit kannst du beide Popups jederzeit manuell öffnen, ohne auf 08:30 / 21:00 warten zu müssen.
- Cron kann mit `?force=1` gegen die Edge-Function gecurlt werden, um den 23:00-Sweep sofort zu triggern (nur für Allowlist-User).

### 3. Admin-View (kurz gehalten)
- Kleiner Read-only-Block in einem bestehenden Admin-Tab (z. B. `ChatterPushEngineTab`): letzte 20 Zeilen aus `chatter_daily_commitment` mit User-Name, Datum, `confirmed_by_user`, `honesty_verdict`, `signal_snapshot`. So siehst du beim Testen sofort, was das System registriert hat.

### 4. Roll-out später
- Wenn du zufrieden bist: Allowlist leeren bzw. Flag auf `true` für alle setzen — eine Zeile Änderung, keine weiteren Migrations nötig.

## Was du zum Testen brauchst

- Deine `auth.uid()` (User-ID) — ich trage sie in die Allowlist ein. Optional 1–2 Test-Chatter dazu.
- Nach dem Rollout dieser Änderung: Dashboard aufrufen mit `?commit=1` → Morning-Dialog. Mit `?checkin=1` → Evening-Prompt inkl. Honesty-Framing. Antwort abgeben, dann in Admin-Log oder Supabase direkt die Zeile in `chatter_daily_commitment` prüfen.

## Offene Frage

Sag mir deine User-ID (oder Email, dann hole ich sie), und ob noch weitere Test-Chatter Zugriff bekommen sollen.
