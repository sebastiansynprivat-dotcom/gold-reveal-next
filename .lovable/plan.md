

# Multi-Dashboard RBAC System – Datenbankschema

## Ist-Zustand

- `app_role` Enum: `admin`, `moderator`, `user`, `model`
- `user_roles` Tabelle: einfache User→Role Zuordnung
- Ein einziges Admin-Dashboard (`/admin`) – alle Admins sehen alles
- Accounts werden Usern zugewiesen (`accounts.assigned_to`), aber es gibt keine Zuweisungslogik "welcher Admin darf welche Accounts sehen"

## Ziel-Architektur

**Drei Rollen-Ebenen:**
1. **Super-Admin** (du als Inhaber) – sieht und verwaltet ALLES
2. **Sub-Admin** (Mitarbeiter) – sieht nur die Accounts, die ihm explizit zugewiesen wurden
3. Bestehende Rollen (`user`, `model`) bleiben unverändert

**Kernprinzip:** Single Source of Truth – alle Daten leben in denselben Tabellen. Sub-Admin-Dashboards sind gefilterte Views, keine eigenen Datenspeicher.

## Datenbankänderungen

### 1. Enum erweitern
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sub_admin';
```

Bestehende `admin`-Rolle wird zu `super_admin` migriert (für deine Accounts).

### 2. Neue Tabelle: `admin_account_access` (Many-to-Many)
```sql
CREATE TABLE public.admin_account_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_user_id, account_id)
);
```

Diese Tabelle definiert: **"Welcher Sub-Admin darf welchen Account sehen/verwalten?"** Nur Super-Admins können Einträge hinzufügen/entfernen.

### 3. RLS-Policies aktualisieren

Die zentrale Berechtigungslogik auf der `accounts`-Tabelle wird erweitert:

```text
Super-Admin  →  sieht ALLE Accounts (wie bisher)
Sub-Admin    →  sieht nur Accounts, die in admin_account_access stehen
```

Neue Security-Definer-Funktion:
```sql
CREATE FUNCTION can_access_account(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    has_role(p_user_id, 'super_admin') 
    OR EXISTS (
      SELECT 1 FROM admin_account_access 
      WHERE admin_user_id = p_user_id AND account_id = p_account_id
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Alle relevanten Tabellen (`accounts`, `account_assignments`, `daily_revenue`, `chatters`, etc.) erhalten aktualisierte RLS-Policies, die `can_access_account()` nutzen.

### 4. Bestehende Admins migrieren
```sql
-- Bestehende 'admin'-Rollen zu 'super_admin' upgraden
UPDATE user_roles SET role = 'super_admin' WHERE role = 'admin';
```

Die `is_admin()`-Funktion wird angepasst, sodass sie sowohl `super_admin` als auch `sub_admin` erkennt (für generelle Admin-Berechtigung), aber separate Funktionen für die Unterscheidung bereitstehen.

### 5. Übersicht der Berechtigungsabfrage

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│  user_roles  │     │ admin_account_access │     │ accounts │
│─────────────│     │──────────────────────│     │──────────│
│ user_id     │────▶│ admin_user_id        │────▶│ id       │
│ role        │     │ account_id           │     │ platform │
│ (super_admin│     │ granted_by           │     │ ...      │
│  sub_admin) │     └──────────────────────┘     └──────────┘
└─────────────┘

Query-Logik:
- Super-Admin: SELECT * FROM accounts (kein Filter)
- Sub-Admin:   SELECT * FROM accounts 
               WHERE id IN (SELECT account_id FROM admin_account_access 
                            WHERE admin_user_id = auth.uid())
```

## Was NICHT in Schritt 1 enthalten ist
- Frontend-Code (Dashboards, UI)
- Sub-Admin-Erstellungs-Interface
- Account-Zuweisungs-UI im Master-Dashboard

Diese kommen in den Folge-Schritten, nachdem das Schema steht und bestätigt ist.

## Zusammenfassung der DB-Objekte

| Objekt | Typ | Zweck |
|--------|-----|-------|
| `super_admin`, `sub_admin` | Enum-Werte | Neue Rollen |
| `admin_account_access` | Tabelle | Many-to-Many: Admin ↔ Account |
| `can_access_account()` | Funktion | Zentrale Berechtigungsprüfung |
| `is_admin()` | Update | Erkennt beide Admin-Rollen |
| RLS auf `accounts` etc. | Policies | Filtern nach Berechtigung |

