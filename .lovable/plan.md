

## Plan

### 1. Entfernen
- **Pool-Suche** entfernen: State `mainPoolSearch`, das Such-Input und die Filter-Logik im Account-Pools-Bereich (ca. Zeilen 1880-1896)
- **Plattform-Suche** entfernen: State `mainManualSearch`, das Such-Input und die Filter-Logik im Freie-Accounts-Bereich (ca. Zeilen 1980-1996)

### 2. Hinzufügen: Account-Suche innerhalb einer Plattform (Freie Accounts)
- Neuen State `manualAccountSearch` hinzufügen
- Im Manual Platform Dialog, innerhalb der **Ordner-Innenansicht** (Zeile ~4720, vor der Account-Liste), ein Suchfeld einfügen
- Die `folderAccs`-Liste zusätzlich nach `account_email` und `account_password` filtern basierend auf dem Suchbegriff
- State beim Schliessen des Dialogs und beim Zurück-Navigieren zurücksetzen

### Technisch
- Alle Änderungen in `src/pages/AdminDashboard.tsx`
- Bestehende Patterns (Search-Icon + Input) wiederverwenden

