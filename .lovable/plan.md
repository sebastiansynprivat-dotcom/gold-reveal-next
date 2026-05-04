## Problem

Im `CreditNoteForm` (Provider Invoice) werden die Empfängerdaten (Name, Adresse, Geschäftlich/Privat, VAT-ID) nur im **localStorage** des Browsers gespeichert (Key: `credit-note-form-<accountId|chatterName>`). Daher gehen sie beim Browserwechsel, Inkognito-Modus oder Cache-Löschen verloren – effektiv „muss man immer neu eintragen".

## Lösung

Provider-Empfängerdaten zentral pro Chatter bzw. Model in der Datenbank speichern, damit sie geräteübergreifend persistent sind und sofort beim Auswählen vorbefüllt werden.

### 1. Datenbank-Migration

Neue Spalten in `chatters` und `models`:
- `provider_address text not null default ''`
- `provider_is_business boolean not null default false`
- `provider_vat_id text not null default ''`

(Der Provider-Name bleibt = `chatters.name` / `models.name`, kann im Form weiterhin überschrieben werden, wird aber zusätzlich als Override gespeichert via neuer Spalte `provider_name_override text default ''`.)

### 2. CreditNoteForm

- Neue Props: `providerAddress`, `providerIsBusiness`, `providerVatId`, `providerEntityType` (`"chatter" | "model"`), `providerEntityId` (uuid).
- Init-Werte aus Props statt aus localStorage laden.
- Debounced Auto-Save (~800ms) in die zugehörige Zeile (`chatters` oder `models`).
- localStorage-Logik für diese Felder entfernen (sonst überstimmt der alte Cache die DB-Werte). Andere reine UI-Felder (cryptoNetwork, txHash, exchangeRate, receiverWallet) dürfen weiter in localStorage bleiben.

### 3. Aufrufseiten anpassen

- `ChatterDashboardTab.tsx`: Werte aus `selected` weiterreichen, `providerEntityType="chatter"`, `providerEntityId={selected.id}`.
- `ModelDashboardTab.tsx`: Werte aus `modelForm` weiterreichen, `providerEntityType="model"`, `providerEntityId={selectedModelId}`.

### 4. RLS

Bestehende Policies auf `chatters` / `models` decken Update bereits ab (Super-Admin: alles; Sub-Admin: nur eigene). Keine zusätzlichen Policies nötig.

## Resultat

Empfängeradressen werden pro Chatter/Model dauerhaft in der Datenbank gespeichert und stehen auf jedem Gerät sofort beim Öffnen des Provider-Invoice-Formulars zur Verfügung.