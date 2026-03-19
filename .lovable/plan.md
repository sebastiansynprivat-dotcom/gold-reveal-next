

## Plan: Chatter Dashboard — Plattform-Aufschlüsselung & Credit Note Angleichung

### Was wird gemacht

Das Chatter-Dashboard bekommt dieselbe Logik wie das Model-Dashboard:
- Statt eines einzelnen "Monatsumsatz"-Feldes gibt es drei Plattform-Felder (4Based, Maloum, Brezzels), die automatisch zum Gesamtumsatz aufsummiert werden
- Die Credit Note erhält die Plattform-Aufschlüsselung (Revenue + Share pro Plattform)
- Der Firmenname wird auf "Sharify Media Limited" (Zypern-Adresse) gesetzt — identisch zum Model Dashboard

### Technische Umsetzung

**Datei: `src/components/ChatterDashboardTab.tsx`**

1. **Chatter-Interface erweitern**: Drei neue Felder `fourbasedRevenue`, `maloumRevenue`, `brezzelsRevenue` zum `Chatter`-Interface hinzufügen. `monthlyRevenue` wird zum berechneten Wert (Summe der drei Plattformen).

2. **UI "Chatter-Daten" Section umbauen**: Das einzelne "Monatsumsatz"-Feld durch drei Plattform-Eingabefelder ersetzen (4Based, Maloum, Brezzels) mit automatischer Summenberechnung — exakt wie im Model Dashboard.

3. **Goldene Gesamtumsatz-Karte**: Zeigt weiterhin den Gesamtumsatz, jetzt als Summe der drei Plattformen.

4. **CreditNoteForm-Aufruf anpassen**: `platformRevenue`-Prop übergeben mit den drei Plattform-Werten (identisch zum Model Dashboard).

5. **SENDER-Konstante entfernen**: Wird nicht mehr benötigt, da CreditNoteForm die Issuer-Daten (Sharify Media Limited, Zypern) bereits korrekt vorbelegt hat.

6. **Migration bestehender Daten**: Bestehende Chatter im localStorage, die nur `monthlyRevenue` haben, werden automatisch migriert — der alte Wert wird als `fourbasedRevenue` übernommen, damit nichts verloren geht.

