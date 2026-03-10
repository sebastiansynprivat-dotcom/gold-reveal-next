

# Plan: Bonusmodell überarbeiten + 30-Tage-Streak

## Zusammenfassung

Das bisherige 2-Stufen-System (Starter 20% / Gold 25% ab 3.000€) wird durch ein 5-Stufen-System mit kreativen Namen ersetzt. Zusätzlich wird das bestehende Streak-System von 7 Tagen / 30€ auf 30 Tage / 100€ erweitert.

## Neue Stufen

| Stufe | Name | Umsatz | Rate |
|-------|------|--------|------|
| 1 | Starter | 0 – 499€ | 20% |
| 2 | Bronze | 500 – 999€ | 21% |
| 3 | Silber | 1.000 – 1.499€ | 22% |
| 4 | Platin | 1.500 – 1.999€ | 23% |
| 5 | Diamond | 2.000€+ | 24% |

**Hinweis:** Du hast gesagt "1500 bis 3000€ = 24%" und "ab 2000€ Goldstatus". Ich nehme an, die letzte Stufe beginnt bei 2.000€ mit 24% (= Diamond/Gold). Falls 3.000€ gemeint war, bitte korrigieren.

## Streak-System

- Bestehender 7-Tage-Streak (Account Upgrade) bleibt erhalten
- **Neuer 30-Tage-Streak**: 30 Tage in Folge mind. 100€ Umsatz = Spezialbonus
- Anzeige: 30 Tage-Fortschrittsbalken statt Kreise (bei 30 passen keine Kreise mehr)
- Bei Abschluss: Konfetti + Dialog mit Belohnungs-Info

## Änderungen

### `src/pages/Dashboard.tsx`
- Konstanten ersetzen: `GOLD_THRESHOLD`/`STARTER_RATE`/`GOLD_RATE` → Stufen-Array mit Name, min, max, Rate, Icon, Emoji
- `rate`-Berechnung: Lookup in Stufen-Array basierend auf `monthlyRevenue` (nicht `umsatz` = Tagesumsatz)
- `verdienst`-Berechnung anpassen
- Badge im Header: zeigt aktuelle Stufe statt nur "Starter"/"Gold"
- Stats-Karten: "Deine Rate" zeigt dynamisch die aktuelle Rate
- **Bonus-Modell Sektion** komplett neu: Alle 5 Stufen als gestapelte Karten mit Fortschrittsbalken zur nächsten Stufe, aktive Stufe hervorgehoben
- Bestehenden Account-Upgrade Streak behalten
- Neuen 30-Tage-Streak hinzufügen (eigene Komponente)

### `src/components/StreakTracker.tsx`
- Bestehender 7-Tage-Streak bleibt unverändert

### Neue Komponente: `src/components/MonthlyStreakTracker.tsx`
- 30-Tage-Streak mit 100€/Tag Ziel
- Fortschrittsbalken (kein Kreis-Grid bei 30 Tagen)
- Konfetti + Dialog bei Abschluss
- localStorage-basiert wie bestehender Streak
- WhatsApp-Text für Bonus-Einlösung

### Keine DB-Änderungen nötig
Alles client-seitig berechenbar aus `daily_revenue`.

