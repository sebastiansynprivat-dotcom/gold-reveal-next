# Follow-up Management für Custom Anfragen

## Ziel
Admins sollen offene Anfragen zuverlässig nachhaken können — mit klarem Filter, abhakbarer Historie, Wiedervorlage-Schleife und "In Arbeit"-Status, der ebenfalls überwacht wird.

## Was gebaut wird

### 1. Neue Tabelle für Follow-up-Historie
`public.model_request_followups`:
- `id`, `request_id` (FK → model_requests, ON DELETE CASCADE)
- `admin_id` (uuid, wer's abgehakt hat)
- `sent_at` (timestamptz default now())
- `note` (text, optional — z.B. "1. Follow-up per WhatsApp")

RLS: nur `is_admin()` liest/schreibt. GRANTs für authenticated + service_role.

### 2. Follow-up-Regel (rein clientseitig berechnet, keine DB-Jobs nötig)
Eine Anfrage taucht im Follow-up-Filter auf, wenn:
- Status ∈ {`accepted`, `in_progress`, `waiting_feedback`} (also weitergeleitet aber nicht `pending` / `archived` / `rejected`)
- UND `lastActivity` liegt ≥ 2 Tage zurück, wobei
  - `lastActivity = max(created_at, forwarded_to_model_at, letztes model_request_messages.created_at, letztes model_request_followups.sent_at, Status-Wechsel-Zeitpunkt)`
- Nach jedem Follow-up-Haken erscheint sie also frühestens 2 Tage später wieder → automatische Schleife.
- Für "In Arbeit" gilt dieselbe 2-Tage-Regel — auch dieser Status generiert weiter Vorschläge, solange nichts passiert.

Vorschlagstext auf der Karte: "3. Follow-up fällig — seit 4 Tagen keine Reaktion".

### 3. UI-Erweiterungen im Admin-Dashboard, Tab "Anfragen"
- Neue Filter-Pille **"Follow-up fällig"** neben "Offen / In Arbeit / …" mit Count-Badge (orange/gold, pulsierend wenn >0).
- Auf jeder Karte (im Filter oder global) neue Sektion **"Follow-ups"** mit:
  - kompakter Historie ("1. Follow-up am 09.07. um 14:32 · Sebastian")
  - Button **"Follow-up verschickt"** → legt Zeile in `model_request_followups` an, entfernt Karte für 2 Tage aus dem Follow-up-Filter.
  - Optionales Notiz-Feld im Bestätigungs-Popover.
- Neuer Status-Umschalter **"In Arbeit"** in derselben Karten-Action-Bar (falls noch nicht als schneller Button vorhanden; sonst nur sicherstellen dass der bestehende Wechsel `last_activity` triggert, was er über den Status-Change-Zeitstempel automatisch tut).
- **"Erledigt"**-Button setzt weiterhin auf `archived` → verschwindet dauerhaft aus Follow-up-Filter.

### 4. Klein-Fixes
- `modelRequests` beim Laden zusätzlich Follow-ups joinen (`model_request_followups(sent_at, admin_id, note)` als eingebettete Liste) und in Realtime-Subscription auf die neue Tabelle lauschen.
- Filter-Zähler oben zeigt jetzt 7 Karten (bestehende 6 + "Follow-up").

## Technische Details

**Migration** (schema): Tabelle + Index `(request_id, sent_at desc)` + RLS + GRANTs.

**Datenlade-Änderung** (`AdminDashboard.tsx`, `loadRequests` ~L2935): Select um
`model_request_followups(id,sent_at,admin_id,note), model_request_messages(created_at)` erweitern, danach pro Request `lastActivityAt` + `followupCount` ableiten.

**Helper**: `needsFollowUp(req, thresholdDays=2)` und `followupCount(req)` als reine Funktionen.

**Kein Cron / Edge Function nötig** — alles liest live aus der DB.

## Nicht enthalten
- Automatische Pushes / Reminders an Admins (kann später oben drauf).
- Änderungen an der Chatter- oder Model-Sicht der Anfragen.

Soll ich so umsetzen?
