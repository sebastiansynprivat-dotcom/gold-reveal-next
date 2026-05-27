## Ziel

Die Seite wirkt aktuell sehr flach: reiner schwarzer Hintergrund (`hsl(0 0% 4%)`) und Glass Cards mit nur 12px Blur und niedriger Sättigung. Wir heben das auf ein Premium-Niveau, ohne Funktionen oder Layout zu ändern – nur Background + Glass werden aufgewertet.

## Was sich ändert

### 1. Premium-Hintergrund (statt reinem Schwarz)

In `src/index.css` einen geschichteten Background hinter `body` legen, der über die gesamte App liegt:

- **Basis:** sehr dunkles Anthrazit (`hsl(0 0% 3%)`) statt reinem Schwarz – wärmerer, edlerer Look.
- **Gold-Auren:** zwei große, weiche radial-gradients in Gold-Tönen (oben links + unten rechts), sehr niedrige Opacity (~6–10%), `fixed`, damit sie beim Scrollen ruhig liegen.
- **Subtiles Mesh:** ein dritter, mittiger radial-gradient in einem leicht wärmeren Bronze-Ton, ebenfalls sehr dezent.
- **Vignette:** dunkler Rand über alles, damit der Content im Zentrum „leuchtet".
- **Noise/Grain-Layer (optional, sehr leicht):** SVG-Noise als data-URI mit `opacity: 0.025` – nimmt dem Verlauf das Banding und gibt Tiefe.

Umsetzung als `body::before` und `body::after` (fixed, `pointer-events: none`, `z-index: -1`), damit kein bestehendes Markup angefasst werden muss. Die goldenen Particles (bereits aktiv) bleiben unverändert und liegen darüber.

### 2. Stärkeres Glassmorphism

`.glass-card` und `.glass-card-subtle` in `src/index.css` aufwerten:

- **Blur** von 12px → 20px, **Saturate** 140% → 180%.
- **Hintergrund:** statt flachem `hsl(0 0% 8% / 0.72)` ein leichter linearer Gradient von `hsl(0 0% 10% / 0.55)` nach `hsl(0 0% 6% / 0.75)` – das gibt der Glasfläche eine Lichtkante.
- **Border:** zarter Gold-Tint mit höherer Transparenz (`hsl(43 40% 55% / 0.18)`).
- **Inner Highlight:** zusätzlicher `inset 0 1px 0 hsl(43 56% 72% / 0.08)` für die typische „Glaskante oben".
- **Outer Shadow:** weicher, tiefer Schatten (`0 20px 50px -20px hsl(0 0% 0% / 0.6)`) damit Cards vom Hintergrund abheben.

Mobile-Fallback (bereits vorhanden) bleibt erhalten – dort wird Blur weiterhin deaktiviert, aber die neue Gradient-Fläche und der Inner-Highlight bleiben, sodass der Premium-Look auch ohne Backdrop-Filter funktioniert.

### 3. Keine Layout- oder Komponentenänderungen

Es werden **keine** Komponenten umgebaut. Alle Cards, die bereits `glass-card` / `glass-card-subtle` nutzen, profitieren automatisch. Der neue Background ersetzt das einfache Schwarz global.

## Betroffene Dateien

- `src/index.css` – Background-Layer (`body::before`, `body::after`), Glass-Tokens aufgewertet.

## Optional (nur falls gewünscht)

- Hintergrund leicht **animiert** (sehr langsamer Drift der Gold-Auren, ~40s Loop) für einen lebendigen, aber dezenten „Atem"-Effekt.

Sag Bescheid, wenn ich den Drift mit reinnehmen soll – sonst baue ich es statisch.
