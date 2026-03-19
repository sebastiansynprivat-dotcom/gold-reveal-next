

# Chatter-Dashboard → Mitarbeiter-Dashboard Umbau

## Überblick

Das "Chatter-Dashboard" im Admin-Bereich wird zum **Mitarbeiter-Dashboard** umbenannt. Beim Hinzufügen wird eine Rolle (Chatter / Mitarbeiter) vergeben. Oben kann nach Rolle gefiltert werden. Mitarbeiter erhalten eine Stundenlohn-Vergütung statt Prozente. Die Tabelle wird vereinfacht (keine Einzel-Plattform-Spalten).

## Änderungen

### 1. Datenmodell erweitern (Chatter Interface)

- Neues Feld `role: "chatter" | "mitarbeiter"` (Default: `"chatter"`)
- Neues Feld `compensationType: "percentage" | "hourly"` (Default: `"percentage"`)
- Neues Feld `hourlyRate: number` (Default: 0)
- Neues Feld `hoursWorked: number` (Default: 0)
- Migration-Funktion aktualisieren für bestehende localStorage-Daten

### 2. Umbenennung

- Header: "Chatter-Dashboard" → "Mitarbeiter-Dashboard"
- Subtitle: "Mitarbeiter & Chatter verwalten & Gutschriften erstellen"
- Section-Title: "Alle Chatter" → "Alle Mitarbeiter"
- Tab-Label in AdminDashboard.tsx: "Chatter-Dashboard" → "Mitarbeiter-Dashboard"
- Toasts und Footer-Text entsprechend anpassen

### 3. Rollen-Filter oben

- Über der Suchleiste: Drei Filter-Pills: **Alle | Chatter | Mitarbeiter**
- Gold-Highlight für aktiven Filter
- Filtert `filteredChatters` zusätzlich nach `role`

### 4. Rolle beim Hinzufügen

- Im "Neu"-Formular ein Toggle/Select für Rolle: Chatter oder Mitarbeiter
- Default: Chatter

### 5. Tabelle vereinfachen

- Spalten werden: **Name | Plattform | Rolle | Gesamt | Verdienst | 🗑**
- Grid: `grid-cols-[1fr_80px_80px_80px_80px_32px]`
- Einzelne Plattform-Revenue-Spalten (4Based, Maloum, Brezzels) entfernt
- "Verdienst" Spalte zeigt den errechneten Betrag (% oder Stunden × Rate)

### 6. Vergütungsmodell in Detail-Ansicht

- Wenn ein Eintrag ausgewählt ist, zeigt die "Anteil & Verdienst" Section:
  - **Toggle**: "Prozent-Beteiligung" vs "Stundenlohn"
  - Bei **Prozent**: Slider wie bisher (0–100%), Verdienst = Gesamt × %
  - Bei **Stundenlohn**: Eingabefeld "Stundensatz (€)" + Eingabefeld "Stunden gearbeitet" → Verdienst = Rate × Stunden
- Die Revenue-Eingabefelder (4Based, Maloum, Brezzels) bleiben in der Detail-Ansicht bestehen, damit der Gesamtumsatz berechnet werden kann

### 7. AdminDashboard.tsx

- Tab-Label von "Chatter-Dashboard" → "Mitarbeiter-Dashboard" ändern

## Technische Details

- **Datei**: `src/components/ChatterDashboardTab.tsx` — Hauptänderungen
- **Datei**: `src/pages/AdminDashboard.tsx` — Tab-Label umbenennen (Zeile ~1843)
- localStorage-Key bleibt gleich (`admin-chatter-dashboard`) für Rückwärtskompatibilität
- Migration füllt `role: "chatter"`, `compensationType: "percentage"`, `hourlyRate: 0`, `hoursWorked: 0` für bestehende Einträge

