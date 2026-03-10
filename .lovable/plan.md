## Plan: 7. Bonus-Stufe + Spacing-Fix

### 1. Neue Stufe hinzufügen

Eine 7. Stufe **"Titan"** mit 🔱 Emoji, ab 50.000€, Rate 35%.

Das `BONUS_TIERS` Array wird erweitert – Platin max wird auf 4999 angepasst, Diamond max auf 49999, und die neue Stufe bekommt `max: Infinity`.

### 2. Grid-Layout anpassen

Mit 7 Karten passt `grid-cols-6` nicht mehr sauber. Lösung:

- **Mobile**: `grid-cols-3` bleibt (3 Reihen: 3+3+1, letzte zentriert)
- **Desktop**: `grid-cols-7` statt `grid-cols-6`

Die letzte Karte auf Mobile wird über eine Utility-Klasse zentriert (z.B. `col-start-2` für die 7. Karte oder ein Flex-Wrapper mit `justify-center` für die letzte Reihe).

Alternativ: Auf Mobile `grid-cols-4` erste Reihe, `grid-cols-3` zweite – aber das wird kompliziert. Sauberer: **4 Karten oben, 3 unten zentriert** via Flex-Layout statt Grid, oder einfach die 7. Karte in der 3. Reihe links starten lassen.

### 3. Mehr Abstand vor Account Upgrade

Zwischen dem Progress-Bar-Block und dem "Account Upgrade" Block wird der Abstand von aktuell `space-y` auf deutlich mehr erhöht (z.B. `mt-8` oder `mt-10` statt dem impliziten Stagger-Gap).

### 4. Legend-Stufe Styling

Die Legend-Stufe bekommt wie Diamond ein besonderes Styling wenn aktiv – z.B. auch `gold-gradient-border-animated` oder einen eigenen visuellen Effekt.

### Dateien

- `src/pages/Dashboard.tsx` – BONUS_TIERS erweitern, Grid anpassen, Spacing erhöhen