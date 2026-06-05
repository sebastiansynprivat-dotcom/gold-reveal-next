## Stop data spillover between "Earnings" and "Earnings & Share"

In `ModelDashboardTab.tsx`, the **Einnahmen & Anteil** section is currently leaking the Earnings dashboard's "Gesamtumsatz" value, which is derived from `accounts_data`. That section is the provider-invoice / share-calc context and must be sourced exclusively from `payout_revenue` + the "Anteil berechnen" result.

### Data-source contract (enforced going forward)

| UI section | Source of truth |
|---|---|
| Earnings (period selector, hero "Gesamtumsatz", platform cards, chart) — line ~1596+ | `accounts_data.total` (already correct) |
| **Einnahmen & Anteil** (fetch revenue panel, Abrechnungsmonat, Gesamtumsatz card) — line 1951+ | `payout_revenue` only; the displayed "Gesamtumsatz" = result of `Anteil berechnen` (`billingShare`) |

These two card groups must never share state. No `accounts_data`-derived value (`totalRevenue`, `dashboardRevenues`, `platformRevenues`) may render inside the Einnahmen & Anteil section.

### Code changes

**`src/components/ModelDashboardTab.tsx`** — Gesamtumsatz card inside Einnahmen & Anteil (lines 2196-2203)

Replace the `totalRevenue`-driven block with a `billingShare`-driven block:

- Show the card only when `shareCalculated && billingShare > 0`.
- Label: `Gesamtanteil` (or keep "Gesamtumsatz" wording if preferred — confirm in build) reflecting that it's the calculated share, not raw revenue.
- Value: `<AnimatedGoldValue value={billingShare} suffix={\` ${modelForm.currency || "EUR"}\`} />`.
- Remove all references to `totalRevenue` / `dashboardRevenues` from this section (line 1604's hero stays — it belongs to the Earnings section above and is correctly fed by `accounts_data`).

No other code paths change. The `accounts_data` effect at line 531+ keeps powering the Earnings hero/platform cards/chart. The `payout_revenue` effect at line 604+ and the `Anteil berechnen` handler at line 2089+ keep powering Einnahmen & Anteil.

### Memory

Save a project memory `mem://features/model-dashboard-data-sources` capturing the contract above so future edits don't reintroduce the spillover, and add a one-line reference to `mem://index.md`.

### Out of scope

- No changes to the Earnings section, the `accounts_data` RPC, the chatter Dashboard, or `payout_revenue` fetch/calc logic.
- No schema or RLS changes.
