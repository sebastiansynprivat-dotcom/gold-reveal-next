
## Plan: Nur geöffneten Ordner anzeigen (Accounts verwalten)

### Problem
Wenn man im "Accounts verwalten"-Dialog in einen Ordner navigiert (z.B. BreadSys), werden darunter weiterhin andere Plattformen/Projekte angezeigt.

### Lösung
In `src/pages/AdminDashboard.tsx` (Zeilen ~4642-4741): Wenn `reassignOpenFolder` gesetzt ist und mit dem aktuellen Platform-Key beginnt (`${p}::`), die Iteration über andere Plattformen überspringen — also ein `continue` für alle Plattformen, deren Key nicht dem geöffneten Ordner entspricht.

Konkret: In der `manualPlatforms.map()`-Schleife (Zeile ~4642) prüfen, ob `reassignOpenFolder` gesetzt ist. Falls ja, nur die Plattform rendern, deren Prefix matcht. Alle anderen Plattformen werden ausgeblendet, bis der User "Zurück" klickt.

### Dateien
- `src/pages/AdminDashboard.tsx` — kleine Änderung in der Render-Logik der "Freie Accounts"-Sektion (~2 Zeilen hinzufügen)
