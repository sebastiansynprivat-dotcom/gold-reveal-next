

## Plan: Account Pool vereinfachen und Offer-Verteilung steuerbar machen

### Problem
1. Die Account-Pool-Verwaltung ist zu kompliziert -- zu viele Schritte, um Accounts hinzuzufuegen und zuzuweisen.
2. Die Verteilung der Offers (A, B, C) kann nur ueber die Datenbank geaendert werden, nicht im Admin-Dashboard.

### Loesung

**1. Offer-Verteilung im Admin-Dashboard (neuer Bereich)**

Ein neuer Bereich "Offer-Verteilung" im Chatter-Tab, direkt ueber den Account-Pools:
- Zeigt alle aktiven quiz_routes (Offer A, B, C) mit ihren aktuellen Gewichtungen als Slider oder Prozent-Eingabefelder
- Jeder Offer bekommt einen Slider (0-100), die Gewichte werden relativ zueinander berechnet
- Live-Vorschau der prozentualen Verteilung (z.B. "A: 40%, B: 40%, C: 20%")
- Speichern-Button aktualisiert die `weight`-Spalte in `quiz_routes`
- Admin braucht RLS-Policy fuer UPDATE auf quiz_routes

**2. Account-Pool vereinfachen**

- Pool-Uebersicht bleibt als Kacheln, aber mit mehr Info auf einen Blick (Domain, freie/vergebene Accounts)
- Pool-Dialog wird aufgeraeumt:
  - Domain-Feld oben, wird automatisch fuer alle neuen Accounts uebernommen
  - Accounts hinzufuegen: nur E-Mail + Passwort (Domain kommt vom Pool)
  - Bulk-Zuweisung-Button prominenter platzieren
  - Account-Liste: klarer Status (frei/vergeben an wen), mit Einzelaktionen (freigeben, loeschen)
- "Verknuepftes Offer"-Dropdown entfernen -- Pools sind direkt ueber ihren Namen mit Offers verknuepft

### Technische Aenderungen

1. **DB-Migration**: RLS-Policy auf `quiz_routes` fuer Admin-UPDATE/INSERT/DELETE hinzufuegen
2. **AdminDashboard.tsx**: 
   - Neuer Abschnitt "Offer-Verteilung" mit Slidern fuer jede Route und Speichern-Funktion
   - Pool-Dialog aufraumen und vereinfachen
   - Offer-Dropdown im Pool-Dialog entfernen

