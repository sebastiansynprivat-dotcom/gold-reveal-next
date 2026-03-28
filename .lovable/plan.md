

# Schritte 2–4: Backend-Logik + Master-Dashboard + Sub-Admin Dashboard

## Analyse

Das aktuelle `AdminDashboard.tsx` ist eine 6.500-Zeilen-Datei, die direkt `supabase.from("accounts").select("*")` aufruft – ohne Rollenprüfung. Es gibt nur eine Route `/admin`, die von `AdminProtectedRoute` geschützt wird (prüft nur 2FA, nicht ob super_admin vs. sub_admin). Die RLS-Policies auf DB-Ebene filtern bereits korrekt (super_admin sieht alles, sub_admin sieht nur zugewiesene Accounts via `can_access_account()`).

## Kernentscheidung

Da RLS bereits auf DB-Ebene greift, brauchen wir **keine separate Edge Function** als "Türsteher". Die Supabase-Queries im Frontend werden automatisch gefiltert. Was wir brauchen:

1. **Frontend-seitige Rollenerkennung** – damit wir UI-Elemente ausblenden können
2. **Geteiltes Dashboard** – beide Rollen nutzen dasselbe `AdminDashboard`, aber Sub-Admins sehen keine Super-Admin-Features

## Plan

### Schritt 2: Backend-Logik (Berechtigungsprüfung)

Die RLS-Policies existieren bereits und filtern korrekt. Ergänzend:

- **Neuer React-Hook `useAdminRole`**: Prüft beim Mount via `supabase.rpc("is_super_admin")` ob der User Super-Admin ist. Gibt `{ isSuperAdmin: boolean, isSubAdmin: boolean, loading: boolean }` zurück.
- Dieser Hook wird im Dashboard verwendet, um UI-Elemente conditional zu rendern.

**Datei:** `src/hooks/useAdminRole.ts`

### Schritt 3: Master-Dashboard anpassen

Das bestehende `AdminDashboard.tsx` wird erweitert:

- **Hook einbinden**: `useAdminRole()` am Anfang der Komponente aufrufen.
- **Sub-Admin Account-Zuweisungs-UI** im bestehenden Admin-Management-Bereich: Ein neues Panel, in dem Super-Admins Sub-Admins erstellen und ihnen Accounts zuweisen/entziehen können. Komponenten:
  - `SubAdminManager.tsx`: Liste aller Sub-Admins mit ihren zugewiesenen Accounts
  - Multi-Select Dialog: Accounts einem Sub-Admin zuweisen (Insert in `admin_account_access`)
  - Entziehen-Button: Löscht Einträge aus `admin_account_access`
- **Conditional Rendering**: Bereiche wie "Admins verwalten", "Account Pools", "Freie Accounts", "Offer-Verteilung" werden nur für Super-Admins angezeigt.

### Schritt 4: Sub-Admin View

Da RLS die Filterung übernimmt, sieht ein Sub-Admin automatisch nur "seine" Accounts wenn er `supabase.from("accounts").select("*")` aufruft. Daher:

- **Gleiche Route `/admin`**, gleiche Komponente
- **`isSuperAdmin === false`** blendet aus:
  - Admin-Verwaltung (Admins hinzufügen/entfernen)
  - Account-Pool-Verwaltung (Accounts anlegen/löschen)
  - Offer-Verteilung (quiz_routes)
  - Sub-Admin-Zuweisungen
  - Account-Löschung und Freigabe
- **Sub-Admin sieht**:
  - Seine zugewiesenen Accounts (automatisch durch RLS)
  - Chatter-Übersicht (nur für seine Accounts)
  - Revenue-Daten (nur für seine Accounts)
  - Bot-Messages verwalten (nur für seine Accounts)

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/useAdminRole.ts` | Hook für Rollenprüfung |
| `src/components/SubAdminManager.tsx` | UI zum Zuweisen von Accounts an Sub-Admins |

### Änderungen an bestehenden Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/AdminDashboard.tsx` | `useAdminRole` einbinden, conditional rendering für ~15 Bereiche |
| `src/App.tsx` | `AdminProtectedRoute` prüft zusätzlich ob `is_admin()` (sub_admin oder super_admin) |
| `supabase/functions/admin-manage/index.ts` | Sub-Admin-Erstellung mit `sub_admin`-Rolle statt `super_admin` |

### Berechtigungsmatrix

```text
Feature                    | Super-Admin | Sub-Admin
---------------------------|-------------|----------
Alle Accounts sehen        |     ✓       |    ✗ (nur zugewiesene)
Accounts anlegen/löschen   |     ✓       |    ✗
Accounts zuweisen          |     ✓       |    ✗
Chatter verwalten          |     ✓       |    ✓ (nur eigene)
Revenue einsehen           |     ✓       |    ✓ (nur eigene)
Bot-Messages               |     ✓       |    ✓ (nur eigene)
Admins verwalten           |     ✓       |    ✗
Sub-Admin Zuweisungen      |     ✓       |    ✗
Offer-Verteilung           |     ✓       |    ✗
Push-Benachrichtigungen    |     ✓       |    ✗
```

