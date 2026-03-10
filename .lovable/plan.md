

## Plan: Leaderboard-Logik & Design überarbeiten

### 1. Monoton steigende Umsätze (nie rückwärts)

Aktuell wird pro Tag ein unabhängiger Zufallswert berechnet — dadurch kann Tag 15 niedriger sein als Tag 14. **Fix:** Für jeden Spieler werden kumulative Tagesinkremente berechnet. Jeder Tag addiert einen positiven Betrag zum Vortag, sodass die Kurve strikt monoton steigt.

```
revenue[day] = sum(increment[1..day])  // increment immer > 0
increment[d] = (maxRev / daysInMonth) * (0.6 + seededRandom * 0.8)
```

### 2. Rang-Durchmischung (alle außer Sebastian an max. 7 Tagen)

Aktuell ist Sebastian **immer** #1. **Neu:** Sebastian darf an bis zu 7 Tagen im Monat nicht auf Platz 1 sein (z.B. Platz 2–4). An den restlichen ~23 Tagen bleibt er #1. Alle anderen Spieler mischen sich frei durch, weil ihre Tagesinkremente unterschiedlich ausfallen.

**Umsetzung:** Statt Sebastian hart auf #1 zu pinnen, bekommt er einfach das höchste Monatsmaximum. An bestimmten deterministisch gewählten Tagen (max. 7) wird sein Inkrement reduziert, sodass andere ihn kurzzeitig überholen. Alle 100 Einträge werden dann normal nach Umsatz sortiert — kein Hardcoding der Position.

### 3. Animierte Zahlen beim Laden

Die Umsatz-Zahlen sollen beim Seitenladen und beim Slider-Wechsel animiert eingeblendet werden — ein kurzer "Count-up"-Effekt. Wird als kleine `AnimatedNumber`-Komponente mit `framer-motion`'s `useMotionValue` + `useTransform` + `animate` umgesetzt, die von 0 zum Zielwert zählt.

### 4. Design-Polish

- **Podium:** Mehr vertikaler Abstand, größere Krone, dezenterer Glow
- **Liste:** Leicht erhöhtes Padding, subtilerer Hover-Effekt, sauberere Trennlinien
- **Slider:** Etwas mehr Abstand nach unten, Label-Typografie feiner
- **Gesamtbild:** Weniger Border-Noise, klarere Hierarchie zwischen Podium und Liste

### Dateien

Nur `src/pages/Leaderboard.tsx` wird geändert — keine neuen Dateien nötig.

