

# Offer-Verteilung basierend auf freien Accounts

## Aktueller Stand
Die Offer-Verteilung nutzt manuell gesetzte Prozent-Gewichtungen in `quiz_routes.weight`. Admins stellen diese per Slider ein. Die `WeightedRouteButton`-Komponente verwendet den Bresenham-Algorithmus mit diesen Gewichtungen.

## Neue Logik

### Grundidee
Statt manueller Prozentwerte wird die Verteilung **automatisch** anhand der Anzahl freier (unzugewiesener) Accounts pro Plattform berechnet. Keine Slider mehr nötig.

### 1. Neue DB-Funktion: `get_free_account_counts()`
Eine SQL-Funktion, die für jede aktive `quiz_route` die Anzahl freier Accounts zählt:

```sql
CREATE FUNCTION get_free_account_counts()
RETURNS TABLE(route_id uuid, platform_name text, target_path text, free_count bigint)
```

Verbindet `quiz_routes.name` mit `accounts.platform` und zählt `WHERE assigned_to IS NULL`.

### 2. QuizResult.tsx – WeightedRouteButton anpassen
- Statt `quiz_routes.weight` zu lesen, ruft die Komponente `get_free_account_counts()` auf
- `free_count` wird direkt als Gewichtung für den Bresenham-Algorithmus verwendet
- **Edge-Case: keine freien Accounts** → Fallback auf gleichmäßige Verteilung oder Fehlermeldung
- **Edge-Case: nur eine Plattform hat freie Accounts** → 100% dorthin
- **Plattformen mit 0 freien Accounts** → werden aus der Verteilung ausgeschlossen (Gewicht = 0)

### 3. Admin-Dashboard – Offer-Verteilung-Section anpassen
- Slider entfernen (keine manuelle Prozentsteuerung mehr)
- Stattdessen: Anzeige der aktuellen freien Account-Zahlen pro Plattform
- Live-Vorschau-Balken bleibt, zeigt aber die automatisch berechneten Anteile
- Kein "Speichern"-Button mehr nötig (Verteilung ist immer live)
- `quiz_routes.weight`-Spalte wird nicht mehr aktiv genutzt, bleibt aber in der DB

### 4. Edge-Cases
- **Keine freien Accounts auf allen Plattformen**: User wird trotzdem zur ersten Route weitergeleitet (Fallback)
- **Ungleiche Verteilung**: Bresenham funktioniert mit beliebigen Ganzzahl-Gewichtungen, also z.B. 3 freie Maloum + 7 freie Brezzels = 30%/70% automatisch

### Ergebnis
Die Verteilung ist vollständig dynamisch – sobald Accounts zugewiesen oder neue hinzugefügt werden, ändert sich die Verteilung automatisch. Kein Admin-Eingriff nötig.

## Technische Details
- 1 neue DB-Funktion (`get_free_account_counts`)
- Änderung in `QuizResult.tsx`: ~15 Zeilen (RPC-Call statt quiz_routes-Query)
- Änderung in `AdminDashboard.tsx`: Slider-Section durch Read-Only-Anzeige ersetzen (~40 Zeilen)

