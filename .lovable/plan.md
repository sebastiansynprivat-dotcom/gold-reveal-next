

## Plan: Chatter-Übersicht mit einklappbaren Ordnern

### Aktueller Zustand
Die Chatter-Übersicht gruppiert nach **Plattform → Accounts** und zeigt alles aufgeklappt an. Ordner/Unterordner werden nur als kleine Badges angezeigt.

### Änderungen in `src/pages/AdminDashboard.tsx` (ChatterOverviewTab)

**1. Neuen State für offene Ordner**
- `expandedFolders: Set<string>` — standardmäßig leer (= alles eingeklappt)

**2. Gruppierung umbauen: Ordner → Unterordner → Accounts**
- Statt `byPlatform` wird nach `folder_name` gruppiert (Accounts ohne Ordner unter "Ohne Ordner")
- Innerhalb eines Ordners nach `subfolder_name` gruppieren
- Ordner-Header zeigt: Ordnername, Anzahl Accounts, Anzahl aktive Chatter

**3. Einklappbare Ordner-Sections**
- Klick auf Ordner-Header toggled `expandedFolders`
- ChevronRight/ChevronDown Icon als Indikator
- Standardmäßig alles **eingeklappt** — nur die Ordner-Zeilen mit Zusammenfassung sichtbar
- Unterordner als Sub-Gruppen innerhalb des ausgeklappten Ordners

**4. Beibehaltung**
- Filter (Alle/Aktiv/Inaktiv) bleibt
- Account-Details (Chatter-Einträge mit Status, Dauer) bleiben gleich, nur hinter Klapp-Logik

### Technisch
- Kein DB-Change nötig
- Nur `ChatterOverviewTab` (Zeilen 170-358) wird angepasst
- Verwendet einfaches `div` mit `onClick` + conditional rendering (kein Accordion-Primitive nötig)

