# "Umsatz heute" falsch bei Philip S — Ursache und Fix

## Was tatsächlich los ist (geprüft in der Datenbank)

Philip S (Profil `Philip_S`, Telegram 7260908130) hat heute (20.08.) diese Zahlen in `accounts_data`:

| Account | Plattform | Umsatz heute | zuletzt aktualisiert |
|---|---|---|---|
| alinaangel | Maloum | 76,20 € | 20.08. 22:32 |
| deborahssecret | Maloum | 95,20 € | 20.08. **12:13** |
| mandyrosee | Maloum | 18,00 € | 20.08. **12:13** |
| deborahssecret | Brezzels | 0,00 € | 20.08. 23:02 |

Die App rechnet korrekt — die Daten sind veraltet. Für Maloum lief der Ingest zuletzt um 23:21, aber **28 Maloum-Accounts wurden seit 12:13 in keinem Batch mehr mitgeliefert**, darunter genau `mandyrosee` und `deborahssecret` (Mandy ist das Model, um das es im Chat geht). Es gibt dazu keine Fehlermeldung in `bot_notifications` — die Accounts fehlen einfach stillschweigend in den Payloads. Die Ursache liegt also beim externen Ingest-Bot (Maloum-Session/Auswahlliste), nicht im Dashboard-Code.

Folge: Der Chatter sieht ~189 € statt des echten Tagesumsatzes und hat keine Möglichkeit zu erkennen, dass die Zahl alt ist.

## Was ich im Dashboard baue

1. **Frischeanzeige an „Umsatz heute“**: kleiner Zeitstempel „Stand HH:MM“ (jüngstes `updated_at` der zugewiesenen Accounts des Tages). Wenn älter als 3 Stunden: dezenter goldener Warnhinweis „Daten werden aktualisiert – Stand HH:MM“ (DE/EN), damit niemand mehr eine veraltete Zahl für falsch hält.
2. **Admin-Sichtbarkeit für hängende Accounts**: im Admin-Dashboard eine Warnkarte „Ingest hängt“, die alle aktiven Accounts listet, deren heutige Zeile seit mehr als 3 Stunden nicht aktualisiert wurde — gruppiert nach Plattform, mit Uhrzeit des letzten Updates. Damit fällt so ein Ausfall künftig sofort auf, statt über einen Chatter-Report.
3. Keine Änderung an der Umsatz-Berechnung selbst (die ist korrekt) und keine Fake-Werte.

## Was ich nicht in der App lösen kann

Das Nachliefern der fehlenden Maloum-Daten von 12:13 bis jetzt muss der Ingest-Bot machen (erneuter Lauf für die 28 Accounts). Sobald er die Rows schickt, korrigiert sich Philips Kachel automatisch. Wenn du willst, liste ich dir die 28 betroffenen Account-E-Mails aus, damit der Bot gezielt nachgezogen werden kann.

## Technische Details

- Betroffene Tabelle: `accounts_data` (`date`, `total`, `updated_at`), gelesen über `get_chatter_revenue_series`.
- Chatter-Kachel: `src/pages/Dashboard.tsx` (`setUmsatz` aus dem heutigen Serien-Eintrag) — dort zusätzlich ein leichter Query auf `max(updated_at)` der zugewiesenen Accounts für heute.
- Admin-Karte: neue Komponente unter `src/components/admin/`, eingebunden im Setup-/Übersichtsbereich von `src/pages/AdminDashboard.tsx`, Daten per RPC (Security Definer) über `accounts_data` + aktive `accounts`.
- Texte in `src/i18n/translations.ts` (DE/EN).
