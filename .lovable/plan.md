## Visuelles Upgrade: Animationen & Moderneres Karten-Design

### 1. Stat-Karten: Hover-Glow + Icon-Akzente

Jede Stat-Kachel (Gestern, Monat, Gesamt, Verdienst, Rate, Tagesziel) bekommt:

- **Hover-Effekt**: Beim Hover leuchtet der obere Rand kurz gold auf (`border-t-2 border-transparent hover:border-accent/60` + sanfter Glow-Shadow)
- Leichter **Glassmorphismus-Upgrade**: etwas stärkerer Blur und feinerer innerer Schatten

### 2. Stat-Grid: Bento-Style-Layout (Desktop)

- Desktop-Grid wird ein **Bento-Grid**: Die wichtigsten Karten (Monatsumsatz, Verdienst) bekommen `col-span-2` bzw. eine prominentere Darstellung
- Die Status-Karte bleibt full-width mit dem bestehenden animierten Gold-Border

### 3. Micro-Interactions auf den Stat-Werten

- Beim Hover auf eine Stat-Kachel skaliert der **Zahlenwert leicht hoch** (`scale-105`, 200ms ease) -- rein per CSS `group-hover`
- Copy-Buttons (Account-Daten) bekommen einen kurzen **Ripple-Pulse** beim Klick (bereits teilweise vorhanden, wird konsistenter)

### 4. Sektions-Header mit animiertem Unterstrich

- Alle Sektionen (Account, MassDM, Tägliche Aufgaben, Bonus-Modell, Abrechnung) bekommen einen **animierten Gold-Gradient-Unterstrich** der von links nach rechts einblendet wenn die Sektion in den Viewport kommt (`whileInView` + CSS `scaleX` Animation)

### 5. Karten-Design: Subtle Inner-Glow bei Interaction

- Alle `glass-card-subtle` Karten erhalten beim Hover einen **inneren Gold-Glow**: `hover:shadow-[inset_0_0_20px_hsl(43_56%_52%_/_0.06)]`
- Die Account-Karte und Bonus-Karte bekommen eine subtile **Top-Gradient-Line** (1px, gold gradient von transparent zu accent zu transparent)

### 6. Entrance-Animationen verbessern

- Stat-Karten: Stagger-Delay wird leicht erhöht (0.08 -> 0.1) und es kommt ein leichter **blur-in** dazu (`filter: blur(4px)` -> `blur(0)`)
- Sektionskarten (Account, Daily Tasks etc.): leichter **slide-up + fade** beim ersten Rendern via `whileInView`

### Technische Umsetzung

- **Dashboard.tsx**: Anpassung des Stat-Grids, Hinzufügen von Icons, group-hover Klassen, whileInView für Sektionen
- **index.css**: Neue Utility-Klasse `.card-hover-glow` und `.section-header-line` Animation
- **DailyChecklist.tsx**, **MassDmGenerator.tsx**: whileInView wrapper für Entrance-Animation
- Kein Datenbankzugriff nötig, rein Frontend-Styling

### Zusammenfassung der visuellen Veränderungen

- Stat-Kacheln: Icons + Hover-Glow + Wert-Scale-Animation
- Bento-Grid auf Desktop mit prominenteren Hauptkarten
- Animierte Section-Divider beim Scrollen
- Innerer Glow auf allen Karten beim Hover
- Blur-in Entrance-Animation statt nur fade