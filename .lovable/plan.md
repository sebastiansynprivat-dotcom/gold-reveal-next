

## Problem

Wenn du die Invoice-Nummer in den Einstellungen z.B. von 18 auf 14 zurücksetzt, springt die nächste Nummer trotzdem wieder hoch (auf 19+). Zwei Ursachen:

1. **`setval(seq, 14, true)`** bedeutet in PostgreSQL: "14 wurde bereits benutzt → nächster Wert ist 15". Die Funktion müsste stattdessen `setval(seq, new_val, false)` nutzen, damit `nextval` exakt `new_val` zurückgibt.

2. **Die Duplikat-Schutz-Schleife** in `next_credit_note_number` überspringt jede Nummer, die schon in `credit_notes` existiert. Da 14, 15, 16, 17, 18 bereits existieren, springt sie immer zum nächsten freien Wert.

## Loesung

### 1. Migration: Funktionen anpassen

**`set_credit_note_seq`** — `setval` mit `false` aufrufen, damit `nextval` exakt den gesetzten Wert zurückgibt:
```sql
PERFORM setval('public.credit_note_seq', new_val, false);
```

**`next_credit_note_number`** — Duplikat-Schleife entfernen. Einfach `nextval` aufrufen und die Nummer zurückgeben, ohne zu prüfen ob sie schon existiert.

**`credit_notes` Unique Constraint entfernen** — `credit_notes_credit_note_number_key` droppen, damit dieselbe Nummer bei Bedarf mehrfach vergeben werden kann. (Alternativ: Constraint behalten und bei INSERT `ON CONFLICT` nutzen — aber das verkompliziert den Code unnötig.)

### 2. Keine Frontend-Änderungen nötig

Die UI ruft bereits `set_credit_note_seq(newVal)` korrekt auf und zeigt die Vorschau. Nur die DB-Funktionen müssen gefixt werden.

