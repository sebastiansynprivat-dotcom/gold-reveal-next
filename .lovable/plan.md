

## Plan: QuickActionBar erweitern

### Änderungen

**1. `src/components/QuickActionBar.tsx`**
- Neuen Action-Eintrag "Bonusmodell" mit `Crown`-Icon hinzufügen (zwischen "Umsatz" und "Auszahlung")
- "Frage" umbenennen zu "Ich habe eine Frage"
- Neuen `case "bonus"` im `handleAction`-Switch: scrollt zum Bonus-Modell-Bereich
- Neue Prop `onScrollToBonus` im Interface hinzufügen
- `Crown` Icon importieren

**2. `src/pages/Dashboard.tsx`**
- `data-section="bonus"` Attribut auf den Bonus-Modell Container (ca. Zeile 1151) setzen
- `onScrollToBonus` Callback an `QuickActionBar` übergeben (querySelector + scrollIntoView, analog zu `onScrollToAccount`)

