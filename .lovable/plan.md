

## Plan: Model Aktiv/Inaktiv Toggle

### Was wird gebaut
1. **Neues Feld `model_active`** (boolean, default `true`) auf der `accounts`-Tabelle
2. **Admin-Dashboard**: Toggle (Switch) pro Account, um das Model aktiv/inaktiv zu setzen
3. **Chatter-Dashboard**: Wenn das Model inaktiv ist, wird statt dem normalen "Anfrage an das Model stellen"-Button ein deaktivierter Hinweis angezeigt: *"Dein Model kann momentan keine Anfragen entgegennehmen"*. Darunter ein Info-Button, der ein Popup öffnet mit der Erklärung, dass das Model diese Info mitgeteilt hat, es der letzte Stand ist, aber trotzdem gutes Geld im Account verdient werden kann, da Content vorhanden ist.

### Technische Schritte

**1. Datenbank-Migration**
- `ALTER TABLE accounts ADD COLUMN model_active boolean NOT NULL DEFAULT true;`

**2. Admin-Dashboard (`AdminDashboard.tsx`)**
- Bei den Account-Karten (sowohl Pool- als auch manuelle Accounts) einen Switch "Aktiv/Inaktiv" hinzufügen
- Bei Toggle-Änderung: `supabase.from("accounts").update({ model_active }).eq("id", acc.id)`

**3. Chatter-Dashboard (`Dashboard.tsx`)**
- `assignedAccounts`-Typ erweitern um `model_active?: boolean`
- Prüfen ob mindestens ein Account `model_active === false` hat
- Wenn inaktiv: Statt `<ModelRequestDialog>` einen deaktivierten Button zeigen + Info-Button
- Info-Button öffnet ein Dialog mit dem erklärenden Text

**4. ModelRequestDialog bleibt unverändert** -- die Logik wird in `Dashboard.tsx` vor dem Rendern abgefangen.

