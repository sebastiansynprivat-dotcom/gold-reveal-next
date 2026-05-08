## Ziel
In der Admin Model-Verwaltung (Tab "Model-Dashboard" → Sektion "Alle Models") sollen wirklich alle Models in der Liste sichtbar/erreichbar sein, indem die Liste zuverlässig scrollbar wird.

## Problem
In `src/components/ModelDashboardTab.tsx` (Zeile 689) wird `<ScrollArea className="max-h-[350px]">` verwendet. Radix `ScrollArea` braucht eine **explizite Höhe** auf dem Viewport, damit der interne Scrollbalken greift — `max-h` allein reicht in dieser Konstellation nicht, weshalb bei vielen Models einige unten abgeschnitten oder gar nicht erreichbar sind.

## Änderung
Datei: `src/components/ModelDashboardTab.tsx`, ca. Zeile 689

- ScrollArea-Höhe auf eine feste, viewport-relative Höhe setzen, damit sie auf jedem Bildschirm sinnvoll skaliert und intern scrollt:
  - `h-[60vh] max-h-[600px]` statt `max-h-[350px]`
- Sicherstellen, dass der Scroll-Indikator (dezenter goldener Scrollbalken) sichtbar ist, damit Admins erkennen, dass weitere Models darunter liegen.
- Sticky Tabellen-Header (Zeile 678) im scrollbaren Bereich behalten, damit die Spaltenüberschriften beim Scrollen sichtbar bleiben (`sticky top-0 z-10` + leicht erhöhter Background-Blur, damit Inhalte darunter nicht durchscheinen).

## Nicht-Änderungen
- Layout, Spaltenstruktur, Stil und Filterlogik bleiben identisch.
- Keine Änderung am Detail-View, an Suche/Filtern oder anderen Bereichen.