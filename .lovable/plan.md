

## Übersicht

Das Model-Dashboard wird von einer flachen Account-Liste zu einer hierarchischen Stammbaum-Struktur umgebaut: **Model → Plattformen → Chatter**. Die bestehende Chatter-Ansicht (normales Dashboard) bleibt unverändert.

---

## Neue Datenbank-Tabelle: `models`

Eine neue Tabelle als "Ebene 1" (Wurzel):

```text
models
├── id (uuid, PK, auto-generated)
├── name (text) — z.B. "Alina"
├── username (text) — übergeordneter Benutzername
├── address (text) — Anschrift
├── revenue_percentage (numeric, default 0)
├── crypto_address (text)
├── currency (text, default 'EUR')
├── contract_file_path (text)
├── notes (text)
├── created_by (uuid)
├── created_at / updated_at (timestamptz)
```

RLS: Admin-only (super_admin + sub_admin mit Zugriff).

## Schema-Änderung: `accounts` Tabelle

Neues Feld `model_id uuid` auf der bestehenden `accounts`-Tabelle. Das verknüpft Plattform-Accounts (Ebene 2) mit dem Model (Ebene 1). Chatters bleiben über `assigned_to` verknüpft (Ebene 3). Bestehende Accounts ohne `model_id` funktionieren weiterhin normal.

## Datenstruktur (Stammbaum)

```text
Model "Alina" (models.id = abc)
├── Brezzels-Account (accounts WHERE model_id = abc AND platform = 'Brezzels')
│   ├── Login: email / password
│   └── Chatter: Julian (assigned_to)
├── Maloum-Account (accounts WHERE model_id = abc AND platform = 'Maloum')
│   ├── Login: email / password
│   └── Chatter: Rose (assigned_to)
└── 4Based-Account (accounts WHERE model_id = abc AND platform = '4Based')
    └── ...
```

Jeder Account hat automatisch eine UUID — keine manuelle ID-Vergabe nötig.

---

## UI-Umbau: ModelDashboardTab.tsx

### Linke Seite / Hauptliste
- **Neue Model-Übersicht**: Liste aller Models (aus `models`-Tabelle) statt flacher Account-Liste
- **"Model anlegen"**-Button: Dialog mit Feldern Name, Benutzername, Anschrift, Vertrag-Upload
- Klick auf ein Model öffnet die Stammbaum-Detailansicht

### Detailansicht (rechts / unten)
Hierarchisch mit einklappbaren Sektionen:

1. **Model-Kopf**: Name, Benutzername, Anschrift, Vertrag, Revenue %, Crypto, Währung, Notizen
2. **Plattformen** (Accordion/Collapsible je Plattform):
   - Zeigt alle `accounts` mit `model_id = dieses Model`
   - Login-Daten (Email/Passwort) pro Plattform-Account sichtbar
   - Button "Plattform-Account hinzufügen" → legt neuen Account mit `model_id` an
3. **Chatter** (je Plattform-Account):
   - Zeigt `assigned_to`-Verknüpfung und den zugewiesenen Chatter
   - Zuweisung/Entfernung von Chattern

### Integration mit Chatter-Dashboard
- Neue Accounts, die hier angelegt werden, landen in der `accounts`-Tabelle mit `model_id` gesetzt
- Für Chatter sieht alles identisch aus: Sie sehen ihren zugewiesenen Account wie bisher
- Bestehende Account-Zuweisungslogik (Trigger, Edge Functions) bleibt unverändert

---

## Datenmigration

- Bestehende `model_dashboard`-Daten (revenue_percentage, crypto_address, contract_file_path, notes, currency) werden in die neue `models`-Tabelle überführt, sofern sinnvoll
- `model_dashboard` bleibt für plattform-spezifische Daten (Umsätze, Setup-Status) bestehen, wird aber um `model_id` ergänzt
- Revenue-Felder (fourbased_revenue, maloum_revenue, brezzels_revenue) bleiben auf `model_dashboard` oder wandern in die Account-Ebene

---

## Zusammenfassung der Änderungen

| Bereich | Aktion |
|---------|--------|
| **DB: `models` Tabelle** | Neu erstellen mit RLS |
| **DB: `accounts.model_id`** | Neue Spalte hinzufügen |
| **UI: ModelDashboardTab** | Kompletter Umbau zu Stammbaum-UI |
| **Chatter-Dashboard** | Keine Änderungen |
| **Bestehendes Dashboard** | Keine Änderungen |

