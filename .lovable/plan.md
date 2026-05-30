## Ziel
Im Dashboard von Martin Mo (User `ad822168-efed-495f-b1da-84fdf75538f3`, Gruppe „(Br) Martin Mo") soll die Bonus-Stufe immer mindestens 25% sein — also die Starter/Bronze/Silber/Gold/Platin-Logik (20–24%) greift bei ihm nicht. Alle anderen Chatter bleiben unverändert.

## Umsetzung
In `src/pages/Dashboard.tsx`:

1. Konstante hinzufügen:
   ```ts
   const FORCED_ELITE_USER_IDS = new Set(["ad822168-efed-495f-b1da-84fdf75538f3"]);
   ```
2. Nach `const currentTier = getCurrentTier(monthlyRevenue);` prüfen, ob der eingeloggte User in dem Set ist. Wenn ja:
   - `currentTier` wird auf den Elite-Tier (💎, 25%) gesetzt, sofern der aktuelle Tier eine niedrigere Rate als 25% hat. Liegt er bereits bei Elite oder Titan, bleibt es unverändert.
   - `nextTier` wird entsprechend neu berechnet (Titan oder `null`).
3. Damit greifen automatisch: angezeigter Tier-Name/Emoji, Rate, Monatsübersicht (`MonthSummaryWidget`), Bonus-Übersicht (außer Demo-Modus, der bleibt zum Durchklicken erhalten).

Keine DB-Änderung nötig — es ist eine reine UI-/Berechnungs-Override, exklusiv für Martin Mo.

## Nicht im Scope
- Andere Dashboards (Admin, Model) — dort wird die Bonus-Tier-Logik nicht angezeigt.
- Auszahlungs-/Rechnungsberechnung im Backend (separat, falls überhaupt nötig).
