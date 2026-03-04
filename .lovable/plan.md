

## Plan: Website-Besuche tracken (statt nur Logins)

### Problem
Aktuell wird nur das `SIGNED_IN`-Event getrackt — das feuert nur beim echten Login (Passwort eingeben). Wenn jemand die Seite einfach öffnet und bereits eingeloggt ist, wird nichts gezählt. Du willst aber wissen, **wie oft jemand die Website besucht hat**.

### Lösung
Zusätzlich zum Login-Event auch **jeden Seitenbesuch** tracken, wenn der User bereits eine aktive Session hat.

### Technische Umsetzung

**`src/hooks/useAuth.tsx`** anpassen:
- Bei `getSession()` (wird bei jedem Seitenaufruf aufgerufen): Wenn eine aktive Session existiert, ebenfalls einen Eintrag in `login_events` schreiben.
- Deduplizierung: Nur 1x pro Session-Load einfügen (via Flag/Ref), damit kein doppelter Eintrag entsteht (da `onAuthStateChange` und `getSession` beide feuern können).

**Popover-Label im Admin anpassen** (`src/pages/AdminDashboard.tsx`):
- "Login-Aktivität" → "Website-Besuche" umbenennen, da es jetzt tatsächlich Besuche zählt.

### Dateien
- **`src/hooks/useAuth.tsx`**: Visit-Event bei jedem Seitenaufruf mit aktiver Session schreiben (mit useRef-Guard gegen Doppeleinträge)
- **`src/pages/AdminDashboard.tsx`**: Label von "Login-Aktivität" auf "Website-Besuche" ändern

