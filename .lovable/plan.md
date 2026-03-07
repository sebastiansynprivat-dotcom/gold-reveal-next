

## Automatische Push-Benachrichtigung bei Account-Zuweisung

### Problem
Der PostgreSQL-Trigger `assign_account_on_offer_update` weist Accounts automatisch zu, sendet aber **keine Push-Benachrichtigung**. Nur die manuelle Admin-Zuweisung über die Edge Function `assign-accounts` löst eine Notification aus.

### Lösung
Eine neue Edge Function erstellen, die vom Frontend nach erfolgreicher Account-Zuweisung (Post-Auth-Flow) aufgerufen wird, um die Push-Benachrichtigung zu senden.

Da der DB-Trigger keine HTTP-Requests machen kann, wird die Benachrichtigung **client-seitig** ausgelöst:

### Schritte

1. **Neue Edge Function `notify-account-assigned`** erstellen
   - Nimmt `user_id` entgegen
   - Prüft ob der User eine Push-Subscription hat
   - Sendet die "Gute Nachrichten 🥳" Push-Nachricht
   - Nutzt Service-Role-Client + VAPID Keys (bereits vorhanden)

2. **Auth.tsx anpassen**
   - Nach dem Post-Auth-Flow (wo bereits auf Account-Zuweisung geprüft wird): wenn ein Account zugewiesen wurde, die neue Edge Function aufrufen
   - Das passiert nach der kurzen Pause, wenn `account_email` im Profil gesetzt ist

3. **Config.toml** erweitern mit der neuen Function

### Technische Details

- Die Edge Function nutzt dasselbe Pattern wie `send-notification`: web-push mit VAPID Keys
- Kein neuer Secret nötig – VAPID Keys sind bereits konfiguriert
- `verify_jwt = false` da der Aufruf aus dem Auth-Flow kommt

