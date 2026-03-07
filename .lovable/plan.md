

## Plan: Ordnerstruktur & Account-Dialoge cleaner gestalten

### Zusammenfassung
Beide Account-Dialoge (Account-Pools und Freie Accounts) werden überarbeitet:
1. **"Account hinzufügen"-Formular immer oben** im Dialog (statt unten)
2. **Filter-Leiste** für Frei / Vergeben / Alle
3. **Cleaneres Design** mit einheitlichem Layout

### Änderungen in `src/pages/AdminDashboard.tsx`

#### 1. Account-Pool Dialog (ab Zeile ~3670)
- **Formular nach oben verschieben**: "Neuen Account hinzufügen"-Block kommt direkt nach dem Header (vor Stats und Account-Liste)
- **Filter-Buttons hinzufügen**: Drei Pill-Buttons ("Alle", "Frei", "Vergeben") über der Account-Liste
- Neuer State: `poolFilter: "alle" | "frei" | "vergeben"` — filtert `platformAccounts` vor dem Rendern
- Click-to-Copy für E-Mail und Passwort (wie bereits im Freie-Accounts-Dialog)

#### 2. Freie Accounts / Manual Platform Dialog (ab Zeile ~4148)
- **Formular nach oben verschieben**: "Neuen Account hinzufügen"-Block direkt nach Domain-Feld (vor Ordner-Grid und Account-Liste)
- **Filter-Buttons hinzufügen**: Gleiche Pill-Buttons ("Alle", "Frei", "Vergeben") zwischen Ordner-Bereich und Account-Karten
- Neuer State: `manualFilter: "alle" | "frei" | "vergeben"` — filtert angezeigte Accounts

#### 3. Design-Verbesserungen (beide Dialoge)
- Formular in einem einklappbaren/collapsible Bereich mit Accent-Border, standardmäßig offen
- Account-Karten: einheitliches Card-Design mit Status-Dot, Copy-Buttons für E-Mail/PW, Hover-Actions
- Filter-Pills mit Sliding-Indicator (Framer Motion) passend zum bestehenden Design-System
- Cleaner Spacing: konsistente `gap-3`, subtile Trennlinien statt harter Borders

#### 4. Neuer State
```text
poolFilter: "alle" | "frei" | "vergeben"   (default: "alle")
manualFilter: "alle" | "frei" | "vergeben" (default: "alle")
```

### Betroffene Datei
- `src/pages/AdminDashboard.tsx` — Beide Dialoge werden umstrukturiert (Reihenfolge der Sektionen, Filter-Logik, Design-Cleanup)

