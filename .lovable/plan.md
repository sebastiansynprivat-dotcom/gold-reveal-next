## Änderungen

**1. Fanvue-Eintrag in Navigation verschieben**
- In `AdminDashboard.tsx` den separaten "Fanvue"-Button aus dem Header entfernen.
- Stattdessen einen neuen Menüpunkt **"Fanvue Dashboard"** (Stern- oder Sparkles-Icon) im Seitenmenü direkt unter "Admin-Verwaltung" einfügen — nur sichtbar für Super-Admins.

**2. Admin-Layout beim Aufruf von /fanvue beibehalten**
- Aktuell ist `/fanvue` eine eigenständige Seite ohne Admin-Navigation.
- Lösung: Wenn ein eingeloggter Admin `/fanvue` öffnet, soll die bekannte Admin-Sidebar (das Premium-Navigationsmenü aus dem Screenshot) sichtbar bleiben, damit er per Klick zurück zu Einnahmen, Chatter, etc. springen kann.
- Umsetzung: In `FanvueDashboard.tsx` prüfen, ob der User die Rolle `super_admin`/`admin` hat. Falls ja → das vorhandene Admin-Sidebar-Component (gleiches wie in `AdminDashboard`) mitrendern und den Fanvue-Content im Hauptbereich daneben platzieren.
- Für reine `fanvue_partner`-User bleibt die Ansicht wie bisher (ohne Admin-Sidebar, nur Fanvue-Content + Logout).

**3. Keine Logik-Änderungen**
- RLS, Datenbank, Partner-Login, CRUD an Models bleiben unverändert.
- Nur UI/Navigation wird angepasst.

## Offene Frage
Soll der Menüpunkt "Fanvue Dashboard" heißen, oder lieber kürzer "Fanvue"?
