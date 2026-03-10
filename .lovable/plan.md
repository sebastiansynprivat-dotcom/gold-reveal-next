

## Dashboard Upgrade: Premium Design + Nützliche Features

Basierend auf deinem Feedback (besseres Visuelles + nützlichere Features) hier ein konkreter Plan:

### 1. Revenue-Verlaufsgraph (7-Tage-Trend)
Ein visuell ansprechender Bereichs-Chart direkt unter den Stats-Karten, der die letzten 7 Tage Umsatz zeigt. Gold-Gradient-Füllung, passend zum Design. Nutzt die vorhandenen `daily_revenue`-Daten und `recharts`.

**Warum nützlich:** Du siehst sofort ob dein Umsatz steigt oder fällt, statt nur Einzelzahlen.

### 2. Stats-Karten visuell aufwerten
- Subtile animierte Icons (Framer Motion Pulse) pro Karte
- Farblich abgestufte Karten: Verdienst-Karte mit Gold-Gradient-Border, Rate-Karte mit Accent-Glow
- Micro-Indikator auf der "Gestern"-Karte: kleiner Pfeil ↑/↓ im Vergleich zum Vortag

### 3. "Dein Monat auf einen Blick" Summary-Widget
Ein neues Premium-Widget zwischen Stats und Account-Daten:
- Kreisförmiger Fortschrittsring (wie Apple Watch) der zeigt wie viel % des Monats geschafft
- Projizierter Monatsverdienst basierend auf bisherigem Durchschnitt
- Tage bis Auszahlung als Countdown

### 4. Schnellzugriff-Leiste
Eine horizontale Scroll-Leiste mit den wichtigsten Aktionen als Chips:
- "MassDM schreiben" → scrollt zur Sektion
- "Umsatz eintragen" → fokussiert das Input
- "Rechnung" → navigiert
- "Frage stellen" → öffnet Chat

Reduziert Scrollen und macht das Dashboard funktionaler.

### Technische Details
- **Revenue-Chart:** Neue Komponente `RevenueChart.tsx`, liest `daily_revenue` der letzten 7 Tage via Supabase, rendert mit `recharts` AreaChart
- **Summary-Widget:** Neue Komponente `MonthSummaryWidget.tsx`, berechnet Projektion aus vorhandenen State-Werten in `Dashboard.tsx`
- **Schnellzugriff:** Inline in `Dashboard.tsx` mit `useRef` + `scrollIntoView` für die Sektionen
- **Keine DB-Änderungen nötig** – alles basiert auf vorhandenen Daten
- **Bestehende Libraries:** `recharts`, `framer-motion`, `date-fns` alle schon installiert

