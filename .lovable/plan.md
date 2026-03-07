

## Plan: Model-Liste mit Filter & Klick-Auswahl

### Änderungen in `src/components/ModelDashboardTab.tsx`

**1. Alle model_dashboard-Daten laden**
- Beim Mount alle `model_dashboard`-Einträge fetchen (nicht nur für das ausgewählte Model), um den Submitted-Status jedes Models zu kennen.
- Accounts mit ihrem jeweiligen `fourbased_submitted`-Status zusammenführen.

**2. Filter-Buttons oben (Alle / Submitted / Nicht Submitted)**
- Drei Buttons direkt unter dem Dropdown: "Alle", "Submitted", "Nicht Submitted"
- Filtern die Model-Liste darunter basierend auf dem `fourbased_submitted`-Wert aus `model_dashboard`.
- Models ohne Eintrag in `model_dashboard` gelten als "Nicht Submitted".

**3. Model-Liste als Karte unterhalb des Dropdowns**
- Neue Karte "Alle Models" mit einer scrollbaren Liste aller (gefilterten) Accounts.
- Jeder Eintrag zeigt: Email, Domain, Platform, und ein Badge (Submitted / Nicht Submitted).
- Klick auf einen Eintrag setzt `selectedAccountId` und scrollt/zeigt die Detail-Ansicht darunter (gleiche Ansicht wie bisher).

**4. Ablauf**
- Dropdown bleibt als Schnellauswahl erhalten.
- Darunter: Filter-Buttons + Model-Liste-Karte.
- Darunter: Detail-Ansicht des ausgewählten Models (wie bisher).

### Keine DB-Änderungen nötig
Alle Daten sind bereits in `model_dashboard` vorhanden.

