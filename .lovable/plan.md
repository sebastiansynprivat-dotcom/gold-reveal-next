

## Plan: Model-Dashboard im Platzhalter-Tab

### Übersicht
Der Platzhalter-Tab wird zum **Model-Dashboard** umgebaut. Oben ein Dropdown zur Auswahl eines Models (aus `accounts`-Tabelle), darunter die 6 Bereiche als Karten.

### 1. Datenbank-Migration
Neue Tabelle `model_dashboard` mit folgenden Spalten:

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | uuid PK | |
| account_id | uuid (unique, FK accounts) | Verknüpfung zum Account |
| fourbased_submitted | boolean | 4based eingereicht? |
| notes | text | Freitext Model-Daten/Notizen |
| revenue_percentage | numeric | Prozente (0-100) |
| crypto_address | text | Crypto-Adresse |
| contract_file_path | text | Storage-Pfad des Vertrags |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Plus: Storage Bucket `model-contracts` (public: false) für Vertrag-PDFs.

RLS: Nur Admins (is_admin()).

### 2. UI-Aufbau im Platzhalter-Tab (→ "Model-Dashboard")

**Header**: Dropdown mit allen Accounts (account_email / account_domain). Bei Auswahl werden Daten aus `model_dashboard` geladen.

**6 Karten untereinander:**

1. **Vertrag Upload** — Datei-Upload (PDF), Anzeige ob hochgeladen, Download-Link
2. **4based submitted** — Toggle mit Speichern
3. **Model Daten** — Textarea für Notizen/Freitext + Crypto-Adresse als separates Feld
4. **Prozente einstellen** — Slider (0-100%) mit Anzeige
5. **Crypto Address** — Input-Feld zum Speichern der Adresse
6. **Gutschrift generieren** — PDF-Generierung (jsPDF) ähnlich Invoice-Seite, aber als "GUTSCHRIFT" mit Model-Daten vorausgefüllt

### 3. Tab-Umbenennung
- Label: "Platzhalter" → "Model-Dashboard"
- Icon: Package → Star oder Users

### 4. Technische Details
- Daten werden beim Dropdown-Wechsel geladen/gespeichert
- Auto-Save bei Änderungen oder expliziter "Speichern"-Button
- Vertrag-Upload über Supabase Storage mit RLS
- Gutschrift-PDF nutzt das gleiche jsPDF-Pattern wie Invoice.tsx, Titel "GUTSCHRIFT" statt "RECHNUNG"
- Keine Änderungen an bestehenden Tabs

