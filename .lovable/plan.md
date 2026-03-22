

# Credit Note: TxHash Schriftgröße + Receiver Wallet Feld

## Zusammenfassung
1. **TxHash Schriftgröße im PDF anpassen** – aktuell wird die Schriftgröße auf 7.5 reduziert, dann aber nicht zurückgesetzt. Das passt nicht zum Rest (8.5). Die Schriftgröße soll gleich bleiben wie der Rest der Payment Information.
2. **Receiver Wallet Feld hinzufügen** – ein neues Eingabefeld "Receiver Wallet" in der Credit Note Form (Payment Information Sektion), das auf dem PDF mit ausgegeben wird. Der `cryptoAddress`-Prop wird als Defaultwert genutzt.

## Änderungen

### `src/components/CreditNoteForm.tsx`

**PDF-Generierung (TxHash Schriftgröße):**
- Zeile ~466: `doc.setFontSize(7.5)` entfernen – TxHash soll in derselben Größe (8.5) wie der Rest der Payment Info stehen
- Die Zeile `doc.setFontSize(8.5)` danach (Zeile 469) ebenfalls entfernen, da nicht mehr nötig

**Neues Feld "Receiver Wallet":**
- Neuen State `receiverWallet` mit Default aus `cryptoAddress`-Prop
- In der Payment Information UI-Sektion: neues Input-Feld "Receiver Wallet" mit Placeholder "Wallet-Adresse des Empfängers"
- Im PDF: unter Payment Method/vor TxHash eine Zeile `Receiver Wallet: <wallet>` ausgeben (nur wenn befüllt)
- `receiverWallet` in localStorage-Persistierung aufnehmen

