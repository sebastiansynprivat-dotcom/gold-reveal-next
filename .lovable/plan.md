

# Chatter-Dashboard Tab im Admin-Bereich

## Überblick
Neuer Tab "Chatter-Dashboard" im Admin-Dashboard — rein lokal/optisch, keine Backend-Verknüpfung. Erlaubt das manuelle Eintragen von Chatter-Daten und das Generieren von Gutschrift-PDFs, analog zum Model-Dashboard.

## Was gebaut wird

**Neue Datei: `src/components/ChatterDashboardTab.tsx`**

Komplett lokaler State (localStorage-Persistierung), keine Supabase-Tabellen. Folgende Funktionen:

1. **Chatter-Liste verwalten** — Button "Chatter hinzufügen" öffnet Eingabe für Name + Plattform. Liste wird in localStorage gespeichert. Chatters können gelöscht werden.

2. **Chatter auswählen** — Gleiche collapsible Liste wie im Model-Dashboard (Gold-Styling, Suchfeld, animierte Übergänge).

3. **Detail-Ansicht pro Chatter:**
   - Name (editierbar)
   - Plattform (editierbar)
   - Monatsumsatz — manuelles Eingabefeld mit großer goldener animierter Zahl darüber (gleicher Style wie Model-Dashboard)
   - Prozent-Slider für Anteil
   - Verdienst-Anzeige (automatisch berechnet)

4. **Gutschrift-PDF generieren** — Gleiche PDF-Logik wie im Model-Dashboard (jsPDF), mit Chatter-Name statt Account-Email. Beschreibung + Betrag Felder, Auto-Fill aus berechneter Gutschrift.

**Änderung: `src/pages/AdminDashboard.tsx`**
- Neuen Tab `chatter_dashboard` zum Tab-Array hinzufügen (Icon: `Users`, Label: "Chatter-Dashboard")
- Import und Rendering von `ChatterDashboardTab`

## Technische Details

- State-Persistierung via `localStorage` (Key: `admin-chatter-dashboard`)
- Datenstruktur pro Chatter: `{ id, name, platform, monthlyRevenue, revenuePercentage }`
- Wiederverwendung der gleichen UI-Patterns: `Section`-Wrapper, `AnimatedGoldValue`, `input-gold-shimmer`, `glass-card`, `gold-gradient-border-animated`
- PDF-Generierung: identische SENDER-Konstante und jsPDF-Layout, Blob-Download mit Fallback
- Keine DB-Migration nötig

