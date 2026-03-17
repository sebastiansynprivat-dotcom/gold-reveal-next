

## Credit Note Anpassungen

### 1. Firma (Issuer) manuell eintragbar machen
Aktuell ist `ISSUER` hardcoded als `Tapyn B.V.`. Stattdessen werden die Issuer-Felder (Name, Adresse, KvK, VAT ID) als editierbare Eingabefelder im Formular angezeigt – mit den aktuellen Werten als Default. Die Werte werden im localStorage mitgespeichert, sodass sie beim nächsten Mal vorausgefüllt sind. Auch im PDF werden dann die eingegebenen Werte genutzt.

### 2. Service Period anpassen
Aktuell: Start = 1. des aktuellen Monats, Ende = heute. Hier wird die Logik geändert, sodass standardmäßig der **vorherige Monat** als Service Period vorausgewählt wird (1. bis letzter Tag des Vormonats), da Credit Notes typischerweise für den abgelaufenen Monat erstellt werden. Die Felder bleiben weiterhin manuell anpassbar.

### 3. Payment Method Format umdrehen
Aktuell wird angezeigt: `Crypto (USDT)` – also Payment-Method-Text + Coin in Klammern. Stattdessen soll es **Coin (Netzwerk)** sein, z.B. `USDT (TRC20)`. 

Änderungen:
- Die Coin-Auswahl bleibt als Select (USDT, USDC, BTC, etc.)
- Statt dem freien Payment-Method-Feld kommt ein **Netzwerk-Feld** (z.B. TRC20, ERC20, BEP20, SOL, etc.) – entweder als Select oder als Input
- Im PDF wird ausgegeben: `USDT (TRC20)` statt `Crypto (USDT)`

### Technische Details

**Datei: `src/components/CreditNoteForm.tsx`**

- `ISSUER` Konstante entfernen → durch State-Variablen ersetzen (`issuerName`, `issuerAddress`, `issuerKvk`, `issuerVatId`) mit Defaults aus dem alten ISSUER-Objekt, persistiert im localStorage
- Neuer UI-Abschnitt "Issuer (Absender)" mit 4 Eingabefeldern oberhalb des Service-Provider-Abschnitts
- Service Period Defaults: `servicePeriodStart` = 1. des Vormonats, `servicePeriodEnd` = letzter Tag des Vormonats
- `paymentMethod` umbenennen zu `cryptoNetwork`, Placeholder z.B. "TRC20, ERC20, BEP20…"
- PDF-Zeile ändern von `Payment Method: ${paymentMethod} (${cryptoCoin})` zu `Payment Method: ${cryptoCoin} (${cryptoNetwork})`
- Footer und Legal-Bereich im PDF nutzen die dynamischen Issuer-Werte

