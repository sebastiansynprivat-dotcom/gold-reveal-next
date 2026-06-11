## Ziel

1. Content-Items vereinfachen (Link + Notiz statt Reel/Post/Story).
2. Marketer-Rolle inkl. Login & eigenem Dashboard mit Zuweisung pro Model.
3. Grundgerüst für Coaching & Prognosen im Marketer-Dashboard.

Phase 1 (jetzt): Grundlogik & Login. Inhalte (Coaching-Material, konkrete Prognose-Berechnungen) füllen wir mit deinen Details nach.

---

## 1) Content-Plan: Referenz-Link + Notiz

**Datenmodell** (`content_plan_days.items` ist `jsonb`, kein Schema-Change nötig):
- Altes Item: `{ type: "reel"|"post"|"story", title, notes }`
- Neues Item: `{ title, reference_url, notes }`

**UI Admin (`SocialMediaContentPlans.tsx`)**:
- Typ-Auswahl + Icons entfernen.
- Pro Item: Titel, Referenz-Video-URL (Input mit URL-Validierung), Notiz (Textarea).
- Rückwärtskompatibel rendern (alte `type`/`title` werden weiter angezeigt, neue Felder ergänzt).

**UI Model (`SocialMediaModelDashboard.tsx`)**:
- Pro Tag: Titel, Notiz, „Referenz ansehen" Button (öffnet `reference_url` in neuem Tab).
- Erledigt-Toggle bleibt.

---

## 2) Marketer-Rolle + Login

**DB-Migration**:
- Enum `app_role` erweitern um `'socialmedia_marketer'`.
- Neue Tabelle `marketer_model_assignments(id, marketer_user_id uuid, model_id uuid fk fanvue_models, assigned_at, assigned_by)` mit GRANT + RLS:
  - Marketer: SELECT eigene Zeilen.
  - Admin/super_admin/fanvue_partner: full CRUD.
- RLS-Erweiterungen, damit Marketer lesen können:
  - `fanvue_models` (nur zugewiesene)
  - `fanvue_instagram_snapshots` (nur für zugewiesene Models)
  - `content_plan_assignments` + `content_plan_days` + `content_plan_task_status` (read-only für zugewiesene Models)

**Edge Function** `create-marketer-login`:
- Admin-only (Service Role + JWT-Check via `has_role`).
- Input: email, password, name. Erstellt Auth-User + Rolle `socialmedia_marketer`.

**Routes (`App.tsx`)**:
- `/marketer/login` – wiederverwendet `SocialMediaLogin`-Stil, ruft `signIn` und prüft Rolle.
- `/marketer` – geschützt durch `MarketerProtectedRoute` (analog `SocialMediaModelProtectedRoute`).

**Admin-UI**:
- Im bestehenden `SocialMediaDashboard.tsx` neuer Tab/Bereich „Marketer":
  - Liste der Marketer, Button „Marketer anlegen" (ruft Edge Function), Zuweisung zu Models (Multi-Select aus `fanvue_models`).

---

## 3) Marketer-Dashboard (Grundgerüst)

Neue Seite `src/pages/MarketerDashboard.tsx` mit drei Sektionen:

**a) Meine Models**
- Karten je zugewiesenes Model: Name, Username, aktueller IG-Follower-Stand, Wachstum (7d/30d) aus `fanvue_instagram_snapshots` (kleiner Sparkline-Chart via Recharts).
- Klick → Detail-Drawer mit Content-Plan-Fortschritt (read-only) + voller Wachstumshistorie.

**b) Prognosen** (Platzhalter mit echter Berechnung)
- Linearer Trend aus letzten 30 IG-Snapshots → Prognose 30/60/90 Tage.
- Card mit „voraussichtliche Follower in X Tagen" + Motivations-Text.
- Konkrete Formeln/Texte erweitern wir, wenn du Details lieferst.

**c) Coaching**
- Statischer Bereich „Coaching-Materialien" mit Karten-Grid (vorerst 3 Platzhalter-Karten + leerer State „Bald verfügbar").
- Datenquelle später: neue Tabelle `marketer_coaching_resources` – baue ich, sobald du Inhalte hast.

Design: glassmorphism, Black & Gold, GoldParticles wie restliche Social-Media-Seiten.

---

## Was nach diesem Schritt offen bleibt

- Konkrete Coaching-Inhalte / Videos.
- Genaue Prognose-Logik (Wunsch-Formel, Ziele pro Model).
- Optional: Push-Notifications für Marketer bei Meilensteinen.

Wenn du grünes Licht gibst, baue ich Phase 1 komplett: DB-Migration, Edge Function, Admin-UI, Marketer-Login + Dashboard-Grundgerüst, und passe den Content-Plan-Editor auf Link+Notiz um.