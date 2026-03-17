

## Plan: Währungsfeld + Auto-Save für Dashboards & Gutschrift

### Was wird gebaut

1. **Währungsfeld** in beiden Dashboards (Model + Chatter) — ein Dropdown (EUR, USD, USDT, etc.) das pro Model/Chatter gesetzt wird und überall in Anzeigen + Credit Note durchgereicht wird.

2. **Auto-Save** für alle Texteingaben in beiden Dashboards — Änderungen werden nach kurzer Verzögerung (debounce ~1s) automatisch gespeichert, kein manueller "Speichern"-Button mehr nötig.

3. **Credit Note Formular**: Alle eingegebenen Felder (Provider-Name, Adresse, Payment Method, TxHash, etc.) werden persistent gespeichert und beim nächsten Öffnen vorausgefüllt.

---

### Technische Umsetzung

#### 1. Datenbank-Migration
- `model_dashboard` Tabelle: Neue Spalte `currency TEXT DEFAULT 'EUR'` hinzufügen.

#### 2. ChatterDashboardTab
- `Chatter`-Interface um `currency: string` erweitern (Default `"EUR"`).
- Neues Currency-Dropdown (Select) in der "Chatter-Daten"-Sektion.
- Wird automatisch via bestehender localStorage-Persistenz gespeichert (bereits implementiert).
- Currency wird an `CreditNoteForm` durchgereicht.

#### 3. ModelDashboardTab
- Neues Currency-Dropdown in der Model-Daten-Sektion.
- **Auto-Save**: `useEffect` mit Debounce (~1s) auf alle editierbaren Felder. Bei Änderung wird `saveData()` automatisch aufgerufen. Der manuelle "Alles speichern"-Button bleibt als Fallback.
- Currency-Wert wird geladen/gespeichert wie andere Felder und an `CreditNoteForm` übergeben.

#### 4. CreditNoteForm
- Neues Prop `currency` für die Währungsanzeige im PDF.
- **Persistenz**: Alle Formularfelder (Provider-Name, Adresse, isBusiness, VAT-ID, Payment Method, Crypto Coin, Exchange Rate, Description) werden via localStorage gespeichert, gekeys auf `accountId` oder `chatterName`. Beim Öffnen werden gespeicherte Werte geladen.
- PDF-Ausgabe nutzt die übergebene Währung statt hartkodiertem "€".

#### 5. Dateien die geändert werden
- `supabase/migrations/` — neue Migration für `currency` Spalte
- `src/components/ChatterDashboardTab.tsx` — Currency-Feld + Interface-Erweiterung
- `src/components/ModelDashboardTab.tsx` — Currency-Feld + Auto-Save-Logik
- `src/components/CreditNoteForm.tsx` — Currency-Prop + localStorage-Persistenz
- `src/pages/ModelDashboard.tsx` — Currency aus DB laden und anzeigen

