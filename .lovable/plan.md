

## Chatter-Übersicht Tab

### Ziel
Den "Platzhalter"-Tab in "Chatter-Übersicht" umbenennen und eine Funktion bauen, die automatisch trackt, wann ein Chatter einem Account zugewiesen und wann er wieder entzogen wurde – inklusive Model-E-Mail.

### Datenbank

**Neue Tabelle: `account_assignments`**
- `id` (uuid, PK)
- `account_id` (uuid, FK → accounts.id)
- `user_id` (uuid, Chatter)
- `assigned_at` (timestamptz, NOT NULL)
- `unassigned_at` (timestamptz, NULL = noch aktiv)
- `created_at` (timestamptz, default now())

RLS: Admins haben vollen Zugriff (`is_admin()`).

**Automatische Erfassung via Trigger:**
Ein PostgreSQL-Trigger auf `accounts` bei UPDATE von `assigned_to`:
1. Wenn `OLD.assigned_to IS NOT NULL` und sich ändert → alten Eintrag schließen (`unassigned_at = now()`)
2. Wenn `NEW.assigned_to IS NOT NULL` → neuen Eintrag anlegen

So wird jede Zuweisung/Entziehung automatisch protokolliert, ohne Frontend-Code ändern zu müssen.

### Frontend (AdminDashboard.tsx)

1. Tab umbenennen: `"placeholder"` → `"chatter_overview"`, Label: `"Chatter-Übersicht"`, Icon: `Users`
2. Tab-Inhalt:
   - Daten aus `account_assignments` laden, gejoined mit `accounts` (für `account_email`) und `profiles` (für Chatter-Name)
   - Gruppierte Darstellung pro Account (Model-E-Mail als Header)
   - Jeder Eintrag zeigt: Chatter-Name, Zugewiesen am, Entzogen am (oder "Aktiv"-Badge), Dauer
   - Sortierung: aktive Zuweisungen oben, dann nach Datum absteigend

### Technische Details

- Der Trigger ersetzt manuelle Logging-Aufrufe – alle bestehenden Zuweisungs-/Entziehungs-Logiken (Reassign, Freigabe, Account-Löschung) werden automatisch erfasst
- Migration: 1 SQL-Migration für Tabelle + Trigger + RLS
- Keine Edge Functions nötig

