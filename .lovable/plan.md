

## Plan: Dynamische Tages-Bestenliste mit Demo-Slider

### Was wird gemacht

1. **Platz 1 realistischer machen** — Sebastian bekommt ~98.347€ statt glatte 100.000€. Alle Zahlen werden "krumm" (ungerade Hunderter/Zehner).

2. **Tagesabhängige Daten** — Die Umsätze werden basierend auf dem aktuellen Tag im Monat berechnet. Am 1. sind alle niedrig, am 30./31. sind sie bei ihrem Monats-Maximum. Jeder Tag liefert deterministische aber unterschiedliche Zahlen (Seed = Tag + Spieler-Index).

3. **Demo-Slider zum Durchswipen** — Unter dem Header kommt ein horizontaler Tages-Slider (1–31), mit dem man durch den Monat navigieren kann. Zeigt den aktuellen Tag als Default. Beim Wischen ändern sich alle Zahlen live. Clean im Gold-Design integriert, z.B. als schmale Leiste mit Tageszahl und kleinem Kalender-Icon.

4. **Design-Polish** — Feinschliff an Spacing, Border-Radien, Podium-Proportionen und Typografie für ein cleaneres Gesamtbild.

### Technische Umsetzung

- **Seeded Random-Funktion** — Einfache deterministische Pseudo-Random basierend auf `(tag * 31 + playerIndex * 7)` damit die Zahlen pro Tag stabil sind aber zwischen Tagen variieren.
- **Umsatz-Kurve** — Pro Spieler: `maxRevenue * (tag / daysInMonth) * (0.85 + seededRandom * 0.3)` — so steigen die Werte natürlich über den Monat, mit leichter Varianz.
- **State** — `useState` für `selectedDay`, Default = `new Date().getDate()`. Die `generateLeaderboard(day)` Funktion wird bei jedem Tageswechsel neu berechnet via `useMemo`.
- **Slider UI** — Radix Slider oder einfacher `<input type="range">` gestyled im Gold-Theme, mit Tagesanzeige (z.B. "Tag 14 / 31").
- **Alles in `src/pages/Leaderboard.tsx`** — keine neuen Dateien nötig.

### Design-Verbesserungen
- Podium-Cards: etwas mehr Padding, sauberere Abstände
- Liste: leicht größere Schrift für bessere Lesbarkeit
- Slider-Leiste: dezent, glass-morphism Hintergrund, Gold-Akzent für den aktiven Punkt

