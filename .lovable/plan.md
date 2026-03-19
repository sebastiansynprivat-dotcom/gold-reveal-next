

# Google Sheets-Style Liste fur Chatter- & Model-Dashboard

## Uberblick

Beide Dashboards (Chatter & Model) bekommen eine permanente, tabellarische Ubersicht im Google Sheets-Stil, die alle Eintrage auf einen Blick zeigt. Klick auf einen Namen offnet die Detail-Ansicht darunter.

## Anderungen

### 1. ChatterDashboardTab — Sheets-Tabelle statt Suchfeld-Auswahl

- Ersetze die aktuelle Suchfeld + aufklappbare Liste durch eine permanente Tabelle mit Spalten: **Name | Plattform | 4Based | Maloum | Brezzels | Gesamt | Anteil**
- Jede Zeile ist klickbar, selektierte Zeile wird gold hervorgehoben
- Suchfeld bleibt oben uber der Tabelle
- "Neu"-Button bleibt erhalten
- Delete-Icon pro Zeile am Ende
- Tabelle hat alternating row colors, sticky header, horizontales Scrollen auf Mobile
- Detail-Ansicht (Revenue Card, Daten, Anteil, Crypto, Credit Note) erscheint unterhalb der Tabelle wenn ein Chatter ausgewahlt ist

### 2. ModelDashboardTab — Sheets-Tabelle statt Collapsible-Liste

- Ersetze die eingeklappte "Alle Models"-Liste durch eine permanente Tabelle mit Spalten: **Model (Email) | Plattform | 4Based Rev | Maloum Rev | Brezzels Rev | Gesamt | Anteil %**
- Klick auf eine Zeile ladt die Detail-Ansicht darunter (bestehendes Verhalten bleibt)
- Platform-Filter und Sub-Filter Slider bleiben oben
- Suchfeld bleibt
- Selektierte Zeile bekommt gold-Highlight
- Sticky Header, alternating rows

### 3. Styling

- Nutze bestehende Tailwind-Klassen + `glass-card` Design-System
- Sticky `thead` mit `bg-accent/10` Header
- Hover: `bg-accent/5`, Selected: `bg-accent/15 border-l-2 border-accent`
- Kompakte Zeilen (`py-2 px-3 text-xs`)
- Responsive: horizontales Scrollen auf kleinen Bildschirmen

## Technische Details

- **ChatterDashboardTab.tsx**: Refactor der Render-Logik. Die "Chatter auswahlen" Section wird durch eine Tabellen-Section ersetzt. Daten kommen weiterhin aus localStorage.
- **ModelDashboardTab.tsx**: Die collapsible `Alle Models` Section + `ScrollArea` wird durch eine permanente Tabelle ersetzt. Datenquellen (accounts, allDashboards) bleiben identisch. `filteredAccounts` wird direkt in Tabellenzeilen gerendert. Revenue-Werte pro Model werden aus `allDashboards` gelesen.
- Beide Tabellen nutzen native HTML `table` oder das bestehende Grid-Layout mit `grid-cols-[...]` fur konsistentes Spalten-Alignment.

