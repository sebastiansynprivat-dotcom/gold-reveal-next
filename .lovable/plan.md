

## Plan: Sub-Admin Chatter-Isolation

### Ziel
Sub-Admins sehen nur ihre eigenen Chatter und können neue anlegen. Super-Admins sehen alle Chatter und erkennen, welchem Sub-Admin sie gehören.

### Änderungen

**1. Datenbank-Migration**
- Neue Spalte `created_by UUID` auf der `chatters`-Tabelle (nullable, damit bestehende Daten nicht brechen)
- Bestehende Chatters ohne `created_by` bleiben dem Super-Admin zugeordnet
- RLS-Policies anpassen:
  - Super-Admins: voller Zugriff (ALL) — bleibt
  - Sub-Admins: SELECT/INSERT/UPDATE/DELETE nur wo `created_by = auth.uid()`

**2. Frontend: ChatterDashboardTab.tsx**
- Beim Erstellen eines Chatters `created_by` auf die aktuelle User-ID setzen
- Laden: Query bleibt gleich (RLS filtert automatisch)

**3. Frontend: AdminDashboard.tsx (Super-Admin Ansicht)**
- Im Mitarbeiter-Tab: Anzeige eines kleinen Badges oder Labels, welcher Admin den Chatter erstellt hat
- Dazu den `created_by`-Wert mit der Admin-Liste abgleichen, um den Namen/E-Mail anzuzeigen

### Technische Details

```sql
-- Migration
ALTER TABLE public.chatters ADD COLUMN created_by uuid;

-- Update existing RLS: replace current "Admin full access" with split policies
DROP POLICY "Admin full access on chatters" ON public.chatters;

-- Super-admins keep full access
CREATE POLICY "Super admins full access on chatters"
ON public.chatters FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Sub-admins only own chatters
CREATE POLICY "Sub admins manage own chatters"
ON public.chatters FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'sub_admin') AND created_by = auth.uid());
```

Frontend insert change:
```typescript
const row = {
  ...existingFields,
  created_by: (await supabase.auth.getUser()).data.user?.id,
};
```

