

## Plan: Streak-Completion Pop-Up mit Konfetti, WhatsApp-Weiterleitung und Demo-Modus

### Aktueller Stand
Der `StreakTracker` erkennt bereits, wenn 7 Tage in Folge 30 € erreicht wurden, zeigt einen Toast und feuert Konfetti. Es fehlt aber ein richtiges Pop-Up-Dialog mit Nachricht und WhatsApp-Link. Außerdem gibt es keinen Demo-Button.

### Änderungen

**1. StreakTracker.tsx — Pop-Up Dialog bei 7-Tage-Streak**
- State `showStreakDialog` hinzufügen, der bei Streak-Completion auf `true` gesetzt wird
- Dialog mit:
  - Konfetti-Animation beim Öffnen
  - Glückwunsch-Nachricht ("7 Tage in Folge geschafft! Du bekommst jetzt einen besseren Account.")
  - Hinweis: "Melde dich bitte in deiner WhatsApp-Gruppe"
  - Vorbereiteter Standardtext zum Kopieren, z.B.: *"Hey, ich habe die 7-Tage-Challenge geschafft! 🔥 Ich möchte gerne mein Account-Upgrade erhalten."*
  - Button "Nachricht senden" → öffnet `https://wa.me/?text=...` (WhatsApp Web/App "Senden an"-Ansicht mit vorausgefülltem Text)
  - Kopier-Button für den Text

**2. Demo-Button**
- Kleiner "Demo"-Button (nur visuell, z.B. unter dem Streak-Tracker oder als kleines Icon)
- Klick simuliert einen vollen 7-Tage-Streak: setzt temporär alle 7 Tage auf "completed", zeigt den Dialog mit Konfetti
- Nach Schließen des Dialogs wird der Streak wieder auf den echten Stand zurückgesetzt

### Technische Details

- Dialog verwendet bestehende `Dialog`/`DialogContent` Komponenten aus `@/components/ui/dialog`
- WhatsApp-Link: `https://wa.me/?text=${encodeURIComponent(text)}` — öffnet die "Senden an"-Ansicht
- Konfetti wird über `canvas-confetti` gefeuert (bereits importiert)
- Demo-State: `demoMode` boolean, bei `true` werden die letzten 7 Tage als completed angezeigt und Dialog geöffnet
- Kein Datenbankzugriff nötig, alles client-side in `StreakTracker.tsx`

