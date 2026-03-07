

## Visuelle Verbesserungen für das Bonus-Modell

Das aktuelle Bonus-Modell ist funktional, aber relativ flach gestaltet. Hier sind konkrete Vorschläge, um es visuell aufzuwerten — passend zum bestehenden Premium-Design (Schwarz/Gold, Glassmorphismus, Animationen):

### 1. Animierter Sektions-Header
- Titel "Bonus-Modell" mit `text-gold-gradient-shimmer` statt statischem Text
- Kleines Trophy/Crown-Icon daneben mit dezenter Puls-Animation
- Goldene Gradient-Linie unter dem Header (wie `header-gradient-border`)

### 2. Stufenkarten mit mehr Tiefe
- **Gold-Status**: `gold-gradient-border-animated` (rotierender conic-gradient Rahmen) statt statischer border, wenn Gold aktiv ist
- **Starter**: Dezenter, zurückgenommener Stil bleibt, aber mit leichtem Hover-Effekt (`hover:scale-[1.01]` + transition)
- **Account Upgrade**: Leichter Gradient-Hintergrund statt flachem `bg-accent/5`

### 3. Animierte Progress-Bar
- Zahl über der Progress-Bar, die beim Laden hochzählt (Roll-up Counter mit Framer Motion `useMotionValue`)
- Goldener Partikel-Shimmer auf dem gefüllten Bereich (bereits `shimmer-bar`, aber stärker betonen)

### 4. Staggered Entrance Animations
- Alle drei Tier-Karten mit `framer-motion` staggered fade-in von unten (`variants` mit `staggerChildren: 0.1`)
- Smooth und dezent, passend zum bestehenden Design-System

### 5. Aktiver Status visuell hervorheben
- Wenn Gold aktiv: Konfetti-ähnliches Emoji oder animiertes Badge "🏆 Gold aktiv" mit Glow
- Progress-Bar bei 100% bekommt einen kontinuierlichen Gold-Shimmer

### Dateien
- `src/pages/Dashboard.tsx` — Bonus-Modell Sektion (~Zeilen 986-1070) umgestalten mit motion-Wrappern und verbesserten CSS-Klassen

### Kein Backend nötig
Rein visuelle Änderungen, keine Datenbank- oder API-Anpassungen.

