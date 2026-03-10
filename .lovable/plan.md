

# Plan: Bonus-Modell kompakt & animiert redesignen

## Problem
Die 6 Stufen-Karten nehmen vertikal sehr viel Platz ein (6 große Karten untereinander). Das sieht überladen aus.

## Lösung: Kompakter Tier-Stepper mit expandierbarem aktiven Tier

Statt 6 voller Karten → ein **horizontaler Stufen-Indikator** (wie ein Fortschritts-Stepper) + nur die **aktive Stufe** als expandierte Karte mit Details.

### Design

```text
  ⚡ ── 🥉 ── 🥈 ── 🏆 ── 💠 ── 💎
  20%   21%   22%   23%   24%   25%
         ▲ aktiv (leuchtet)

  ┌─────────────────────────────┐
  │ 🥉 Bronze – 21%            │  ← nur aktive Stufe als Karte
  │ ████████░░░ 750€ / 1.000€  │
  │ Noch 250€ bis Silber        │
  └─────────────────────────────┘
```

- **Horizontale Tier-Leiste**: Alle 6 Stufen als kleine Kreise/Punkte mit Emoji, verbunden durch Linien. Erledigte = gold gefüllt, aktive = pulsierend/glühend, kommende = grau.
- **Aktive Stufe**: Einzige expandierte Karte mit Progress-Bar zur nächsten Stufe.
- **Animationen**: Framer Motion für den Übergang zwischen Stufen, Glow-Pulse auf aktivem Punkt, Linie füllt sich golden bis zur aktuellen Stufe.
- Spart ca. 70% vertikalen Platz.

### Änderungen

**`src/pages/Dashboard.tsx`** (Zeilen ~1099-1159):
- Ersetze das `[...BONUS_TIERS].reverse().map(...)` durch zwei neue Elemente:
  1. **Tier-Stepper** (horizontale Leiste mit 6 Punkten + Verbindungslinien)
  2. **Aktive-Tier-Karte** (einzelne Karte mit Details + Progress)
- Framer Motion `layoutId` für smooth Tier-Wechsel-Animation
- Streak-Karten (Account Upgrade + 30-Tage-Challenge) bleiben unverändert

### Tier-Stepper Details
- Jeder Punkt: 36px Kreis mit Emoji
- Verbindungslinie zwischen Punkten: gold gefüllt bis zur aktiven Stufe, grau danach
- Aktiver Punkt: `gold-glow` + `streak-circle-pulse` Klasse
- Erledigte Punkte: Leicht golden getönt
- Name + Rate unter jedem Punkt (text-[10px])
- Responsive: Auf Mobile etwas kompakter (28px Kreise)

