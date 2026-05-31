## Ziel
Sub-Admins sollen im Admin-Dashboard ebenfalls Push-Benachrichtigungen aktivieren und ihre Präferenzen verwalten können – aktuell sehen nur Super-Admins den Tab.

## Hintergrund
- In `src/pages/AdminDashboard.tsx` (Zeile 3388) ist `"push_settings"` Teil von `SUPER_ADMIN_TABS`, daher wird der Tab für Sub-Admins ausgeblendet.
- Die Edge Function `send-admin-push` versendet bereits an alle Rollen (`admin`, `super_admin`, `sub_admin`) und respektiert `admin_notification_preferences` pro User – serverseitig ist also alles vorbereitet.

## Änderung
1. `"push_settings"` aus dem `SUPER_ADMIN_TABS`-Set entfernen, damit der Tab „Push-Benachrichtigungen" auch für Sub-Admins sichtbar ist.
2. Alle anderen super-admin-exklusiven Tabs (Benachrichtigungs-Verwaltung, KI Prompt, Google Drive, Einstellungen, Admin-Verwaltung, Fanvue, Model-Dashboard) bleiben unverändert super-admin-only.

## Nicht im Scope
- Keine Änderung am Tab „Benachrichtigungen" (= Versand-/Template-Verwaltung), der bleibt super-admin-only.
- Keine RLS- oder Edge-Function-Änderungen nötig.