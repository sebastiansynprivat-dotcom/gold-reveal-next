# Stammdaten → Provider Invoice automatisch übernehmen

Wenn Name & Anschrift oben in den Stammdaten gepflegt sind, werden sie automatisch im Bereich „Service Provider (Empfänger)" der Provider Invoice unten vorausgefüllt — keine doppelte Eingabe mehr. Gilt für Model- und Chatter-Dashboard.

## Änderungen

### 1. `src/components/ChatterDashboardTab.tsx`
- Neues Feld **Anschrift** in Section „Mitarbeiter‑Daten" (Textarea, gespeichert in `chatters.provider_address`).
- Optional zusätzlich **Business‑Toggle** + **VAT ID** hier hochziehen (`provider_is_business`, `provider_vat_id`).
- `saveToDb` um diese Felder ergänzen, sodass sie mitgespeichert werden.
- `<CreditNoteForm>` Aufruf bleibt — bekommt die Werte bereits via `providerAddress` / `providerIsBusiness` / `providerVatId` Props.

### 2. `src/components/ModelDashboardTab.tsx`
- `<CreditNoteForm>` so anpassen, dass `providerAddress={modelForm.address}` übergeben wird (statt separates `provider_address`).
- `providerNameOverride` entfällt — `providerName={selectedModel.name}` reicht.

### 3. `src/components/CreditNoteForm.tsx`
- Re-Hydrate-Effect erweitern: bei Änderung der Props (durch Tippen oben) werden die Empfänger-Felder unten live aktualisiert.
- Auto-Save zurück in DB bleibt — Override unten editierbar.

## Ergebnis
Stammdaten 1× pflegen → Provider Invoice ist sofort komplett ausgefüllt, in beiden Dashboards.