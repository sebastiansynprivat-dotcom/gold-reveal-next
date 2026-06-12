## Ziel
Die Edge Function `update-profile-names` soll neben `name` auch ein optionales Feld `start_date` akzeptieren und beim Matching-Update in `profiles` mitsetzen.

## Aktueller Zustand
Die Function erwartet Payloads mit `telegram_id` + `name`, matched Profile per normalisierter Telegram-ID und updated nur das `name` Feld. Das `profiles`-Schema enthält bereits eine `start_date` Spalte.

## Änderungen

### 1. Schema-Erweiterung
Erweitere das Item-Schema um ein optionales `start_date`:
- `telegram_id`: string (required)
- `name`: string (required)
- `start_date`: string (optional, ISO-Date-Format)

### 2. Update-Logik
Baue das Update-Objekt dynamisch:
- `name` wird immer gesetzt (wie bisher)
- `start_date` wird nur gesetzt, wenn es im Payload vorhanden und nicht leer ist

```
const updatePayload: Record<string, unknown> = { name: item.name };
if (item.start_date) updatePayload.start_date = item.start_date;
```

### 3. Rückgabewert
Ergebnisobjekt bleibt gleich (`telegram_id`, `updated`, optional `error`). Kein Breaking Change für bestehende Aufrufer, die nur `name` senden.

## Technische Details
- Sprache/Runtime: Deno (Edge Function)
- Datei: `supabase/functions/update-profile-names/index.ts`
- Auth: Unverändert (`x-api-key` gegen `ACCOUNTS_SECRET_KEY`)
- Keine Schema-/Migrations-Änderung nötig (`start_date` existiert bereits in `profiles`)