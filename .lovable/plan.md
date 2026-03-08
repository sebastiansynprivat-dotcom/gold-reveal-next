

## Problem

Der "Auto-Zuweisen"-Button bei freien Accounts feuert direkt ohne Bestätigung — es kommt nur ein kleiner Toast. Das fühlt sich nicht premium an und bietet keine Kontrolle.

## Plan

### Neues Bestätigungs-Dialog für Auto-Zuweisen

Einen hochwertigen Confirmation-Dialog erstellen, der dem bestehenden Admin-Design-System folgt (Glassmorphismus, Gold-Akzente, Framer Motion Animationen):

**Dialog-Inhalt:**
- Icon-Header mit goldenem Akzent (wie beim "Accounts verwalten"-Dialog)
- Zusammenfassung: Plattform, Anzahl freier Accounts, Anzahl unversorgter Chatter
- Animierter Fortschrittsindikator während der Zuweisung
- Ergebnis-Anzeige nach Abschluss (Anzahl zugewiesener Accounts mit Erfolgs-Animation)

**Flow:**
1. Klick auf "Auto-Zuweisen" → Dialog öffnet sich mit Übersicht
2. User bestätigt → Ladeanimation mit Spinner + Statustext
3. Ergebnis wird im selben Dialog angezeigt (Confetti/Checkmark bei Erfolg)
4. "Schließen"-Button beendet den Dialog

**Technische Umsetzung in `AdminDashboard.tsx`:**
- Neuer State: `assignConfirmOpen`, `assignResult`
- Button öffnet Dialog statt direkt `assignAccounts()` aufzurufen
- Dialog nutzt bestehende `Dialog`/`DialogContent` Komponenten mit glass-card Styling
- Framer Motion für Ein-/Ausblende-Animationen der Zustände (Bestätigung → Loading → Ergebnis)
- Plattform-Badge mit Farbe aus `PLATFORM_COLORS`

