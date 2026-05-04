## GPU-Optimierung Admin Dashboard — Premium Look behalten

Ziel: Die Seite fühlt sich noch nicht ganz "smooth/hochwertig" an. Ursache sind GPU-teure Effekte, die bei Scrolling und Real-Time-Updates ständig neu komponiert werden — selbst auf Desktop mit dGPU spürbar.

### Hauptprobleme (in Reihenfolge der Kosten)

1. **`backdrop-filter: blur(20px)`** auf jedem `glass-card` (~30+ Karten gleichzeitig im DOM). Backdrop-Blur ist mit Abstand der teuerste GPU-Effekt im Browser — jede Karte erzwingt ein Re-Composite des Hintergrunds.
2. **`blur-3xl` Decor-Layer** (h-64 w-64, h-72 w-[120%]) hinter Hero/Vergleich-Karten. Große Gaussian-Blurs auf Render-Layern.
3. **`drop-shadow-[0_0_18px_...]`** auf großem Hero-Text (5xl/6xl Total). Wird bei jeder Real-Time-Aktualisierung der `AnimatedNumber` neu berechnet.
4. **`shadow-[0_0_8px_currentColor]`** auf jedem Plattform-Dot.
5. **Framer-Motion `whileHover={{ y: -3 }}`** auf 3 Plattform-Tiles — triggert Layout statt Transform-only.
6. **`text-gold-gradient-shimmer`** mit 8s Animation auf statischen Headlines.

### Änderungen

**A) `src/index.css` — Glass-Karten leichter**
- `glass-card`: blur 20px → 12px + `saturate(140%)` (kompensiert visuell), Hintergrund-Opacity rauf (0.6 → 0.72) damit weniger Durchsicht nötig
- `glass-card-subtle`: blur 12px → 8px, Opacity 0.8 → 0.85
- `transform: translateZ(0)` als Promotion-Hint (eigene Compositor-Layer, kein Repaint nötig)
- Mobile (`<768px`): `backdrop-filter: none`, dafür Opacity 0.92/0.95 — sieht identisch aus, GPU-Last halbiert
- `prefers-reduced-motion`: ebenfalls Blur deaktivieren

**B) `src/pages/AdminDashboard.tsx` — Decor-Blurs reduzieren**
- 3× `blur-3xl` Glow-Layer ersetzen durch leichteren `bg-accent/10` mit `radial-gradient` (CSS) statt Filter — gleicher Look, kein Filter-Pass
- `drop-shadow-[0_0_18px_hsl(var(--accent)/0.35)]` auf Hero-Total entfernen (Text bleibt durch `text-accent` golden), stattdessen `text-shadow` (billiger als `drop-shadow`)
- `shadow-[0_0_8px_currentColor]` auf Plattform-Dots → einfacher `box-shadow` mit fixer Farbe (currentColor erzwingt per-element Berechnung)
- `whileHover={{ y: -3 }}` → `whileHover={{ scale: 1.015 }}` (transform-only, kein Layout)

**C) `src/index.css` — Kosmetische Animationen drosseln**
- `text-gold-gradient-shimmer`: Animation nur auf Hover/explizit getriggert, statisches Gold-Gradient als Default — Headlines pulsieren nicht mehr permanent
- `pulse-glow` von 4s → reine `box-shadow` ohne Animation, fester sanfter Glow

### Was bleibt premium
- Goldener Border-Glow auf Hero-Vault & Vergleichs-Karte
- Glasmorph-Effekt auf Desktop (nur weniger aggressiv)
- Alle Framer-Motion Enter-Animationen
- Recharts Area-Verläufe mit Gold-Gradient
- Crown-Icon Spring-Animation
- Tooltips mit Backdrop-Blur

### Erwartete Verbesserung
- Composite-Zeit pro Frame um ~60–70% gesenkt (Backdrop-Blur ist der dominante Posten)
- Real-Time Revenue-Updates triggern keine teuren Filter-Repaints mehr
- Scrolling im Einnahmen-Tab spürbar smoother, besonders bei vielen sichtbaren Karten

### Geänderte Dateien
- `src/index.css`
- `src/pages/AdminDashboard.tsx`