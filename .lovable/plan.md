

## "Anfrage an das Model stellen" – Neue Kachel im Dashboard

### Was wird gebaut
Eine neue Kachel unterhalb der Account-Sektion mit dem Titel **"Anfrage an das Model stellen"**. Beim Klick öffnet sich ein Dialog mit folgendem Ablauf:

1. **Model Name** – Textfeld für den Namen des Models
2. **Art der Anfrage** – Radio-Auswahl: "Individuelle Anfrage" oder "Allgemeine Anfrage"
3. **Preis** – Nur sichtbar wenn "Individuelle Anfrage" gewählt → Eingabefeld "Was ist der Kunde bereit zu bezahlen? (€)"
4. **Beschreibung** – Textarea für die Anfrage-Beschreibung
5. **Absenden-Button** → Speichert in einer neuen DB-Tabelle `model_requests`

### Datenbank
Neue Tabelle `model_requests`:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `model_name` (text, NOT NULL)
- `request_type` (text, NOT NULL) – "individual" oder "general"
- `price` (numeric, nullable) – nur bei individueller Anfrage
- `description` (text, NOT NULL)
- `status` (text, default 'pending')
- `created_at` (timestamptz, default now())

RLS: Authenticated users können nur eigene Anfragen erstellen und lesen.

### UI-Änderungen (Dashboard.tsx)
- Neue Kachel nach der Account-Sektion (Zeile ~623), gleicher Stil wie "Ich habe eine Frage"-Kachel
- Icon: `Send` oder `MessageSquare` von lucide-react
- Dialog mit dem Formular, Radio-Group für Anfragetyp, konditionelles Preisfeld
- Erfolgs-Toast nach Absenden, Dialog schließt sich

### Technische Details
- Formular-State lokal im Dialog
- Supabase insert in `model_requests`
- Radio-Group aus bestehender `@radix-ui/react-radio-group` Komponente
- Textarea und Input aus bestehenden UI-Komponenten

