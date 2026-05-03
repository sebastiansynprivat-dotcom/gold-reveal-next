## Premium Redesign: Einnahmen Tab (Admin Dashboard)

Ziel: Der Einnahmen-Tab fühlt sich wie ein luxuriöses Cockpit an — Black & Gold, Glassmorphism, mehr Tiefe, Bewegung und Wow-Faktor. **Datenimport bleibt 100% unverändert.**

### Aktueller Zustand

Time-Filter Pills, Hero Gold-Card (Gesamtumsatz), 3 kleine Plattform-Cards, Multi-Line Chart. Funktioniert, wirkt aber flach — kleines Hero, gleichgewichtige Cards, schlichter Line-Chart, keine Vergleiche, keine Hierarchie.

### Redesign

**1. Hero "Vault" Card (Gesamtumsatz)**

- Showpiece: deutlich größer (py-10), zentriertes Crown/Diamond Icon, animierte shimmernde Gold-Zahl (text-5xl/6xl), tabular-nums.
- Layered Effects: animierter Conic-Gradient Gold-Border, sanfter Inner-Glow, dezenter radialer Gold-Spotlight, feiner Grain-Noise Overlay.
- Delta-Row drunter: "▲ +12,4 % ggü. Vorperiode" (aktueller Filter-Range vs. vorheriger gleich langer Range), grün/rot Pill.
- Mini-Sparkline am unteren Rand des Heros mit dem Trend für die aktive Range.

**2. Plattform-Cards → "Premium Tiles"**

- Statt flacher 3-Spalten-Grid jetzt höhere Glass-Tiles mit:
  - Plattform-Dot + Name
  - Große Revenue-Zahl (Gold-Gradient)
  - % Anteil am Gesamt (Progress-Bar in Plattform-Farbe)
  - Mini 7-Punkt-Sparkline pro Plattform
  - Period-Delta Chip (▲/▼ vs. Vorperiode)
- Hover: Lift + soft Gold-Glow, animated Border-Sweep.
  &nbsp;

**4. Umsatzverlauf Chart Upgrades**

- Wechsel von `LineChart` auf Stacked/Overlay `AreaChart` mit reichen Gradients pro Plattform (Markenfarben bleiben).
- Soft Gold "Total" Linie obendrauf.
- Custom Tooltip Card: Gold-Border, Plattform-Breakdown, Tagestotal in Bold, formatierter Wochentag.
- Chart-Mode Toggle: "Stacked / Linien / Gesamt" Segmented Control (gleicher Pill-Style wie Time-Filter).
- Y-Achse: `1.2k`, `12k` Format zur Entlastung.
- Dezente horizontale Benchmark-Linie für Tagesdurchschnitt der Range.

**5. Polish & Motion**

- Stagger Fade-In/Blur: Hero → Tiles → KPI-Strip → Chart bei Tab-Mount und Filter-Wechsel.
- Lokaler Gold-Spotlight hinter dem Hero.
- Zahlen via existierender `AnimatedNumber`.
- Time-Filter Pills behalten, aktiver bekommt subtilen Gold-Underline-Glow.

### Technische Notes

- Alle Edits innerhalb des `activeTab === "einnahmen"` Blocks in `src/pages/AdminDashboard.tsx` (Zeilen 2591–2816).
- Reuse: `glass-card`, `glass-card-subtle`, `gold-gradient-border-animated`, `pulse-glow`, `text-gold-gradient-shimmer`, `AnimatedNumber`, `framer-motion`.
- Deltas/Projections/Sparklines werden **rein clientseitig** aus dem bereits geladenen `rangeData` und `totalValue` berechnet.
- **Keine Änderungen** an `getRevenueToday`, `getRevenueRange`, `getRevenueRangebyDates`, keine neuen Queries, keine DB-Änderungen, keine Edge Functions.
- Neuer Chart nutzt `AreaChart` aus bereits importiertem `recharts`.
- Keine neuen Dependencies.

### Out of Scope

- Datenquellen, Backend, andere Tabs.