## Ziel

Chatter sehen im Dashboard direkt über dem Bereich "Custom-Anfragen" einen neuen Button **"Steckbrief"**. Klick öffnet ein Pop-up (Dialog) mit allen ausgefüllten Steckbrief-Feldern des zugewiesenen Models. Falls noch kein Steckbrief existiert, zeigt das Pop-up einen freundlichen Hinweis.

## Sichtbarkeit & Logik

- Button erscheint nur, wenn dem Chatter mindestens ein Account zugewiesen ist, der eine `model_id` hat.
- Bei mehreren Accounts mit unterschiedlichen Models: Im Pop-up oben kleiner Tab-Switcher (Model-Name) — meist hat ein Chatter aber 1 Model.
- Read-only (Chatter können nichts bearbeiten).
- Sprache fest auf Deutsch im Chatter-Dashboard (Labels wie im Steckbrief-Formular auf Deutsch).

## UI

- Neuer Block in `src/pages/Dashboard.tsx` direkt vor dem Custom-Anfragen-Block (`{/* Anfrage an das Model */}`).
- Stil: glass-card-Zeile mit Icon (`UserCircle` o. ä.), Titel **"Steckbrief deines Models"**, Untertitel "Alle wichtigen Infos auf einen Blick", rechts Chevron/„Öffnen"-Button.
- Pop-up: vorhandenes `Dialog`-Component, scrollbar, gruppiert in Sektionen:
  - Allgemein (Name, Alter, Stadt, Geburtsort, Beruf, Sprachen, Ausbildung)
  - Aussehen (Größe, Gewicht, Haare, BH-/Schuhgröße, besondere Merkmale)
  - Persönliches (Hobbys, Lieblingsfilm, -essen, -musik, -farbe, Traum)
  - Content (Vorlieben, No-Gos, Zusatzinfos)
- Leere Felder werden im Pop-up als "—" angezeigt oder ausgeblendet.

## Datenfluss

- `accounts`-Query in Dashboard.tsx erweitern: zusätzlich `model_id` selecten.
- Neuer State `modelProfile` + Fetch: `supabase.from("model_profiles").select("*").eq("model_id", <id>).maybeSingle()`.

## Backend / RLS

Aktuelle RLS auf `model_profiles` erlaubt nur Admins und das Model selbst. Chatter müssen lesen können, sofern sie einem Account mit dieser `model_id` zugewiesen sind. Neue zusätzliche SELECT-Policy:

```sql
CREATE POLICY "Assigned chatters can view model profile"
ON public.model_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.assigned_to = auth.uid()
      AND a.model_id = model_profiles.model_id
  )
);
```

## Geänderte/neue Dateien

- `src/pages/Dashboard.tsx` — Button + Dialog + Profile-Fetch, `model_id` zur Account-Query hinzufügen.
- Neu: `src/components/ModelProfileViewDialog.tsx` — read-only Anzeige mit Sektionen.
- Neue Migration für die zusätzliche RLS-Policy auf `model_profiles`.

Soll ich es so umsetzen?