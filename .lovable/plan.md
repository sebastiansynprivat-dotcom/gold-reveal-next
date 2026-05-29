### Ziel
Im Admin Dashboard, Bereich "Custom Anfragen", die Typografie der Request-Cards anpassen:

1. **Model-Name**: Größer und fett gedruckt (z.B. `text-sm font-bold` statt aktuell `text-xs font-medium`)
2. **Chatter-Anfrage-Text** (`cleanDescription`): Fett gedruckt
3. **Standard-Floskeln** oben/unten ("Hey, eine neue Anfrage..." / "Gib mir bitte Feedback..."): Beibehalten bei aktueller Größe (`text-xs`)

### Dateien
- `src/pages/AdminDashboard.tsx` (Lines ~5235–5300)

### Umsetzung
- Model-Name Button: `text-xs` → `text-sm`, `font-medium` → `font-bold`
- `cleanDescription`: In `<span className="font-bold">` oder `<p className="font-bold">` wrappen
- Intro/Outro-Texte unverändert lassen