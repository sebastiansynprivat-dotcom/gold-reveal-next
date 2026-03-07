

## Plan: Unterordner in Chatter-Übersicht anzeigen

### Was wird geändert

**1. Query erweitern** (`loadAssignments`, Zeile 915)
- `folder_name` und `subfolder_name` zum Select hinzufügen:
  `select("*, accounts(account_email, account_domain, platform, folder_name, subfolder_name)")`

**2. Chatter-Übersicht UI** (`ChatterOverviewTab`, Zeilen 306-340)
- In der Account-Header-Zeile (Zeile 307-319) den `folder_name` und `subfolder_name` als kleine Badges anzeigen, z.B. `📁 Ordner › Unterordner`
- In den einzelnen Chatter-Einträgen (Zeile 322-338) ebenfalls den Unterordner-Pfad als Badge anzeigen, falls vorhanden

### Technische Details

- Keine DB-Änderungen nötig — `subfolder_name` und `folder_name` existieren bereits auf `accounts`
- Nur zwei Stellen in `AdminDashboard.tsx` betroffen: die Query und die Render-Logik in `ChatterOverviewTab`
- Ordner/Unterordner werden als kompakte Badges dargestellt (z.B. `📁 MeinOrdner › SubOrdner`)

