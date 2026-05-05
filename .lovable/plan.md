# Neue Plattformen: Admireme, VisitX & Slushy

Fokus auf das Wesentliche zuerst: Du kannst im Admin neue **Accounts** für diese 3 Plattformen anlegen, und sie tauchen überall dort auf, wo Plattformen heute schon angezeigt werden (Account-Pool, Zuweisungen, Dashboards, Filter). Revenue-Tracking, Onboarding-Routes, Bots etc. machen wir bewusst **nicht** in diesem Schritt — erst wenn die Basis steht.

## Was sich ändert

### 1. Zentrale Plattform-Liste (Frontend)
Heute sind die Plattformen an vielen Stellen hartkodiert (`onlyfans`, `fansly`, `maloum`, `4based`, `brezzels`, `fansyme`, …). Wir legen eine zentrale Konstante an:

```
src/lib/platforms.ts
  → PLATFORMS = [{ id, label, color, icon }]
```

Alle Komponenten ziehen ihre Liste von dort:
- `AdminDashboard` (Account-Pool gruppiert nach Plattform, Badges, Filter)
- `SubAdminManager` / Account-Anlegen-Dialog (Plattform-Dropdown)
- `ChatterDashboardTab` & `ModelDashboardTab` (Plattform-Auswahl)
- Auto-Assign-UI / Filter (`Admin Chatter Filters`)
- `CreditNoteForm` (Plattform-Label im PDF)

So ist die nächste Plattform danach ein 1-Zeilen-Change.

### 2. Plattform-Werte in der DB
Die `accounts.platform` Spalte ist heute schon ein `text` (kein Enum) — daher reicht es, die neuen Werte `admireme`, `visitx`, `slushy` in der zentralen Liste zu ergänzen. **Keine Migration nötig** für die reine Account-Anlage.

`revenue_report.platform` ist ein USER-DEFINED Enum — das fassen wir erst an, wenn wir Revenue-Tracking für die neuen Plattformen wirklich aktivieren (Schritt 2, separat).

### 3. UI-Anpassungen
- **Account-Pool (Admin)**: Drei neue Plattform-Sektionen mit Badges/Farben (Admireme = pink, VisitX = blau, Slushy = lila — anpassbar).
- **Account anlegen / bearbeiten**: Neue Plattformen im Dropdown verfügbar.
- **Auto-Assign-Flow**: Neue Plattformen als Auswahl.
- **Chatter-/Model-Dashboard**: Plattform-Anzeige & -Auswahl kennt die neuen Werte (Anzeige als Badge, kein neues Revenue-Feld in dieser Phase).

## Was bewusst NICHT enthalten ist (für später)
- Revenue-Spalten (`admireme_revenue`, …) in `chatters` / `model_dashboard`
- Onboarding-Status-Flags (submitted / botdm / massdm)
- Eigene Offer-Pages, Telegram-Bots, `quiz_routes`
- `revenue_report` Enum-Erweiterung & `ingest-revenue` Edge-Function
- Charts/Aggregationen im Admin-Dashboard

Wenn die Basis läuft, ergänzen wir diese Bereiche gezielt nach Bedarf.

## Ergebnis
Du kannst sofort Accounts für Admireme, VisitX und Slushy anlegen, im Pool sehen, zuweisen und in den Dashboards ausweisen — mit der gleichen UX wie bei den bestehenden Plattformen.