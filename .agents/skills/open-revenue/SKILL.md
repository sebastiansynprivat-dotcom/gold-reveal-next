---
name: Open Revenue (Offener Umsatz)
description: Chatter billing card accumulates revenue since profiles.last_billed_month across multiple closed months and resets it after invoice download.
type: feature
---

## Rule
The Chatter-Dashboard billing card ("Abrechnungszeitraum") displays **offener Umsatz** = sum of every closed calendar month between `profiles.last_billed_month + 1 month` and the last full month before today. When the chatter downloads a PDF invoice via `/invoice`, `profiles.last_billed_month` is set to the last day of the month parsed from `periodTo` (dd.mm.yyyy). No `last_billed_month` yet ⇒ start counting from `profiles.created_at`.

## Details
- Column: `profiles.last_billed_month date NULL` (added via migration).
- Card labels switch between "Zeitraum" / "Umsatz {Monat}" (single month) and "Offener Zeitraum" / "Offener Umsatz (aufgelaufen)" (multi-month), plus italic breakdown like `Jan 20,00 € + Feb 40,00 €`.
- Unlock date + fee/50€ hint keep working; unlock is gated on `revenueKnown` so months without revenue don't show a stale button.
- Payout = openTotal × rate.
- Update happens after `doc.save(...)` in `src/pages/Invoice.tsx`; failure is swallowed with `console.warn`.
