

## Visuelle Verbesserungen für das Chatter Dashboard

Basierend auf der Analyse des aktuellen Dashboards hier konkrete visuelle Upgrades, die **keine Logik oder Funktionalität** verändern:

### 1. Animierte Zahlenwerte (Counter Roll-up)
Die Umsatz-/Statistik-Karten zeigen Werte aktuell statisch an. Mit Framer Motion animierte Counter (wie bereits im Admin-Dashboard verwendet) lassen die Zahlen beim Laden elegant hochzählen.

### 2. Subtile Hover- und Übergangseffekte auf Stat-Karten
Die `glass-card-subtle` Karten bekommen `hover:scale-[1.02]` und `hover:border-accent/30` Transitions für ein interaktiveres Gefühl.

### 3. Gold-Gradient-Border auf der Status-Karte
Die "Status: Gold/Starter" Karte (volle Breite) bekommt einen animierten Gold-Gradient-Border statt der schlichten Glasskarte, um den Status visuell hervorzuheben.

### 4. Dezente Einblende-Animationen (Stagger)
Sektionen und Karten erscheinen mit gestaffelten Fade-in/Slide-up Animationen via Framer Motion beim Laden der Seite.

### 5. Verbesserter Header mit Gradient-Akzent
Der Header bekommt einen subtilen Gold-Gradient-Streifen am unteren Rand (`border-b` → gradient bottom border) für mehr visuellen Premium-Charakter.

### 6. Account-Karten-Polish
- Kopier-Buttons mit kurzer Pulse-Animation beim Klick
- Subtiler Glow-Effekt auf den Domain-Links
- Leichter Separator-Gradient zwischen Account-Feldern

### 7. Bonus-Modell Section: Glow-Effekt auf aktiver Stufe
Die aktive Stufe (Gold oder Starter) bekommt einen pulsierenden, subtilen Gold-Glow (`animate-pulse` gedämpft), um den aktuellen Status hervorzuheben.

### 8. Progress-Bar Verbesserung
Die Gold-Fortschrittsleiste bekommt einen Shimmer/Shine-Effekt (CSS-Animation), der über den gefüllten Bereich gleitet.

---

### Technische Umsetzung

**Dateien die geändert werden:**
- `src/pages/Dashboard.tsx` — Framer Motion Wrapper, Hover-Klassen, animierte Counter
- `src/index.css` — Neue Utility-Klassen: `shimmer-bar`, `gold-gradient-border-animated`, `pulse-glow`

**Keine neuen Dependencies nötig** — Framer Motion ist bereits installiert.

**Keine Logik-Änderungen** — Ausschließlich Styling, CSS-Klassen und Animationen.

