# Dialog-Zentrierung & Layout fixen

## Problem
Pop-Ups (alle `<Dialog>`-basierten Modals im Dashboard) sind nicht mehr sauber mittig und teils oben/unten "abgeschnitten". Ursache liegt in `src/components/ui/dialog.tsx`:

- `w-full` ohne seitlichen Margin → auf Mobile bündig zum Rand
- `slide-in-from-top-[48%]` + `slide-in-from-left-1/2` Animationen erzeugen sichtbaren Versatz beim Öffnen, der bei mancher Render-Reihenfolge "stehen bleibt"
- Keine `max-height` + kein `overflow-y-auto` → langer Inhalt (z. B. Diamond-Dialog, Tutorial, Trustpilot) wird oben/unten abgeschnitten
- Übersetzungen `translate-x-[-50%]/translate-y-[-50%]` mit Tailwind-Bracket-Syntax — funktioniert, aber kombiniert mit den Slide-Animationen entsteht das verrutschte Erscheinungsbild

## Fix (eine Datei: `src/components/ui/dialog.tsx`)

`DialogContent`-Klassen ersetzen durch:
- `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` (saubere Zentrierung)
- `w-[calc(100%-2rem)] max-w-lg` (auf Mobile 1rem Abstand links/rechts)
- `max-h-[calc(100dvh-2rem)] overflow-y-auto` (nie mehr abgeschnitten, scrollt bei Bedarf)
- `bg-background` als Fallback (falls `glass-card` durch Override entfernt wird)
- Slide-Animationen entfernen, nur `fade-in-0 zoom-in-95` behalten → kein Versatz
- `overflow-hidden` raus (verhinderte Scroll bei langem Inhalt)

Das wirkt global auf **alle** Dashboard-Dialoge (Diamond-Streak, Loot-Box, Push-Opt-In, Trustpilot, Billing-Info, Gewerbe-Dialog, Frage-Memo, Account-Memo, Mass-DM, Tutorial, etc.), da alle die gemeinsame `Dialog`-Komponente nutzen.

## Geänderte Datei
- `src/components/ui/dialog.tsx`
