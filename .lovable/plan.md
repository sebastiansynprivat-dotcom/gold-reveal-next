

# Offer C (FansyMe) zur Quiz-Verteilung hinzufügen

## Zusammenfassung
Ein neuer Eintrag "FansyMe" mit `target_path: /offer-c` wird in die `quiz_routes`-Tabelle eingefügt. Danach erscheint er automatisch im Admin-Dashboard unter "Offer-Verteilung" und kann per Slider gewichtet werden.

## Änderungen

### 1. Datenbank-Migration
- Neuen Eintrag in `quiz_routes` einfügen:
  - `name`: "FansyMe"
  - `target_path`: "/offer-c"
  - `weight`: 0 (startet deaktiviert, du kannst den Slider dann auf den gewünschten Wert stellen)
  - `is_active`: true

### 2. Keine Code-Änderungen nötig
Das Admin-Dashboard lädt alle aktiven `quiz_routes` dynamisch. Der neue Eintrag erscheint sofort als dritter Slider in der Offer-Verteilung. Auch die QuizResult-Komponente berücksichtigt ihn automatisch bei der Weiterleitung.

