# Custom-Anfragen: Admin als Gatekeeper zwischen Model & Chatter

## Ziel
Admin bleibt einzige Schnittstelle. Model bekommt eigene Sicht + Push, kann erledigen oder rückfragen. Rückfragen werden vom Admin freigegeben, bevor sie zum Chatter gehen.

## Datenbank (Migration)
Erweitert `model_requests`:
- `model_id uuid` — zu welchem Model die Anfrage gehört (gesetzt beim Forwarden)
- `forwarded_to_model_at timestamptz`
- `model_status text` — `'open' | 'in_progress' | 'done'`
- `model_completed_at timestamptz`

Erweitert `model_request_messages`:
- CHECK constraint um `'model'` als sender_role erweitern
- `visible_to_chatter boolean default false` — Model-Nachrichten unsichtbar für Chatter bis Admin freigibt
- `approved_by_admin_at timestamptz`
- RLS: Models dürfen Nachrichten zu ihren eigenen Requests lesen/schreiben (sender_role='model'), Chatter-SELECT-Policy bekommt `visible_to_chatter=true OR sender_role='admin'`-Filter.

## Admin-Bereich
- In bestehender Custom-Request-Liste: neuer Button **„An Model weiterleiten"** (sichtbar wenn `model_id` noch leer).
  - Setzt `model_id` (lookup über `model_name` → `models.id`), `forwarded_to_model_at = now()`, `model_status = 'open'`, triggert Push an Model.
- Status-Badge zeigt zusätzlich Model-Status (Offen / In Bearbeitung / Erledigt vom Model).
- Neuer Tab/Filter **„Model-Rückfragen warten auf Freigabe"** mit unapproved Model-Messages: Buttons **Freigeben → Chatter** / **Verwerfen**.

## Model-Dashboard (/model)
- Neue Sektion **„Custom-Anfragen"** über/unter Plattformen.
- Liste aller Requests mit `model_id = ich`. Pro Card: Beschreibung, Preis, Kunde, Anhänge.
- Actions: **Erledigt & speichern** (setzt `model_status=done`, `model_completed_at`), **Rückfrage stellen** (textarea → message mit `sender_role='model'`, `visible_to_chatter=false`).
- Push beim Forwarden via bestehendes `send-push`-Edge-Function.

## Speed-Streak Animation (Model-Dashboard)
- Tracking: `model_completed_at`-Timestamps der letzten 24 h aus DB.
- Trigger:
  - **3 in Folge innerhalb 30 min** → goldenes Pop-Toast „🔥 3 Anfragen in Folge!"
  - **5+ heute** → „⚡ Starke Performance heute"
  - **Schnitt < 10 min** → „💰 Schnelle Bearbeitung = mehr Umsatz"
- Umsetzung: Framer-Motion Confetti-Burst + Glassmorphism-Card mit Gold-Shimmer (vergleichbar mit existierender Streak-Celebration). Sound aus bestehendem Sound-System.

## Files (geplant)
- `supabase/migrations/<ts>_request_forwarding.sql` (Schema + RLS)
- `src/pages/AdminDashboard.tsx` (Forward-Button, Model-Status, Approval-Queue)
- `src/components/ModelHomeDashboard.tsx` (neue Sektion + Animation)
- `src/components/ModelRequestsSection.tsx` (neue Komponente, Logik gekapselt)
- `src/components/ModelStreakBurst.tsx` (Animation)
- `supabase/functions/send-push/` falls noch nicht model-fähig: kleiner Wrapper-Call

## Offene Annahme
Model wird via `models.name = model_requests.model_name` zugeordnet. Falls Namen nicht eindeutig sind, brauchen wir vorher einen Dropdown beim Forwarden — sage Bescheid, dann baue ich den ein.