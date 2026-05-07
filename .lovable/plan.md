# Demo-Modus für Chatter-Dashboard ausblendbar machen

## Ziel
Alle Demo-Buttons (Loot-Box Demo, 30-Tage-Streak Demo, Bonus-Tier Demo, Account-Zuweisung Demo, Model aktiv/inaktiv Demo) verschwinden standardmäßig aus dem Chatter-Dashboard — können aber jederzeit ohne Code-Änderung wieder eingeblendet werden.

## Lösung: Ein zentraler Demo-Flag

Neue Datei `src/lib/demoMode.ts` mit einem kleinen Helper `isDemoMode()`:
- Liest `localStorage.shex_demo_mode === "1"`
- Zusätzlich: URL-Parameter `?demo=1` setzt den Flag (persistent), `?demo=0` entfernt ihn
- React-Hook `useDemoMode()` für reaktive Komponenten

So kannst **du** den Demo-Modus jederzeit aktivieren, indem du einmal `https://shex-dashboard.com/dashboard?demo=1` aufrufst — der Flag bleibt im Browser bestehen, bis du `?demo=0` aufrufst. Für normale Chatter ist alles unsichtbar.

## Betroffene Stellen (alle bekommen `if (!isDemoMode) return null` o.ä.)

1. **`src/components/MonthlyStreakTracker.tsx`** — "Demo"-Button neben Streak-Counter (Zeile ~177–185)
2. **`src/components/LootBoxReward.tsx`** — "🧪 Demo: Loot-Box Meilenstein öffnen"-Karte (Zeile ~188–198)
3. **`src/pages/Dashboard.tsx`**
   - "🧪 Demo: Account-Zuweisung simulieren"-Button (Zeile ~1045–1063)
   - "🧪 Demo: Model aktiv/inaktiv"-Toggle (Zeile ~1297–1310)
   - Bonus-Tier-Demo-Toggle inkl. Controls (Zeile ~1634–1700)

Bestehende `demoMode`/`demoModelInactive`-State-Logik bleibt erhalten — nur die UI-Schalter werden konditional gerendert. Wenn der globale Flag aus ist, gibt es schlicht keinen Trigger mehr → kein Demo-State wird je aktiviert → echte Daten werden angezeigt.

## Bedienung nach Implementierung

- **Demo einschalten**: `https://.../dashboard?demo=1` einmal öffnen → bleibt aktiv
- **Demo ausschalten**: `https://.../dashboard?demo=0` einmal öffnen → wieder versteckt
- Alternativ in der Browser-Konsole: `localStorage.setItem('shex_demo_mode','1')` bzw. `removeItem`

## Geänderte Dateien
- `src/lib/demoMode.ts` (neu)
- `src/components/MonthlyStreakTracker.tsx`
- `src/components/LootBoxReward.tsx`
- `src/pages/Dashboard.tsx`
