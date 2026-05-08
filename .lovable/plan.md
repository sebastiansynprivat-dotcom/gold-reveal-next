## Ziel

Im Provider Invoice-Formular und in der heruntergeladenen PDF wird das Feld „TxHash" zu **„Collect Exchange ID"** umbenannt — nur das sichtbare Label, der interne State und das DB-Feld `tx_hash` bleiben unverändert (keine Migration nötig, bestehende Einträge gehen nicht verloren).

## Änderungen (`src/components/CreditNoteForm.tsx`)

1. **PDF-Zeile 586**
   `doc.text(\`TxHash: ${txHash}\`, m, y);`
   → `doc.text(\`Collect Exchange ID: ${txHash}\`, m, y);`

2. **Form-Label Zeile 1008**
   `<Label>TxHash</Label>` → `<Label>Collect Exchange ID</Label>`

3. **Input-Placeholder Zeile 1010**
   `placeholder="Transaction Hash"` → `placeholder="Collect Exchange ID"`

## Was nicht geändert wird

- Variable `txHash` und `setTxHash` bleiben (interner Code).
- DB-Spalte `credit_notes.tx_hash` bleibt unverändert — alte Einträge bleiben sichtbar.
- Sonstige Crypto-Felder (Coin, Netzwerk, Wallet, Exchange Rate) bleiben unangetastet.
