## Problem

1. **Live-Kurs zeigt „nicht verfügbar"** — die Frankfurter-API blockt CORS aus dem Lovable-Sandbox (alle Requests scheitern mit `Failed to fetch`).
2. Die Umrechnung ist nur eine **Anzeige unten** — die Rechnung selbst läuft weiter in der Chatter-Währung. Du willst aber die **Rechnungswährung selbst umstellen** und die Beträge automatisch umrechnen lassen.

---

## Lösung

### 1. FX-API ersetzen (mit Fallback-Kette)

Die Frankfurter-API funktioniert nicht zuverlässig. Wir nutzen stattdessen mehrere Quellen mit Fallback:

```
open.er-api.com  →  exchangerate.host  →  Frankfurter
```

So bleibt der Live-Kurs auch verfügbar, wenn eine API ausfällt. Die Anzeige „Kurs nicht verfügbar" wird damit nur noch erscheinen, wenn wirklich alle Quellen ausfallen (sehr selten).

### 2. Echte Rechnungswährung umstellbar + automatische Umrechnung

Im Provider-Invoice-Formular bekommst du oben einen neuen Bereich **„Rechnungswährung"**:

- Dropdown mit `EUR / USD / GBP / CHF / AED`
- Standard = die Chatter-Währung (z.B. EUR)
- Wenn du auf USD umstellst:
  - Live-Kurs `EUR → USD` wird geladen
  - Der Netto-Betrag wird **automatisch in USD umgerechnet** und ins Eingabefeld geschrieben
  - Alle Anzeigen (Netto / MwSt / Brutto / PDF-Tabelle / „Suggested amount") laufen ab sofort in USD
  - Plattform-Aufschlüsselung (4Based / Maloum / … / Custom) zeigt die Beträge ebenfalls in USD
- In der PDF wird die Rechnung komplett in der gewählten Währung erstellt
- Im Footer steht zusätzlich der verwendete Kurs (z.B. `Exchange Rate: 1 EUR = 1,0850 USD`)

Wenn du die Währung wieder zurückstellst, werden die Beträge erneut zurückgerechnet — du arbeitest also immer mit korrekt umgerechneten Zahlen.

### 3. Manuelle Override-Möglichkeit

Du kannst den Netto-Betrag jederzeit von Hand überschreiben (z.B. wenn der Auszahlungs-Kurs der Exchange leicht abweicht). Die automatische Konvertierung passiert nur:
- beim Wechsel der Rechnungswährung
- oder per Klick auf „Vorschlag übernehmen"

---

## Technische Details

**`src/components/CreditNoteForm.tsx`:**

- Neuer Helper `fetchFxRate(from, to)` mit try-Kette über 3 Endpoints, kurzer Timeout.
- Neuer State `invoiceCurrency` (default = Prop `currency`); ersetzt das bisherige `targetCurrency`-Konzept.
- Live-Rate `chatterCurrency → invoiceCurrency` wird geladen, sobald sich eine Seite ändert.
- Beim Umschalten der `invoiceCurrency` wird `netAmount` automatisch via Rate umgerechnet (nur wenn Kurs verfügbar).
- Alle UI-Anzeigen (`{currency}` → `{invoiceCurrency}`), Plattform-Tabelle, „Suggested"-Knopf und die PDF-Generierung verwenden konsequent `invoiceCurrency` und ggf. den Rate-Faktor zur Umrechnung der Plattform-Revenues.
- PDF Footer: Kurs-Hinweis nur, wenn Chatter-Währung ≠ Rechnungswährung.
- Fallback bei API-Fehler: das Dropdown bleibt nutzbar, die Auto-Umrechnung wird übersprungen, ein dezenter Warnhinweis erscheint („Kurs nicht verfügbar — bitte manuell eintragen").