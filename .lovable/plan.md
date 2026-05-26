## Ziel
Jeder Chatter sieht in der Inspirations-Bibliothek auf einen Blick, welche PDFs er schon gelesen hat. Markierung passiert automatisch beim Durchscrollen – mit manuellem Fallback-Button.

## So funktioniert es für den Chatter

1. In der Bibliothek bekommt jede PDF-Kachel einen Status-Indikator:
   - **Ungelesen** – goldener „NEU"-Punkt
   - **Begonnen** – Fortschrittsring (z. B. 40 %)
   - **Erledigt** – grüner Haken + leicht gedimmte Kachel
2. Über den Kacheln steht eine kleine Übersicht: „2 von 3 gelesen · 67 %" mit goldenem Fortschrittsbalken.
3. Öffnet er die PDF-Seite (`/bibliothek/chat-breakdown-01`):
   - **Automatisch**: Beim Scrollen wird gemessen, wie weit er gekommen ist. Bei ≥ 90 % aller Seiten sichtbar gewesen → automatisch als „erledigt" markiert (mit kleinem Toast „Als gelesen markiert ✓").
   - **Manuell**: Oben rechts und am Ende der Seite ein Button „Als gelesen markieren" / „✓ Gelesen" (Toggle), für den Fall, dass er nur drüberfliegen will.
4. Status wird pro User in der Datenbank gespeichert, also auch nach Logout/Gerätewechsel erhalten.

## Was technisch gebaut wird

### Datenbank
Neue Tabelle `library_reads`:

```text
id              uuid pk
user_id         uuid  (auth.uid)
content_key     text  ('chat-breakdown-01', später weitere)
progress_pct    int   (0–100)
completed_at    timestamptz nullable
updated_at      timestamptz
unique (user_id, content_key)
```

RLS: User darf nur eigene Zeilen lesen/schreiben. Admins (`is_admin()`) dürfen alle Zeilen lesen → später für Admin-Auswertung nutzbar.
GRANT: `SELECT, INSERT, UPDATE ON library_reads TO authenticated`.

### Frontend
- **Neuer Hook** `useLibraryReads()` – holt einmal alle Reads des aktuellen Users, stellt `markProgress(key, pct)` und `markCompleted(key)` bereit (mit Upsert via Supabase).
- **`InspirationLibrary.tsx`** erweitern:
  - Status-Badge pro Kachel (Punkt / Ring / Haken)
  - Mini-Übersichtszeile „X von Y gelesen"
  - CTA-Text passt sich an („Jetzt durchlesen" → „Weiterlesen" → „Nochmal lesen")
- **`ChatBreakdown.tsx`** erweitern:
  - `IntersectionObserver` über die 10 Seiten-Bilder → höchste erreichte Seite berechnet Fortschritt
  - Ab 90 % automatisch `markCompleted('chat-breakdown-01')` + Toast
  - Header-Button „Als gelesen markieren" (Toggle, zeigt ✓ wenn fertig)
  - Am Ende der Seite zusätzlich eine kleine „Erledigt"-Bestätigung mit Haken

### Skalierbar
Die `content_key`-Struktur ist offen – sobald die nächsten PDFs (Verkaufs-Skripte, Coaching Basics) live gehen, funktioniert das Tracking ohne weitere DB-Änderungen.

## Was nicht Teil dieses Schritts ist
- Admin-Ansicht „Wer hat welche PDF gelesen" (Daten werden aber bereits sauber gespeichert, kann später ohne Migration ergänzt werden).
- Gamification (Punkte / Streak für gelesene PDFs).
