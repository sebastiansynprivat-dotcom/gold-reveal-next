

## Plan: Bonus-Modell Tier-Karten Redesign + Demo-Modus

### Probleme aktuell
- 6 Karten in `grid-cols-6` sind auf Mobile sehr gequetscht (winzige Schrift)
- Kein visueller "Wow"-Faktor, zu technisch/trocken
- Keine Demo-Möglichkeit zum Durchklicken der Stufen

### Was wird umgesetzt

**1. Neues Karten-Design (Premium & Clean)**
- Auf Mobile: `grid-cols-3` (2 Reihen à 3 Karten) statt 6 in einer Reihe
- Auf Desktop: `grid-cols-6` bleibt
- Jede Karte bekommt mehr Padding, einen feinen inneren Glow, und die aktive Karte einen deutlicheren Gold-Border mit sanftem Schatten
- Emoji größer, Prozent-Zahl prominent, Tier-Name und "ab X€" darunter
- Durchlaufene Stufen bekommen ein dezentes Häkchen-Overlay
- Progress-Bar bleibt unter dem Grid

**2. Demo-Modus (Stufen durchklicken)**
- Ein Toggle/Button "Demo anzeigen" unter dem Bonus-Modell Header
- Im Demo-Modus: Ein Slider oder Buttons (Pfeile links/rechts) um durch die Stufen zu navigieren
- Die aktive Stufe wechselt visuell, die Progress-Bar passt sich an, der Verdienst-Wert ändert sich
- Demo-State ist rein lokal (useState), überschreibt nicht die echten Daten
- Kleiner Hinweis-Badge "Demo" damit klar ist, dass es nicht der echte Stand ist
- Button "Demo beenden" setzt zurück auf echte Werte

### Technische Umsetzung

**Datei:** `src/pages/Dashboard.tsx`

- Neuer State: `demoMode: boolean`, `demoTierIndex: number`
- Wenn `demoMode` aktiv: `currentTier` und `monthlyRevenue` werden durch Demo-Werte ersetzt (z.B. Mitte des jeweiligen Tier-Bereichs)
- Karten-Grid: `grid-cols-3 lg:grid-cols-6` mit verbessertem Styling
- Jede Karte: mehr Höhe, größeres Emoji, klarere Typografie-Hierarchie
- Demo-Controls: Zwei Chevron-Buttons + aktueller Tier-Name in der Mitte

