## Ziel
Eine neue Sektion **"Inspirations-PDFs"** im Chatter-Dashboard, die zum Klicken verleitet und einen sozialen Beweis enthält ("Chatter, die diese PDFs lesen, machen im Schnitt 2× so viel Umsatz"). Erstmal **als Platzhalter** ohne echte PDFs – Inhalte/Feinschliff folgen, sobald du den Look abgesegnet hast.

## Platzierung
Im Hauptbereich des Chatter-Dashboards (`src/pages/Dashboard.tsx`), direkt **unter dem Revenue-Chart und MonthSummaryWidget**, oberhalb der LootBox. So liegt es im natürlichen Lesefluss nach den Performance-Kennzahlen – genau da, wo der Chatter denkt "Wie verbessere ich mich?".

Zusätzlich:
- **Quick-Action-Button** in der `QuickActionBar` (Desktop) und im Mobile Quick-Action-Grid, der per `scrollIntoView` zur Sektion springt → schnelle Erreichbarkeit von oben.

## Optik (Platzhalter, dem bestehenden Design-System folgend)

Premium Black & Gold Glass-Card mit klarem Klick-Anreiz:

```text
┌──────────────────────────────────────────────────────────┐
│  📚  INSPIRATIONS-BIBLIOTHEK            [NEU pulsierend] │
│                                                          │
│  Chatter, die diese PDFs lesen, machen im Schnitt        │
│  2× so viel Umsatz wie der Durchschnitt.                 │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  PDF 1  │  │  PDF 2  │  │  PDF 3  │  │  +mehr  │    │
│  │ Coaching│  │ Skripte │  │ Verkauf │  │         │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                                                          │
│         [  Jetzt durchlesen  →  ]                        │
└──────────────────────────────────────────────────────────┘
```

Design-Details:
- `gold-gradient-border-animated` Glass-Card mit `pulse-glow` (gleicher Stil wie Status-Karte)
- Kopfzeile mit `BookOpen`-Icon in Gold, Titel "Inspirations-Bibliothek"
- Animiertes "NEU"-Badge (Framer Motion, golden pulsierend)
- Hook-Text in Gold-Gradient: *"Chatter, die diese PDFs lesen, machen im Schnitt 2× so viel Umsatz."*
- 3–4 Platzhalter-PDF-Karten als horizontale Reihe (auf Mobile scrollbar):
  - Mini-Karte: kleines PDF-Icon, Platzhalter-Titel ("Coaching #1", "Verkaufs-Skripte", "Top-Chats"), kurze Subline
  - Hover: leicht skalieren + Gold-Glow
  - Klick: aktuell nur `toast.info("Bald verfügbar")` – echte Verlinkung später
- Großer goldener CTA-Button "Jetzt durchlesen →"
- Sound-Effekt beim Klick (gleiche Casino-Sounds wie Rest der App)
- `data-section="inspiration"` und `data-tour="inspiration"` für Tour & QuickAction

## Technische Umsetzung

**Neue Datei:** `src/components/InspirationLibrary.tsx`
- Self-contained Komponente mit Platzhalter-Daten (Array `placeholderPdfs`)
- Framer Motion für Card-Animation und Hover-Effekte
- `playSound("click")` aus dem bestehenden Sound-System

**Edit:** `src/pages/Dashboard.tsx`
- Import + Einbau nach `MonthSummaryWidget` (Zeile ~1000)
- `data-section="inspiration"`-Wrapper

**Edit:** `src/components/QuickActionBar.tsx`
- Neuer Button "Inspirationen" mit `BookOpen`-Icon
- `onScrollToInspiration`-Prop nach demselben Schema wie `onScrollToBonus`

**Keine** Backend-/DB-Änderungen, **keine** echten PDFs in diesem Schritt – alles Platzhalter.

## Was du danach noch beurteilen kannst
- Position im Dashboard richtig?
- Statistik-Text ("2× so viel Umsatz") so okay oder andere Zahl?
- Anzahl Platzhalter-Karten (3, 4, 6)?
- Sobald optisch passt: echte PDFs hochladen + verlinken.