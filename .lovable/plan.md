## Problem

Im Mitarbeiter-Dashboard teilen sich alle Chatter dieselbe Provider-Daten (Name, Adresse, USt-ID etc.), weil:

1. **React recycelt die Komponente**: Wenn du von Julian zu Rose wechselst, wird `CreditNoteForm` nicht neu gemountet — React reused die Instanz. Der `useState`-Initialwert (`loadSaved()`) wird nur beim **ersten** Mount ausgeführt.
2. Die localStorage-Keys sind zwar pro Chatter getrennt (`credit-note-form-Julian`, `credit-note-form-Rose`), aber die States werden beim Wechsel nicht neu geladen.

## Lösung

### 2. Alternative (einfacher): `key`-Prop in `ChatterDashboardTab.tsx`

Statt den Effect manuell zu schreiben, kann man React zwingen, die Komponente komplett neu zu mounten, indem ein `key` gesetzt wird:

```tsx
<CreditNoteForm
  key={selected.id}  // Force remount bei Chatter-Wechsel
  suggestedAmount={verdienst}
  ...
/>
```

**Empfehlung**: Option 2 (key-Prop) — eine Zeile, sauber, kein Risiko vergessener States. Wird in beiden Stellen angewendet: `ChatterDashboardTab.tsx` und `ModelDashboardTab.tsx`.