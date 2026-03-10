

## Problem

Die aktuelle Logik verteilt in **Blöcken**: Bei Gewichtung 40/60 gehen die ersten 40 User zu Offer A, dann die nächsten 60 zu Offer B. Das wiederholt sich alle 100 User. Das heißt, bei 10 Usern hintereinander kann es passieren, dass alle 10 dasselbe Offer bekommen.

## Lösung: Gleichmäßige Verteilung (Bresenham-Algorithmus)

Statt Blöcke zu bilden, wird für jeden User einzeln berechnet, wo er hingehört — basierend auf dem Verhältnis.

**Beispiel bei 40/60 und 10 Usern:**

```text
User  1 → B (60)
User  2 → A (40)
User  3 → B (60)
User  4 → B (60)
User  5 → A (40)
User  6 → B (60)
User  7 → A (40)
User  8 → B (60)
User  9 → B (60)
User 10 → A (40)
= 4× A, 6× B ✓
```

Die Verteilung ist **exakt** und **gleichmäßig verteilt** — keine langen Blöcke.

## Technische Änderung

**`src/components/QuizResult.tsx`** — Die Routing-Logik im `WeightedRouteButton` wird angepasst:

Statt `position = counter % totalWeight` und dann akkumulieren, wird pro Route berechnet, wie viele User diese Route bei Counter `n` bereits hätte bekommen sollen vs. bei Counter `n-1`. Die Route mit der größten "Schuld" bekommt den nächsten User.

Konkret: `floor((counter + 1) * weight / totalWeight) - floor(counter * weight / totalWeight)` — wenn das `> 0` ist, bekommt diese Route den User. Das ist eine bewährte Methode (Bresenham / Largest Remainder), die garantiert gleichmäßige Verteilung.

Keine Datenbank-Änderung nötig — nur die Client-seitige Auswahl-Logik ändert sich. Counter und `increment_route_counter()` bleiben wie sie sind.

