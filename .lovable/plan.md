## Ziel
Die neue 30-Tage-Challenge mit Account-Upgrade-Belohnung wird aktuell nicht in der Dashboard-Tour erklärt. Ich nehme sie als eigenen Tour-Schritt mit auf, sodass neue Chatter beim ersten Login direkt sehen, dass sie sich nach 30 Tagen ein Premium-Account-Upgrade verdienen können.

## Änderungen

**1. `src/components/ThirtyDayChallenge.tsx`**
- Dem äußeren Container ein `data-tour="thirty-day-challenge"` Attribut hinzufügen, damit die Tour das Element ansteuern kann.

**2. `src/components/DashboardOnboarding.tsx`**
- Neuen Tour-Step in `TOUR_STEPS` einfügen (sinnvoll direkt nach „Umsatz-Chart" oder vor „MassDM Generator", damit der Spannungsbogen passt):
  - selector: `[data-tour="thirty-day-challenge"]`
  - title: „30-Tage Starter-Challenge"
  - description: kurzer Text, der die Belohnung betont – z. B. „Bleib 30 Tage am Ball und qualifiziere dich für ein Account-Upgrade auf einen Premium Account mit deutlich mehr Traffic und Verdienst."
  - icon: `Crown` (oder `Trophy`) aus lucide-react – passend zum Reward-Framing in der Karte selbst.

Keine weiteren Komponenten/Logik betroffen. Die Tour-Mechanik (Scroll, Highlight, Tooltip-Position) funktioniert automatisch über den Selector.
