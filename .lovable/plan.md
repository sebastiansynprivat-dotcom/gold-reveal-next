# Admin Push-Benachrichtigungen

Ziel: Im Admin-Dashboard eine eigene Sektion „Push-Benachrichtigungen" in der Sidebar, in der du Pushes auf deinem Gerät aktivierst (PWA-Install-Hinweis inklusive) und auswählst, wofür du benachrichtigt werden willst. Sobald aktiv, bekommst du automatisch eine Push, wenn eine neue Model-Anfrage reinkommt oder eine neue Einnahme verbucht wird.

## Was neu gebaut wird

**1. Sidebar-Sektion „Push-Benachrichtigungen" (Admin-Dashboard)**
- Status-Karte: zeigt, ob Pushes auf diesem Gerät aktiv sind
- Button „Auf diesem Gerät aktivieren" → triggert Permission + Subscription
- Hinweis-Karte „Zum Home-Bildschirm hinzufügen" (iOS-/Android-Anleitung), damit Pushes auch wirklich ankommen wenn die App nicht offen ist
- Toggle-Liste mit den Event-Typen:
  - Neue Model-Anfrage
  - Neue Einnahme (Revenue-Eingang)
  - (vorbereitet, leicht erweiterbar: neue Registrierung, neue Auszahlung etc.)
- Test-Push-Button, damit du direkt prüfen kannst dass es ankommt

**2. Persistente Einstellungen pro Admin**
Neue Tabelle `admin_notification_preferences` (user_id + Bool-Flags je Event). RLS: Admin liest/schreibt nur eigene Zeile, Service-Role voll.

**3. Automatische Pushes**
- Neuer interner Helper `send-admin-push` (Edge Function) der nur an Admins pusht, deren Preference für das jeweilige Event aktiviert ist.
- Trigger-Punkte:
  - **Neue Anfrage:** im Client direkt nach erfolgreichem Insert in `model_requests` (ModelRequestDialog) wird `send-admin-push` mit Event `new_request` aufgerufen.
  - **Neue Einnahme:** in der Edge Function `ingest-revenue` nach erfolgreichem Upsert wird `send-admin-push` mit Event `new_revenue` (+ Betrag/Plattform im Body) aufgerufen.

## Technische Details

- DB-Migration:
  - `admin_notification_preferences(user_id uuid PK refs auth.users, new_request bool default true, new_revenue bool default true, updated_at)`
  - GRANTs + RLS (`auth.uid() = user_id` für Select/Insert/Update, `service_role` full)
- Edge Function `send-admin-push`:
  - Input: `{ event: 'new_request' | 'new_revenue', title, body, url? }`
  - Liest Admin-User-IDs via `user_roles` (admin/super_admin/sub_admin) ∩ preferences mit Flag=true, holt deren `push_subscriptions`, sendet Webpush (wie bestehende `send-notification`).
  - Wird via `supabase.functions.invoke` aufgerufen, kein Auth nötig (verify_jwt=false), aber durch interne Service-Role-Logik geschützt.
- Client:
  - Neue Komponente `src/components/admin/AdminPushSettings.tsx` (Status, Aktivieren, Preferences-Toggles, Test).
  - Nutzt bestehendes `subscribeToPush()` aus `src/lib/pushNotifications.ts`.
  - Einbau in `AdminDashboard.tsx` als neue Sektion in der linken Sidebar/Navigation.
  - `ModelRequestDialog.tsx`: nach erfolgreichem Insert `supabase.functions.invoke('send-admin-push', { body: { event: 'new_request', ... }})`.
- `ingest-revenue/index.ts`: nach Upsert für jede neue Zeile einmal `send-admin-push` mit Plattform + Betrag.

## Was nicht geändert wird

- Bestehende Tabellen `push_subscriptions`, `notifications`, `model_requests`, `revenue_report` bleiben strukturell unverändert.
- User-Dashboard-Push-Flow bleibt wie er ist.
