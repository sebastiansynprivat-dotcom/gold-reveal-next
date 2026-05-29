## Ziel
Wenn ein Model im Admin Dashboard auf **inaktiv** gesetzt wird, soll dieser Status automatisch für **alle Plattform-Accounts** des Models gelten – sodass keine Chatter mehr Anfragen stellen oder das Model bearbeiten können.

## Aktuelle Situation
- `models.model_active` (Model-Ebene) und `accounts.model_active` (Account-Ebene) sind getrennt.
- Das Toggle im Admin ändert nur `models.model_active`.
- Die Chatter-UI prüft `accounts.model_active` → daher hat das Admin-Toggle aktuell **keinen Effekt**.

## Lösung

### 1. Datenbank-Trigger (Migration)
Trigger auf `models` (AFTER UPDATE OF model_active):
- Bei Änderung von `models.model_active` → alle `accounts` mit `model_id = NEW.id` auf denselben Wert setzen.
- Damit werden Bestandsdaten und zukünftige Änderungen automatisch synchron gehalten.

### 2. Einmalige Datensynchronisation
Initiales Update, um bestehende Diskrepanzen zu beseitigen:
```sql
UPDATE accounts SET model_active = m.model_active
FROM models m WHERE accounts.model_id = m.id AND accounts.model_active <> m.model_active;
```

### 3. Admin Dashboard UI
- Beim Toggle des Model-Status: kurzer Hinweis-Toast „Status gilt jetzt für alle X Plattformen dieses Models".
- Keine zusätzliche Logik nötig – der DB-Trigger erledigt die Kaskade.

## Nicht im Scope
- Manuelle Accounts ohne `model_id` bleiben unberührt (haben kein zugeordnetes Model).
- Das einzelne Deaktivieren eines Accounts bleibt weiterhin möglich (wird beim nächsten Model-Update jedoch überschrieben).

## Geänderte Dateien
- Neue Migration (Trigger + initiales Sync-Update)
- `src/pages/AdminDashboard.tsx` (Toast-Hinweis beim Toggle)
