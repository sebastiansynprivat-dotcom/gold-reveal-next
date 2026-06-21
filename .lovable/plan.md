## Was geändert wird

Die bisherigen Content-Pläne für **Marketer** im Social-Media-Bereich werden auf eine einfache Listen-Logik umgestellt:

- **Keine Tage / Wochen / Tag-1-bis-30-Editor mehr** im Marketer-Tab.
- Admin legt eine **Liste** an (Titel, optionale Beschreibung, beliebig viele Aufgaben) und ordnet ihr **ein oder mehrere Models** zu.
- Marketer sehen pro Model immer **eine aktive Liste**. Sobald alle Aufgaben abgehakt sind, ist die Liste erledigt – und falls Admin bereits eine weitere Liste für dasselbe Model hinterlegt hat, erscheint sie automatisch.
- Wird keine Folgeliste hinterlegt, sieht der Marketer einen freundlichen „Alle Listen abgearbeitet"-Status, bis Admin eine neue erstellt.

Der „Für Models"-Tab im Social-Media-Content-Plans-Bereich bleibt unverändert.

## Neue Tabellen (Backend)

```text
marketer_lists
  id uuid PK
  title text
  description text
  model_id uuid (fanvue_models.id)   -- 1 Liste = 1 Model
  position int                       -- Reihenfolge in der Warteschlange
  status text  ('open' | 'done')
  completed_at timestamptz null
  created_by uuid, created_at timestamptz

marketer_list_items
  id uuid PK
  list_id uuid (marketer_lists.id, cascade)
  position int
  title text
  reference_url text null
  notes text null
  done boolean default false
  done_by uuid null
  done_at timestamptz null
  created_at timestamptz
```

RLS:
- Admin/Super-Admin: voller Zugriff (`is_admin()`).
- Marketer (`socialmedia_marketer`): SELECT auf Listen + Items, deren `model_id` ihm via `marketer_model_assignments` zugewiesen ist; UPDATE nur auf `marketer_list_items.done/done_by/done_at` (zum Abhaken).

Die alte Mechanik (`content_plans.target_type = 'marketer'`, `content_plan_assignments.marketer_user_id`, `content_plan_days`, `content_plan_week_feedback`) bleibt in der DB unverändert – sie wird nur **im UI nicht mehr verwendet**. Kein Datenverlust.

## Admin-UI (`src/pages/SocialMediaContentPlans.tsx`)

Im Tab **„Für Marketer"** wird der bisherige Tages-Editor ersetzt:

- Übersicht: Listen gruppiert nach Model (Suchfeld nach Model-Name/Username). Pro Model: aktive Liste oben, dann Warteschlange, dann erledigte (einklappbar).
- „Neue Liste" Dialog:
  - Titel, Beschreibung
  - Auswahl: Models (Multi-Select, alle Fanvue-Models). Pro gewähltem Model wird **eine eigene Liste** mit denselben Items angelegt (Kopie pro Model).
  - Aufgaben-Editor: einfache Liste mit Titel, optionalem Referenz-Link, optionalen Notizen – Hinzufügen / Entfernen / per Drag-Handle umsortieren.
- Aktionen pro Liste: bearbeiten, duplizieren (in Warteschlange einreihen), löschen.
- Fortschrittsanzeige (`X / Y erledigt`) pro Liste.

Der Tab „Für Models" und die bestehende Tages-Logik dort werden nicht angefasst.

## Marketer-UI (`src/components/MarketerContentPlans.tsx`)

Komplette Umstellung:

- Quelle: `marketer_model_assignments` für den eingeloggten Marketer → daraus die Models bestimmen.
- Für jedes zugewiesene Model: hole `marketer_lists` mit `model_id = X AND status = 'open'`, sortiert nach `position, created_at`. Zeige die **erste** Liste (= aktive). Zusätzlich Hinweis „+N weitere in Warteschlange".
- Items zum Abhaken (Checkbox). Server-Update setzt `done`, `done_by = auth.uid()`, `done_at = now()`.
- Wenn alle Items einer Liste `done = true` sind: Client ruft Edge Function / RPC auf, die `marketer_lists.status = 'done'`, `completed_at = now()` setzt. Anschließend lädt das UI neu und zeigt automatisch die nächste offene Liste für das Model.
- Realtime-Subscription auf `marketer_lists` (für das Model) sodass neu vom Admin hinterlegte Listen sofort erscheinen, sobald die aktuelle erledigt ist.
- Leerzustand pro Model: „Alle Listen abgearbeitet – warte auf neue Vorgaben." mit dezenter Animation.

## Wegfallendes UI

- Im Marketer-Tab des Admin-Bereichs: 30-Tage-Editor, „Tag X"-Akkordeons, Wochen-Feedback-Anzeige bei Marketer-Plänen.
- Im Marketer-Dashboard (`MarketerContentPlans`): Tage, Wochen, Start-Datum-Berechnung, Wochentage.

Die Komponente bleibt im selben Mount-Punkt, sodass nichts im `MarketerDashboard.tsx` umverdrahtet werden muss außer ggf. dem Titel.

## Migration

Eine SQL-Migration erstellt die zwei neuen Tabellen mit GRANTs, RLS und Policies, plus zwei Helper:

- `complete_marketer_list(p_list_id uuid)` – SECURITY DEFINER, prüft Marketer-Zugehörigkeit, setzt `status='done'`.
- Index `(model_id, status, position)` für schnelles „nächste offene Liste".

## Files

- **Neu**: SQL-Migration für `marketer_lists` + `marketer_list_items` + RLS + RPC.
- **Geändert**: `src/pages/SocialMediaContentPlans.tsx` (Marketer-Tab Editor + Listenübersicht).
- **Ersetzt**: `src/components/MarketerContentPlans.tsx` (neue, einfache Listen-Ansicht).
- Keine Änderungen an `SocialMediaModelDashboard.tsx`, `MarketerDashboard.tsx`-Layout, Model-Plänen.

## Offene Frage vor Umsetzung

1. Soll eine Liste **pro Model genau eine Kopie** sein (so wie oben skizziert), oder soll dieselbe Liste mehreren Models zugleich zugeordnet werden (n:m, geteilter Fortschritt nur sinnvoll wenn Marketer pro Model unterschiedlich abhaken)?  
   – Empfehlung: **eine Liste = ein Model** (Kopie pro Model bei Mehrfachauswahl im Dialog). Macht Fortschritt + Warteschlange-Logik glasklar.

Bei Zustimmung setze ich genau das so um.
