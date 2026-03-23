

# Offer C: Neue Seite basierend auf Offer B für FansyMe

## Zusammenfassung
- Bestehende `OfferC.tsx` löschen und durch eine Kopie von `OfferB.tsx` ersetzen
- Plattformname ändern: "Brezzels" → "FansyMe"
- Video 1 (Plattform Erklärungs Video) URL ändern auf: `https://www.loom.com/embed/e05514625bb54af192324d6d51be1f27?sid=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`
- Video 2 (Telegram Video) bleibt gleich
- Storage Keys anpassen (`offerC-countdown-start`, `offerc-completed-steps`)

## Änderungen

### 1. `src/pages/OfferC.tsx` — komplett ersetzen
- Kopie von OfferB mit folgenden Anpassungen:
  - Überschrift: "Kurze Anleitung für deinen Start mit **FansyMe**"
  - `COUNTDOWN_KEY` → `"offerC-countdown-start"`
  - `STORAGE_KEY` → `"offerc-completed-steps"`
  - Video 1 embedUrl → Loom-Link `e05514625bb54af192324d6d51be1f27`
  - Links-Sektion: Notification Bot und MyID Bot Links bleiben gleich (oder anpassen falls FansyMe eigene hat — erstmal gleich lassen)
  - Export als `OfferC`

### 2. `src/App.tsx` — keine Änderung nötig
Route `/offer-c` und Import existieren bereits.

