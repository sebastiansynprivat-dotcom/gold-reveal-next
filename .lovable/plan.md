## Vergleichs-Modus für den Einnahmen-Tab

Neuer Filter "Vergleich" rechts neben "Zeitraum". Zwei eigene Date-Range-Picker (A vs. B) erlauben es, beliebige Zeiträume direkt nebeneinander zu vergleichen.

### Filter-Bar

- Pill-Reihe wird erweitert: `Heute · Gestern · 7T · 30T · 90T · Zeitraum · Vergleich`.
- Aktivieren des "Vergleich"-Pills blendet Hero/Plattform-Tiles/Chart aus und zeigt stattdessen das neue Vergleichs-Panel.

### Vergleichs-Panel

```text
┌─────────────────────────┬─────────────────────────┐
│ Zeitraum A              │ Zeitraum B              │
│ [Von ▾]  [Bis ▾]        │ [Von ▾]  [Bis ▾]        │
│ z.B. 01.04.–03.04.      │ z.B. 01.05.–03.05.      │
├─────────────────────────┼─────────────────────────┤
│ GESAMTUMSATZ            │ GESAMTUMSATZ            │
│ 12.480 €                │ 17.940 €     ▲ +43,7 %  │
├─────────────────────────┼─────────────────────────┤
│ Ø/Tag    4.160          │ Ø/Tag    5.980  ▲ +43,7 │
│ Bester   5.300 (02.04.) │ Bester   7.120 (02.05.) │
│ Maloum   6.200          │ Maloum   8.700  ▲ +40 % │
│ Brezzels 3.880          │ Brezzels 5.840  ▲ +50 % │
│ 4Based   2.400          │ 4Based   3.400  ▲ +42 % │
└─────────────────────────┴─────────────────────────┘
```

- **Layout:** Zwei Glass-Cards nebeneinander (mobil gestackt). Rechts neben jedem KPI in Zeitraum B ein grünes/rotes Delta-Pill vs. A.
- **KPIs pro Seite:** Gesamtumsatz, Ø pro Tag, Bester Tag (mit Datum), Anzahl aktiver Tage, plus Breakdown pro Plattform.
- **Premium-Polish:** Gold-Animated-Border auf der "B"-Card, smoothe `AnimatedNumber`-Animationen, Stagger Fade-In, dezenter Spotlight hinter B.
- **Dual Chart unten:** Ein einzelner AreaChart mit zwei Linien — Zeitraum A (gold-muted) vs. Zeitraum B (gold-bright), normalisiert auf "Tag 1, Tag 2, …" damit unterschiedlich lange Ranges vergleichbar bleiben.

### Technische Umsetzung

- `TimeFilter`-Union um `"vergleich"` erweitern.
- Neue States: `compareFromA`, `compareToA`, `compareFromB`, `compareToB`, plus `compareDataA`, `compareDataB`, `compareTotalA`, `compareTotalB`.
- Bestehende `getRevenueRangebyDates`-Funktion wiederverwendet — lokale Variante `fetchCompareRange(from, to)` die `{ data, total }` zurückgibt, so dass A und B parallel geladen werden ohne den Haupt-State zu zerschießen.
- `useEffect` triggert beide Fetches sobald jeweils beide Daten gesetzt sind.
- Delta-Berechnung clientseitig: `((B - A) / A) * 100`.
- Alle Edits in `src/pages/AdminDashboard.tsx` innerhalb des `activeTab === "einnahmen"` Blocks. Keine DB-Änderungen, keine neuen Queries, keine neuen Dependencies.

### Out of Scope

- Speichern von Vergleichs-Presets.
- Vergleich über andere Tabs (Chatter etc.).
