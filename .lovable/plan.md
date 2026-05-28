# Model-Biographie im Chatter-Dashboard anzeigen

Ziel: Beim Chatter wird automatisch die `Biographie.docx` aus dem Drive-Ordner des zugewiesenen Models geladen, in HTML umgewandelt und im Dashboard angezeigt.

## Architektur

```text
Chatter Dashboard
   │  account_id → model_id → models.drive_folder_id
   ▼
Edge Function: get-model-biography
   ├─ Cache-Check (model_biographies Tabelle)
   ├─ Google Drive API (Service Account, reuse share-drive auth)
   │     1. Datei in Folder suchen: name contains 'iograph' AND mimeType=docx
   │     2. Datei downloaden (alt=media)
   ├─ docx → HTML (mammoth via esm.sh)
   └─ Cache speichern + HTML zurückgeben
```

## Datenbank

Neue Tabelle `public.model_biographies` (Cache):
- `model_id uuid PK` (FK → models.id, on delete cascade)
- `drive_file_id text`
- `file_name text`
- `html text` (gerendertes HTML)
- `fetched_at timestamptz`
- `modified_time timestamptz` (Drive `modifiedTime` – für Invalidierung)

GRANTs + RLS:
- `SELECT` für `authenticated` (alle eingeloggten User dürfen Biografien des Models lesen, dem sie zugewiesen sind – Policy: User hat einen `accounts`-Eintrag mit `model_id = model_biographies.model_id`, oder ist Admin via `has_role`)
- `ALL` für `service_role` (Edge Function schreibt Cache)

## Edge Function `get-model-biography`

Input: `{ model_id: string, force_refresh?: boolean }`
Logik:
1. Auth-Check via JWT (chatter muss diesem Model zugewiesen sein, oder Admin).
2. Cache lesen. Wenn `fetched_at` < 6 h und nicht `force_refresh` → cached HTML zurückgeben.
3. `drive_folder_id` aus `models` holen. Wenn leer → 404.
4. Service Account Token holen (gleicher Code wie `share-drive` – in `_shared/google.ts` extrahieren).
5. `GET drive/v3/files?q='{folderId}' in parents and name contains 'iograph' and trashed=false&fields=files(id,name,mimeType,modifiedTime)` → erste passende Datei.
6. Wenn `modifiedTime` == Cache-Wert → Cache zurückgeben (kein Re-Download).
7. Download `GET drive/v3/files/{id}?alt=media` → ArrayBuffer.
8. Mammoth (`https://esm.sh/mammoth@1.6.0`) → HTML.
9. In `model_biographies` upserten.
10. Response: `{ html, file_name, modified_time, fetched_at, source: 'cache' | 'drive' }`.

Fehlerfälle: keine Datei gefunden → `{ html: null, reason: 'not_found' }` (UI zeigt Hinweis).

`verify_jwt = true` (Standard) – nutzt User-JWT für RLS-Check, plus Service Role Client für DB-Write (Dual-Client-Pattern wie in `edge-function-auth-pattern`).

## Frontend – Chatter Dashboard

Neue Komponente `src/components/ModelBiographyCard.tsx`:
- Props: `modelId`
- Lädt via `supabase.functions.invoke('get-model-biography', { body: { model_id } })`.
- Glass-card im Stil von ModelHomeDashboard (Black & Gold, dezent gold-bordered).
- Header: „Steckbrief · {model_name}" + Refresh-Icon-Button (force_refresh).
- Body: HTML in scrollbarem Container (`max-h-[60vh]`, `prose prose-invert` Styling, Tabellen-Styles für die Personal-Info-Tabelle).
- States: loading skeleton, leer („Noch keine Biographie hochgeladen"), error.

Einbindung in `src/components/ChatterDashboardTab.tsx` (oder dem Dashboard, wo das aktuell zugewiesene Model sichtbar ist):
- Für jeden zugewiesenen Account mit `model_id` einmal die Karte rendern (collapsible, default zu für Übersicht; öffnet sich on click und lädt dann lazy).
- Platzierung: unter den Account-Credentials, vor der Revenue-Sektion.

Lazy loading: Fetch erst beim ersten Aufklappen, damit Dashboard schnell bleibt.

## Sicherheit

- RLS verhindert, dass Chatter Biografien fremder Models sehen.
- Edge Function prüft zusätzlich serverseitig die Zuweisung (Chatter ↔ Account ↔ Model) bevor sie das HTML zurückgibt.
- Drive-Token bleibt serverseitig; Client bekommt nur sanitisiertes HTML.

## Out of Scope (nicht in diesem Schritt)
- Preisliste / Content-Ordner anzeigen (Bild zeigt zusätzlich „Preisliste!" und „Content"-Ordner – nur auf Anfrage nachziehen).
- Editieren der Biographie durch den Chatter.
- Auto-Sync per Drive-Webhook (statt 6-h-TTL).
