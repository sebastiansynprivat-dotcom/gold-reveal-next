

# Plan: Model Dashboard mit Login & Umsatzübersicht

## Zusammenfassung

Ein neues Dashboard unter `/model` für Models (nicht Chatter), mit eigenem Login-System. Models sehen dort eine Übersicht über die Umsätze, die Chatter auf ihren Accounts generiert haben. Optisch identisch zum Chatter Dashboard.

## Datenbank-Änderungen

1. **Neue Tabelle `model_users`** – Verknüpft einen Auth-User mit einem Account (Model):
   - `id` (uuid, PK)
   - `user_id` (uuid, NOT NULL, references auth.users via convention)
   - `account_id` (uuid, NOT NULL, references accounts)
   - `created_at` (timestamptz)
   - Unique constraint auf `user_id`
   - RLS: Models können nur eigene Zeile lesen; Admins haben vollen Zugriff

2. **Neue Rolle `model`** zum `app_role` Enum hinzufügen – um Model-User von Chattern zu unterscheiden.

3. **RLS-Policies**:
   - `model_users`: SELECT für eigenen user_id, ALL für Admins
   - `daily_revenue`: SELECT-Policy für Models, die Umsätze aller Chatter sehen können, die ihrem Account zugewiesen sind (über `account_assignments` JOIN)
   - `accounts`: SELECT-Policy für Models auf ihren eigenen Account

## Admin-Dashboard Erweiterung

Im bestehenden Model-Dashboard-Tab (oder als neue Sektion):
- Button "Login generieren" pro Account/Model
- Generiert automatisch ein Passwort, erstellt einen Auth-User mit `supabase.auth.admin.createUser()` via Edge Function
- Speichert die Verknüpfung in `model_users`
- Zeigt die generierten Credentials (E-Mail + Passwort) an, damit der Admin sie dem Model schicken kann

**Neue Edge Function `create-model-login`**:
- Empfängt `account_id`, optional `email`
- Erstellt Auth-User mit generiertem Passwort (auto-confirm)
- Fügt `model` Rolle in `user_roles` ein
- Erstellt `model_users` Eintrag
- Gibt Credentials zurück

## Frontend: Model Auth (`/model/login`)

- Eigene Login-Seite (nur Login, kein Signup) im gleichen Gold/Schwarz-Design wie `/auth`
- Kein Gruppenname, keine Telegram-ID
- Nach Login → Redirect zu `/model`

## Frontend: Model Dashboard (`/model`)

Geschützt durch eine `ModelProtectedRoute` (prüft `model` Rolle).

Inhalt (angelehnt an Chatter Dashboard):
- **Header**: Logo + "Model Dashboard" + Account-Name
- **Umsatz-Übersicht** (Stats Cards): 
  - Umsatz gestern (aggregiert von allen Chattern auf diesem Account)
  - Monatsumsatz
  - Gesamtumsatz
  - Eigener Verdienst (basierend auf `revenue_percentage` aus `model_dashboard`)
- **Status-Karte** wie beim Chatter

**Keine** Telegram-ID, kein Gruppenname, keine MassDM, keine Checklist, kein Bonus-Modell, keine Rechnungserstellung, kein Chat.

Die Umsatzdaten werden aus `daily_revenue` aggregiert, gefiltert auf alle `user_id`s, die dem Account des Models zugewiesen sind (via `account_assignments`).

## Routing

```text
/model/login  → ModelLogin (public)
/model        → ModelDashboard (protected, role=model)
```

## Dateien

| Datei | Aktion |
|---|---|
| `supabase/migrations/...` | Neue Tabelle, Enum-Erweiterung, RLS |
| `supabase/functions/create-model-login/index.ts` | Edge Function für Login-Generierung |
| `src/pages/ModelLogin.tsx` | Login-Seite für Models |
| `src/pages/Model.tsx` | Model Dashboard (komplett neu) |
| `src/App.tsx` | Neue Routen + ModelProtectedRoute |
| `src/components/ModelDashboardTab.tsx` | Admin: "Login generieren" Button hinzufügen |

## Technische Details

- Umsatz-Aggregation: DB-Function `get_model_revenue(account_id, date_from, date_to)` die über `account_assignments` → `daily_revenue` jointed
- Verdienst-Berechnung nutzt `model_dashboard.revenue_percentage`
- Passwort-Generierung: Zufälliges 12-Zeichen-Passwort in der Edge Function

