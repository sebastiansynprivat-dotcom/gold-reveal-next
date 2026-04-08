

# Account-Erstellung aus Chatter-Tab entfernen & im Model-Dashboard erweitern

## Zusammenfassung

Die Account-Erstellung wird komplett aus dem Chatter-Tab (AdminDashboard.tsx) entfernt und nur noch im Model-Dashboard (ModelDashboardTab.tsx) möglich gemacht. Beim Anlegen von Accounts im Model-Dashboard werden zusätzliche Felder abgefragt (Drive Folder ID, Sprache, Agentur, Model aktiv). Die Account-Zuweisung an Chatter bleibt im Chatter-Tab wie bisher bestehen.

---

## Änderungen

### 1. AdminDashboard.tsx — Account-Erstellung entfernen

**Entfernt wird:**
- Das komplette "Neuer Account"-Formular (Domain, E-Mail, Passwort, Drive Folder ID, Sprache, Agentur, Model aktiv, Hinzufügen-Button) aus dem Account-Pool-Dialog
- Die zugehörigen State-Variablen: `newAccEmail`, `newAccPassword`, `newAccDomain`, `newAccDriveFolder`, `newAccLanguage`, `newAccModelActive`, `newAccModelAgency`, `addingAccount`
- Die `addAccount`-Funktion

**Bleibt erhalten:**
- Account-Pool-Ansicht (Liste der bestehenden Accounts pro Plattform)
- Filter (Alle/Frei/Vergeben) und Suche
- Account-Zuweisung an Chatter (assign-accounts)
- Account freigeben, löschen
- Plattform-Übersicht (Kacheln mit Anzahl frei/vergeben)

Das Layout des Pool-Dialogs wird angepasst: Ohne das linke Formular nimmt die Account-Liste die volle Breite ein.

### 2. ModelDashboardTab.tsx — Account-Erstellung erweitern

Beim Hinzufügen von Plattform-Accounts werden pro Plattform zusätzliche Felder abgefragt:
- **Drive Folder ID** (optional, mit URL-Extraktion)
- **Sprache** (DE/EN Toggle)
- **Agentur** (SheX/SYN Toggle)
- **Model aktiv** (Switch, default: true)

Diese Werte werden beim Insert in die `accounts`-Tabelle mitgesendet (`drive_folder_id`, `model_language`, `model_agency`, `model_active`).

Die bestehende Account-Bearbeitung wird ebenfalls um diese Felder ergänzt.

### 3. Keine DB-Änderungen nötig

Die Spalten `drive_folder_id`, `model_language`, `model_agency`, `model_active` existieren bereits auf der `accounts`-Tabelle. Die Verknüpfung mit dem Chatter-Tab funktioniert über `model_id` → `accounts` → `assigned_to` wie bisher.

---

## Technische Details

| Datei | Aktion |
|-------|--------|
| `src/pages/AdminDashboard.tsx` | Entferne ~60 Zeilen Formular-UI, ~30 Zeilen State/Funktionen, passe Pool-Dialog-Layout an (volle Breite) |
| `src/components/ModelDashboardTab.tsx` | Erweitere Add-Account-Dialog und Edit-Account um 4 Felder, update Insert/Update-Logik |

