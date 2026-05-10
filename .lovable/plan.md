## Problem

Im "Accounts verwalten"-Dialog (RefreshCw beim Chatter) wird aktuell nur der Bereich **Freie Accounts** (manuell hinzugefügte) gerendert. Die hunderten Accounts aus den **Account-Pools** (`is_manual = false`) werden bereits in `poolAccounts` / `poolPlatforms` berechnet, aber nirgends angezeigt — daher siehst du nur "1 frei".

## Lösung

Im Dialog (`src/pages/AdminDashboard.tsx`, ~Zeile 7886) **oberhalb** der Sektion "Freie Accounts" eine neue Sektion **"Account-Pools"** hinzufügen — analog gestylt, aber mit goldenem statt gelbem Indikator zur Unterscheidung.

### Aufbau

```text
ACCOUNT ZUWEISEN
[Suchfeld]

▸ ● ACCOUNT-POOLS                    [387 verfügbar]
   Maloum  (224)
     [Liste klickbarer Accounts mit Owner-Badge]
   Brezzels (101)
     ...
   4Based (62)
     ...

▸ ● FREIE ACCOUNTS                       [1 frei]
   ...
```

### Verhalten

- Klick auf Pool-Account → `reassignAccount(acc.id)` (existierende Funktion, kann sowohl freie als auch fremd-zugewiesene Accounts übertragen — Bestätigung-Dialog ist schon implementiert)
- Sektion standardmäßig zugeklappt (eigener State `reassignPoolSectionOpen`, existiert bereits laut grep auf Zeile 795)
- Suche filtert beide Sektionen gleichzeitig (Filter bereits in `freeAccs` aktiv)
- Owner-Badge "→ Chatter X" / "frei" wird bereits über `renderAccountList` mitgerendert
- Pool-Accounts haben i.d.R. **keine** `folder_name` → einfache Platform-Gruppierung via `renderAccountList(poolAccounts, platform)` reicht

### Technische Details

- Datei: `src/pages/AdminDashboard.tsx`, Insert nach Zeile 7887 (`<div className="space-y-4">`)
- Neue Sektion nutzt bereits vorhandenes `setReassignPoolSectionOpen` State
- Indikator-Farbe: `bg-accent` (Gold) für Pools vs. `bg-amber-400` (gelb) für Freie Accounts
- Reuse bestehender `renderAccountList(poolAccounts, platform)` Helper

Keine DB-Änderungen, kein neues Backend, rein UI.
