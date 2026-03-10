# Conversion-Optimierung für Offer A (Maloum-Seite)

## Aktuelle Situation

Die Seite ist funktional, aber relativ nüchtern: Logo, Überschrift, 3 Videos, 2 Links. Kein Gefühl von Dringlichkeit, kein persönliches Commitment, keine Fortschrittsanzeige. Der User kommt rein und sieht eine "Anleitung" -- das motiviert nicht.

## Änderungen

### 1. Welcome-Popup aufwerten: "Dein Platz ist reserviert"

Das bestehende Popup wird erweitert:

- Statt nur "Eine Nachricht von Sebastian" → **"Glückwunsch -- dein Platz ist reserviert!"** als Headline
- Darunter: Countdown-Timer (2 Stunden), der suggeriert, dass der Platz nur temporär gehalten wird
- Kleiner Text: "Schließe die Einrichtung in den nächsten 2 Stunden ab, um deinen Platz zu sichern"
- Die Audio-Nachricht bleibt
- Button-Text: "Jetzt einrichten & Platz sichern 🔒"

### 2. Sticky Urgency-Bar oben auf der Seite

Nach dem Popup-Schließen eine fixierte Leiste oben auf der Seite:

- Links: "🔒 Dein Platz ist reserviert"
- Rechts: Countdown-Timer (2 Stunden, läuft weiter vom Popup)
- Dezentes Gold-Styling, bleibt beim Scrollen sichtbar
- Erzeugt permanenten Handlungsdruck

### 4. Motivations-Banner nach dem Hero

Unter der Überschrift ein glassmorphism-Banner:

- "✅ Du hast es geschafft! Jetzt nur noch ein kurze Schritte und du kannst loslegen und Geld verdienen"
- Verstärkt das Commitment nach dem Quiz

## Technische Details

**Dateien:**

- `src/pages/OfferA.tsx` -- Hauptänderungen: Popup-Redesign, Sticky-Bar, Checkliste, Motivations-Banner, Sticky-CTA
- Neuer State: `completedSteps` (Set, localStorage-persistiert), `timeLeft` (Countdown von 15 Min)
- Countdown startet beim ersten Laden, wird im `sessionStorage` gespeichert (reset pro Session)
- Nutzt bestehende Komponenten: `Progress`, `Checkbox`, `framer-motion`
- `StepBadge` und Checklisten-Logik können aus OfferB übernommen werden

Keine neuen Dependencies, keine DB-Änderungen nötig.