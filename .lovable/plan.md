## Ziel
Auf der Registrierungs-Seite (`/auth`) direkt unter dem Gruppennamen-Feld ein neues Eingabefeld für die **Telegram-ID** hinzufügen – inklusive ausklappbarem Hilfe-Link „Wo finde ich meine Telegram-ID?".

## Änderungen in `src/pages/Auth.tsx`

1. **Neuer State**
   - `telegramId` (string)
   - `showTelegramHelp` (boolean)

2. **Neues Eingabefeld** direkt unter dem Gruppennamen-Block (nur bei `isSignUp`)
   - Gleicher Glass-Stil wie Gruppenname (`input-gold-shimmer rounded-xl` + `inputClass`)
   - Placeholder: `Telegram-ID (z. B. 123456789)`
   - `inputMode="numeric"`, Pflichtfeld
   - Darunter Toggle-Button „Wo finde ich meine Telegram-ID?" (gleicher Stil wie Gruppennamen-Hilfe)
   - Aufgeklapptes Hilfepanel mit Kurzanleitung:
     - Telegram öffnen → Bot **@userinfobot** starten → sendet automatisch die numerische ID zurück
     - Externer Link `https://t.me/userinfobot` (öffnet in neuem Tab)
     - Hinweis: nur Zahlen, kein @username

3. **Validierung in `handleSubmit`** (nur bei Signup)
   - Pflichtfeld, muss aus Ziffern bestehen (min. 5 Stellen)
   - Bei Fehler: passende Fehlermeldung

4. **Speicherung**
   - Vor `signUp`: `localStorage.setItem("pending_telegram_id", telegramId)`
   - Der bestehende Post-Auth-Sync (Zeile 104–115) übernimmt die ID dann automatisch ins Profil – keine weitere Logik nötig.

## Nicht geändert
- Kein DB-Schema-Change (Spalte `telegram_id` existiert bereits im Profil)
- Keine anderen Seiten/Flows
- Login-Modus unverändert
