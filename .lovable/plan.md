

## Problem

Die Chatter-Übersicht gruppiert aktuell nach Ordnern (folder_name / subfolder_name) mit aufklappbaren Ordner-Karten. Der User will stattdessen nur zwei Karten: **SheX** und **SYN**, gruppiert nach `model_agency`.

## Plan

### ChatterOverviewTab umbauen (src/pages/AdminDashboard.tsx, Zeilen 173-477)

1. **Ordner-Logik entfernen**: `byFolder`, `expandedFolders`, `toggleFolder`, `getFolderStats` und die gesamte Ordner-Hierarchie-Darstellung rauswerfen.

2. **Nach Agency gruppieren**: Statt `byFolder` zwei Gruppen erstellen — `shex` und `syn` — basierend auf `grouped[accId].model_agency`. Jede Gruppe enthält ihre Account-IDs.

3. **Zwei Karten rendern**: Zwei `section`-Karten mit dem bestehenden glass-card-Styling:
   - **SheX**-Karte (immer offen, kein Toggle nötig) mit allen SheX-Accounts und ihren Chatter-Einträgen
   - **SYN**-Karte analog
   - Jede Karte zeigt im Header: Name (SheX/SYN), Anzahl Accounts, Anzahl aktive Chatter

4. **Agency-Filter entfernen**: Da die Trennung jetzt visuell über zwei Karten erfolgt, wird der separate Agency-Filter-Toggle (Alle/SheX/SYN) überflüssig. Die Filter Alle/Aktiv/Inaktiv + Suche bleiben.

5. **Account-Darstellung beibehalten**: Innerhalb jeder Karte werden wie bisher die Accounts mit Email, Domain, Platform, Sprache-Badge und darunter die Chatter-Einträge (Name, Datum, Status, Dauer) angezeigt — nur ohne Ordner-Verschachtelung.

