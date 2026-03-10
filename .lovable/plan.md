

## Plan: Durchschnittlicher Tagesumsatz für nächste Stufe anzeigen

### Was wird gemacht
Unter der Progress-Bar (Zeile 1234-1239) wird eine zusätzliche Zeile eingefügt, die dem User zeigt, wie viel Umsatz er **pro Tag im Durchschnitt** machen muss, um die nächste Bonus-Stufe zu erreichen.

### Berechnung
- Verbleibender Betrag bis zur nächsten Stufe: `nextTier.min - activeRevenue`
- Verbleibende Tage im Monat: `daysInMonth - currentDay`
- Durchschnitt pro Tag: `verbleibend / verbleibendeTage` (aufgerundet)
- Falls der Monat schon vorbei ist (letzter Tag), wird der volle Betrag angezeigt

### Änderung in `src/pages/Dashboard.tsx`

**Nach Zeile 1238** (unter dem "Noch X€ bis..." Text) wird eine neue Zeile eingefügt:

```tsx
<p className="text-[9px] lg:text-[10px] text-muted-foreground text-center mt-1">
  ⌀ <span className="text-accent font-semibold">{dailyAvgNeeded.toLocaleString("de-DE")}€</span> pro Tag nötig für {activeNextTier.emoji} {activeNextTier.name}
</p>
```

Die Berechnung (`dailyAvgNeeded`) wird direkt im `BonusSection`-Component berechnet mit `Math.ceil(remaining / Math.max(1, daysLeft))`.

