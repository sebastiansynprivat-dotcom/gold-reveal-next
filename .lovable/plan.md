# Social Media Dashboard – 3 Erweiterungen

## 1. Reiter „Marketer-Bewerbungen"

**Neue Seite** `/socialmedia/admin/applications` mit einfacher Notiz-Tabelle.

- Neue DB-Tabelle `socialmedia_marketer_applications`: `name`, `phone`, `notes`, `status` (offen/abgelehnt/eingestellt — optional), `created_by`, Timestamps.
- RLS: nur Admins (`is_admin`) lesen/schreiben.
- UI: Tabelle mit Inline-Add-Zeile + Edit/Delete pro Zeile. Felder: Name, Telefon, Notizen. Kein Workflow, rein Notiz-Liste.
- Link in den Header-Buttons der bestehenden Admin-Seiten (Dashboard / Marketer / Content Pläne) ergänzen: „Bewerbungen".

## 2. Logins für Instagram-Accounts

Aktuell sind `instagram_urls: string[]` (pro Model) reine URLs. Pro IG-Account soll **Username + Passwort** hinterlegbar sein — sowohl für Model-eigene IGs als auch für die Marketer-IGs.

- Schema-Erweiterung **ohne** Datenverlust:
  - `fanvue_models.instagram_logins` (jsonb, default `[]`) — Array `{ url, username, password }`. URL referenziert eine Eintrag aus `instagram_urls` (Match nach String). Migration füllt initial leere Logins für bestehende URLs.
  - `fanvue_models.marketers` (jsonb) bekommt zusätzlich pro Marketer-Eintrag optionale Felder `ig_username`, `ig_password` (am bestehenden Marketer-Objekt).
- **Admin-Dashboard** (`SocialMediaDashboard.tsx`): Im Edit-Dialog neben jedem IG-URL-Feld zwei zusätzliche Inputs für Username + Passwort (Passwort als sichtbar, Copy-Button). Gleiches für jeden Marketer-Block.
- **Marketer-Dashboard** (`MarketerDashboard.tsx`): bei jedem zugewiesenen Model die Model-IG-Logins anzeigen (Read-only, Copy-Buttons), sowie die eigenen Marketer-IG-Logins (gefiltert auf den eingeloggten Marketer per `marketerName`-Match).
- **Model-Dashboard** (`SocialMediaModelDashboard.tsx`): IG-Logins werden **nicht** geladen/angezeigt. Bestehende Plattform-Logins (Fanvue etc.) bleiben unverändert sichtbar.
- RLS bleibt gleich; die Daten liegen alle in `fanvue_models`. Felder werden im SELECT des Model-Dashboards **nicht** angefordert.

## 3. Contentpläne trennen: Models vs. Marketer

- `content_plans` bekommt neue Spalte `target_type text` (`'model' | 'marketer'`, default `'model'`).
- `content_plan_assignments` bekommt `marketer_user_id uuid` (nullable). Constraint: genau eines von `model_id` / `marketer_user_id` gesetzt.
- **`SocialMediaContentPlans.tsx`** (Admin):
  - Oben Tabs: „Für Models" / „Für Marketer".
  - „Neuer Plan"-Button erstellt im aktiven Tab — `target_type` entsprechend gesetzt.
  - Zuweisungs-Dialog zeigt im Model-Tab Model-Liste, im Marketer-Tab Marketer-Liste (aus `user_roles` + `marketer_model_assignments`).
- **`MarketerDashboard.tsx`**: Lädt zusätzlich seine `content_plan_assignments` (per `marketer_user_id = auth.uid()`) und rendert sie analog zum Model-Dashboard (Wochen-Tabs, Task-Status, Wochen-Feedback). Code wird aus dem Model-Dashboard in eine wiederverwendbare Komponente `ContentPlanViewer` extrahiert.
- RLS für `content_plan_assignments`: Marketer dürfen ihre eigenen Zuweisungen lesen; Task-Status & Feedback analog am `assignment_id`.

## Technische Details

- Eine kombinierte Migration für alle Schema-Änderungen + RLS.
- Typen werden nach Migration regeneriert; Code-Änderungen folgen danach.
- Bestehende Plan-Daten erhalten `target_type='model'` rückwirkend → keine UX-Regression.
- `ContentPlanViewer` als gemeinsame Komponente für Model- & Marketer-Dashboard, um Duplikation zu vermeiden.

## Out of Scope

- Bewerbungs-Workflow (Status-Tracking, E-Mails) — bewusst nicht implementiert, Tabelle dient nur als Notiz-Liste.
- Passwort-Verschlüsselung der IG-Logins — analog zu bestehenden Plattform-Logins im Klartext (Memory: Passwörter bewusst sichtbar).
- Kein Migrationspfad für `instagram_url` (Single) — bleibt für Legacy-Anzeige bestehen.
