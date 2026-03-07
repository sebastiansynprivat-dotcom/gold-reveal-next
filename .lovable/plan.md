

## Auth-Seite visuelles Upgrade

Die aktuelle Login-Seite ist funktional aber visuell flach -- kein Glassmorphismus, keine Animationen, kein Premium-Feeling passend zum Rest der App.

### Verbesserungen

**1. Glassmorphismus-Karte um das Formular**
- Das gesamte Formular wird in eine `glass-card-subtle`-Karte mit `gold-gradient-border-animated` eingewickelt (wie die Premium-Karten im Dashboard)
- Padding, abgerundete Ecken (`rounded-2xl`), subtiler `dialog-glow`

**2. Hintergrund-Akzente**
- Zwei radiale Gold-Gradient-Blobs im Hintergrund (absolute positioned, `opacity-[0.03]`, blur) fur Tiefe
- Feiner radialer Gradient vom Zentrum nach aussen

**3. Logo-Animation aufwerten**
- Logo bekommt einen pulsierenden Gold-Glow-Ring (`streak-circle-pulse`)
- Leichter Scale-Bounce beim Laden via Framer Motion

**4. Input-Felder: Focus-Glow**
- Beim Fokus bekommen die Inputs einen subtilen Gold-Glow (`focus:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)]`) statt nur Ring
- Leichter Hover-Effekt auf den Inputs (`hover:border-primary/40`)

**5. Submit-Button: Shimmer-Sweep**
- Der "Anmelden"/"Konto erstellen"-Button bekommt den gleichen `bonus-sweep`-Shimmer wie die Bonus-Karte im Dashboard
- Dezent, 14s Zyklus

**6. Entrance-Animationen (Framer Motion)**
- Logo: `scale(0.8) -> scale(1)` + `opacity(0) -> opacity(1)` mit Spring
- Formular-Karte: `y(20) -> y(0)` + Fade-in mit 200ms Delay
- Inputs: Staggered fade-in (je 80ms versetzt)
- Toggle-Text ("Bereits ein Konto?"): Fade-in mit Delay

**7. Sign-Up-Success-State**
- Erfolgs-Karte ebenfalls in Glassmorphismus-Karte
- Check-Icon mit Gold-Pulse-Animation

### Technische Umsetzung
- **Auth.tsx**: Framer Motion imports, `motion.div` Wrapper, Glass-Card-Klassen, Background-Blobs, Input-Styling-Upgrade
- **index.css**: Keine neuen Klassen nötig -- alle bestehenden Utilities werden wiederverwendet (`glass-card-subtle`, `gold-gradient-border-animated`, `dialog-glow`, `streak-circle-pulse`, `bonus-sweep`)

