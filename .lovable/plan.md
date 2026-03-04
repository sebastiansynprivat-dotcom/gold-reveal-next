

## Plan: Login-Tracking mit Aktivitätsanzeige

### Was wird gebaut
1. **Neue DB-Tabelle `login_events`** — speichert jeden Login mit Timestamp und User-ID
2. **Login-Event aufzeichnen** — im `useAuth` Hook wird bei jedem erfolgreichen Login (`SIGNED_IN` Event) ein Eintrag in `login_events` geschrieben
3. **Grüner Punkt neben dem Tagesziel** — kleine grüne Pulsanzeige, die signalisiert "User war heute aktiv"
4. **Klick-Popover mit Statistiken** — zeigt Login-Anzahl für Heute, diese Woche, diesen Monat (echte Daten aus der DB)

### Technische Details

**Migration:**
```sql
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
-- User sieht eigene Logins
CREATE POLICY "Users can view own logins" ON public.login_events FOR SELECT USING (auth.uid() = user_id);
-- User kann eigene Logins einfügen
CREATE POLICY "Users can insert own logins" ON public.login_events FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admin sieht alle
CREATE POLICY "Admin full access" ON public.login_events FOR ALL USING (is_admin()) WITH CHECK (is_admin());
```

**Login-Event erfassen** (`useAuth.tsx`):
- Im `onAuthStateChange` Listener: Wenn `event === 'SIGNED_IN'`, sofort ein `INSERT` in `login_events` mit der `user_id` machen.

**UI-Änderung** (`DailyGoal.tsx`):
- Grüner pulsierender Punkt (absolut positioniert, oben rechts an der Tagesziel-Card)
- Beim Klick öffnet sich ein Popover mit:
  - **Heute**: Anzahl Logins heute
  - **Diese Woche**: Logins in den letzten 7 Tagen
  - **Dieser Monat**: Logins im aktuellen Monat
- Daten werden per `supabase.from('login_events').select(...)` mit Datumsfiltern geladen

### Dateien
- **Neue Migration**: `login_events` Tabelle + RLS
- **`src/hooks/useAuth.tsx`**: Login-Event bei SIGNED_IN schreiben
- **`src/components/DailyGoal.tsx`**: Grüner Punkt + Popover mit Statistiken

