

## Plan: Custom Anfragen visuell besser unterteilen

### Problem
Die einzelnen Anfragen-Karten im Admin Dashboard sind visuell zu ähnlich und verschmelzen optisch — besonders bei vielen Einträgen schwer zu unterscheiden.

### Änderungen in `src/pages/AdminDashboard.tsx`

1. **Gold-Akzent-Linie oben an jeder Karte**: Jede Anfrage-Karte bekommt eine goldene Top-Border-Linie (gradient von transparent → gold → transparent), ähnlich dem bestehenden `card-top-line` Pattern.

2. **Mehr Abstand zwischen Karten**: `space-y-2` → `space-y-4` für deutlichere Trennung.

3. **Subtiler Gold-Hover-Glow**: `card-hover-glow` CSS-Klasse auf jede Karte, damit beim Hovern ein goldener Top-Glow erscheint.

4. **Gold-Akzent auf dem Avatar-Initial**: Das Buchstaben-Icon links bekommt einen dezenten goldenen Ring/Glow statt nur `bg-accent/10`.

5. **Trennlinie zwischen Karten**: Statt nur Spacing eine feine horizontale Gold-Gradient-Linie als Separator zwischen den Karten (außer nach der letzten).

6. **Status-abhängiger linker Rand**: Jede Karte bekommt einen 2px `border-left` in der jeweiligen Status-Farbe (gelb für offen, grün für angenommen, blau für in Arbeit, rot für abgelehnt) — so erkennt man den Status sofort auf einen Blick.

### Betroffene Stelle
- Zeilen ~3056-3072: Container `space-y` und Karten-Wrapper mit zusätzlichen CSS-Klassen
- Zeilen ~3078-3082: Avatar-Styling aufwerten
- Zeile ~3108: Bestehende `h-px bg-border/30` Trennlinie durch goldene Variante ersetzen

