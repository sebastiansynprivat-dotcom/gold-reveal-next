## Ziel

Beim Anlegen eines Models im Admin Dashboard soll ein **Referrer Tag** (z. B. „Instagram Anna", „Affiliate XY") angegeben werden können. Der Tag wird dauerhaft am Model gespeichert. Beim nächsten Anlegen werden alle bisher verwendeten Tags zur Auswahl angezeigt — neue Tags können weiterhin frei eingetippt werden.

## Änderungen

### 1. Datenbank

Neue Spalte in `models`:
- `referrer_tag` (text, nullable, default `''`)

Index auf `referrer_tag` für die Vorschlagsabfrage.

### 2. „Neues Model anlegen"-Dialog (`src/components/ModelDashboardTab.tsx`)

- Neues Feld **„Referrer Tag"** im Block „Einstellungen", direkt unter „Drive Folder ID".
- Combobox-artiges Verhalten:
  - Freitext-Input
  - Beim Fokus / Tippen erscheint ein Dropdown mit bisherigen Tags (distinct, sortiert, alphabetisch)
  - Klick auf Vorschlag → übernimmt Wert
  - Neuer Wert wird beim Speichern automatisch Teil der Vorschlagsliste (nächstes Öffnen)
- Wert wird in `models.referrer_tag` mitgespeichert (`handleCreateModel`).

### 3. Detail-/Edit-Panel des Models

- Gleiches Feld auch im Bearbeiten-Bereich rechts, damit Tag nachträglich gesetzt/geändert werden kann.
- Update via bestehendem Save-Flow (`modelForm`).

### 4. Vorschlagsliste laden

- Beim Laden der Models (`loadModels`) ohnehin alle Models geholt → bestehende Tags werden client-seitig mit `Array.from(new Set(models.map(m => m.referrer_tag).filter(Boolean))).sort()` gebildet. Keine zusätzliche Query nötig.

## UI-Verhalten (Vorschläge)

```text
[Referrer Tag           ▾]
 ├─ Instagram Anna
 ├─ Affiliate XY
 └─ TikTok Promo
```

- Eingabefeld + kleines Chevron-Icon
- Dropdown nur sichtbar wenn Vorschläge existieren
- Tippt der User einen Wert, der nicht in der Liste steht, wird er einfach gespeichert (kein Zwang zur Auswahl)
- Glassmorphism-Style passend zum bestehenden Dialog

## Was nicht geändert wird

- Keine Auswirkung auf Account-/Plattform-Logik
- Keine Auswirkung auf Sub-Admin-/RLS-Regeln (Tag wird durch bestehende Model-Policies abgedeckt)
- Keine separate „Tags"-Verwaltungstabelle — Tags sind einfach distinct über `models`
