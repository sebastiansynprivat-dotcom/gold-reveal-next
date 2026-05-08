## Ziel
Im Admin Mitarbeiter-Dashboard (Tab "Mitarbeiter-Dashboard") werden auf dem Handy keine Mitarbeiter-Namen mehr angezeigt, weil das Tabellen-Grid zu breit ist. Layout für Mobile clean machen, alles lesbar.

## Problem
Datei `src/components/ChatterDashboardTab.tsx`, ab Zeile 405 — Liste nutzt:
```
grid-cols-[1fr_80px_80px_80px_80px_32px]
```
Das ergibt ~352px feste Spalten. Bei einem Viewport von ~375px bleibt für den Namen nur ein Stummel — Name + Sub-Label werden komplett abgeschnitten.

## Änderung
Datei: `src/components/ChatterDashboardTab.tsx`

Für die Mitarbeiter-Liste eine **Mobile-First Doppel-Darstellung** einführen:

- **Mobile (< sm):**
  - Tabellen-Header ausblenden (`hidden sm:grid`).
  - Jede Zeile als kompakte Karte:
    - Obere Zeile: Name (truncate, fett) + Verdienst rechts (gold, tabular-nums).
    - Untere Zeile: kleine Badges (Plattform, Rolle) + Gesamt-Umsatz dezent + Trash-Icon ganz rechts.
  - Klick-Verhalten (Auswahl + Scroll-to-Detail) bleibt identisch.
- **Desktop (≥ sm):**
  - Bestehendes Grid `1fr_80px_80px_80px_80px_32px` bleibt unverändert.

Konkret: Header-Div bekommt `hidden sm:grid`, Row-Container wird ein konditionaler Wrapper `sm:grid sm:grid-cols-[1fr_80px_80px_80px_80px_32px]` + auf Mobile `flex flex-col gap-1 p-3`. Innerhalb der Row werden die einzelnen Zellen mit `hidden sm:flex` / `sm:hidden` gesteuert, damit auf Mobile die kompakte Karten-Variante und auf Desktop die Tabellen-Zellen sichtbar sind.

Falls der "Gewerblich"-Sub-Label unter dem Namen (`↳ admin@…`) für Super-Admins angezeigt wird, bleibt er erhalten, kommt aber jetzt vollständig sichtbar unter dem Namen (`truncate` statt abgeschnitten in 23px Spalte).

## Nicht-Änderungen
- Daten, Filter, Such-, Add-, Delete-Logik unverändert.
- Detail-View und übrige Sektionen unverändert.
- Desktop-Layout bleibt 1:1 wie heute.