# Fix "Umsatzverlauf" chart (Einnahmen tab)

## What's wrong

The chart is a **stacked** area chart (`stackId="1"` on every `Area`), so each line is drawn at the *cumulative* height, not at its own value:

- Maloum is rendered first, so its gold line is the bottom band — it always looks lowest even when it has the most revenue.
- Brezzels and 4Based lines sit on top of Maloum, so their height is `maloum + brezzels` etc. — they look bigger than they are.
- Because of the stacking, the Y axis spans the *sum* of all platforms (up to ~8k), so no line can be read against the axis. That's the "Y axis not calibrated" symptom.
- Days on which a platform has no row get no key at all in the aggregated data (`dateMap[date][key]` is only set when a row exists), which breaks the stack and creates additional jumps.
- The legend renders every platform in the registry (6 chips), while only Maloum, Brezzels and 4Based are actually plotted.

## Fix

1. **Unstack the areas.** Remove `stackId` so each platform area/line is drawn at its own revenue value — Maloum's gold line will be the highest when Maloum earns most. Lower the fill opacity slightly and order the areas so the largest platform in the current range is drawn first (behind), keeping smaller ones readable on top.
2. **Y axis calibrated to the plotted values.** Domain `[0, niceMax]` where `niceMax` is the largest single-platform daily value in the range, rounded up to a clean step (500 / 1k / 2k / 5k depending on magnitude), with evenly spaced ticks; keep the `k` formatting.
3. **Zero-fill missing days** in the aggregation so every date has a numeric value for every plotted platform — no gaps, no phantom jumps.
4. **Legend shows only plotted platforms**, using the exact same colors the `Area` strokes use, so chip color = line color 1:1.
5. **Ø reference line** stays the average per *active* day (as chosen), with the label clarified to `Ø 5,1k / aktiver Tag`. Since the areas are unstacked, the Ø line now refers to the daily total — it will be labelled as such so it can't be confused with a single platform's line.
6. **Tooltip** keeps per-platform values and additionally shows the daily total, so the numbers stay verifiable against the tiles above.

## Technical notes

- `src/pages/AdminDashboard.tsx`
  - `rangeData` memo (~line 2107): after building `dateMap`, fill every plotted platform key with `0` when absent.
  - Einnahmen block (~line 4950): derive the plotted keys from the keys actually present in `range` instead of the hardcoded tuple, and compute `niceMax` + a draw order sorted by range total.
  - Chart block (~lines 5533–5617): legend maps over the derived keys; `Area` loses `stackId`; `YAxis` gets `domain` and `ticks`; `ReferenceLine` label text updated; `Tooltip` gains a total row.
- No changes to the revenue fetching/aggregation queries or to any business logic — presentation only.
