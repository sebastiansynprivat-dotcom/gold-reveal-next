## Ziel

Im Admin-Bereich „Model Dashboard" soll der Revenue-Anteil pro Plattform individuell einstellbar sein (4Based, Maloum, Brezzels) — statt eines einzigen globalen Prozentsatzes. Die Werte werden pro Model gespeichert und für die Verdienst-Berechnung sowie die Provider Invoice (PDF + UI-Breakdown) verwendet.

## Änderungen

### 1. Datenbank (`models`)

Neue Spalten, alle `numeric` default `0`:
- `revenue_percentage_fourbased`
- `revenue_percentage_maloum`
- `revenue_percentage_brezzels`

Bestehendes Feld `revenue_percentage` bleibt als globaler Fallback bestehen (nicht entfernen — schützt Bestandsdaten).

### 2. Edit-Form „Einnahmen & Anteil" (`ModelDashboardTab.tsx`)

Im Bereich `Section "Einnahmen & Anteil"` (ca. Zeile 1128):

- Bestehender globaler Slider bleibt als „Standard %" (wird verwendet wenn plattform-spezifischer Wert = 0).
- Neuer Block **„Custom % pro Plattform"** mit drei kompakten Reihen:

```text
4Based   [—— 30% ——]   Umsatz: 1.250 €  →  Verdienst: 375 €
Maloum   [—— 25% ——]   Umsatz: 800 €    →  Verdienst: 200 €
Brezzels [—— 35% ——]   Umsatz: 0 €      →  Verdienst: 0 €
```

- Jede Zeile: Plattform-Label, Slider 0–100 (oder Number-Input), Live-Anzeige des Plattform-Umsatzes und resultierender Verdienst.
- Wenn Plattform-% = 0 → Hinweis „nutzt Standard ({revenue_percentage}%)".
- Werte landen in `modelForm.revenue_percentage_{platform}` und werden via `saveModel` gespeichert.

### 3. Verdienst-Berechnung (`verdienst` useMemo)

Neue Logik:
```ts
verdienst = sum( platformRevenue[p] * (modelForm.revenue_percentage_{p} || modelForm.revenue_percentage) / 100 )
```
für `p in [fourbased, maloum, brezzels]`. Anzeige des „Verdienst Model"-Blocks bleibt — Prozent-Label entfällt zugunsten von „berechnet aus Plattform-Anteilen".

### 4. CreditNoteForm

`CreditNoteForm` bekommt eine neue optionale Prop:
```ts
platformPercentages?: { fourbased: number; maloum: number; brezzels: number };
```

- Berechnung im PDF (Zeile 444) und im UI-Breakdown (Zeile 862–890): pro Plattform den eigenen Prozentsatz nehmen, Fallback auf `revenuePercentage`.
- `suggestedAmount` aus `ModelDashboardTab` ist bereits `verdienst` → automatisch korrekt.

### 5. Create-Dialog

Im „Neues Model anlegen"-Dialog wird der bisherige globale Slider beibehalten. Die Plattform-Prozentsätze werden erst nach dem Anlegen über das Edit-Panel gepflegt (kein zusätzliches Feld im Create-Flow, hält den Dialog schlank).

## Was nicht geändert wird

- Keine Änderungen an `chatters`, `model_dashboard`, `daily_revenue` oder Account-Logik.
- Keine Änderung an RLS — bestehende Model-Policies decken die neuen Spalten ab.
- Globaler Slider bleibt als Default/Fallback erhalten.
- Keine Migration für Bestandsdaten — alte Models behalten den globalen Wert, neue Plattform-Felder starten bei 0 und nutzen automatisch den Fallback.
