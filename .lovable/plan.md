## Plan: "Collect Exchange ID" → "TX Hash" zurückbenennen

Alle Vorkommen im Code auf Provider Invoices und zugehörigen UIs zurück auf `TX Hash` ändern.

**Änderungen:**

1. `src/lib/providerInvoicePdf.ts` (Zeile 160)
   - `Collect Exchange ID: ...` → `TX Hash: ...`

2. `src/components/CreditNoteForm.tsx`
   - Zeile 631 (PDF-Output): `Collect Exchange ID: ...` → `TX Hash: ...`
   - Zeile 1089 (Label): `Collect Exchange ID` → `TX Hash`
   - Zeile 1091 (Input placeholder): `Collect Exchange ID` → `TX Hash`

3. `src/components/ModelBillingInfo.tsx` (Zeile 124)
   - Listeneintrag `Collect Exchange ID` → `TX Hash`

Keine DB-Änderungen nötig (Spaltenname `tx_hash` bleibt).