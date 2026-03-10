

# Plan: Casino-artige Sucht-Features

## 1. Live Activity Feed (Echtzeit-Ticker)

Ein animierter Ticker am oberen Rand des Dashboards, der anonymisierte Echtzeit-Events anderer Chatter zeigt. Erzeugt FOMO und Social Proof.

### Datenquelle
- Nutzt die existierende `daily_revenue`-Tabelle mit Supabase Realtime
- Realtime muss für `daily_revenue` aktiviert werden (Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_revenue`)
- Events werden anonymisiert angezeigt (z.B. "Ein Chatter hat gerade 150€ Umsatz eingetragen 🔥")

### UI-Komponente: `LiveActivityTicker.tsx`
- Horizontaler, automatisch scrollender Ticker-Balken direkt unter dem Header
- Goldenes, subtiles Design passend zum Theme (glass-card Stil)
- Neue Events sliden von rechts rein mit framer-motion
- Zeigt die letzten 5-8 Events, rotiert automatisch alle 4 Sekunden
- Event-Typen:
  - Umsatz eingetragen: "Ein Chatter hat gerade {amount}€ Umsatz gemacht 🔥"
  - Hoher Umsatz (>200€): "💎 Großer Umsatz! Ein Chatter hat {amount}€ gemacht!"
  - Streak-Meilenstein: statische Demo-Events als Fallback wenn wenig los ist

### Platzierung
- Im Dashboard zwischen Header und den Stats-Karten (vor NotificationBanner)

---

## 2. Sound-Effekte (Micro-Rewards)

Kurze, befriedigende Sounds bei bestimmten Aktionen. Kleine MP3-Dateien (jeweils <50KB), die im `/public/audio/sfx/`-Ordner liegen.

### Sound-Hook: `useSoundEffects.ts`
- Zentraler Hook mit Methoden wie `playCheckSound()`, `playStreakSound()`, `playLevelUpSound()`
- Respektiert eine globale Mute-Einstellung (localStorage: `sfx_muted`)
- Sounds werden als `new Audio()` abgespielt, einmalig gecacht

### Sounds (statische MP3-Dateien):
Da keine externen APIs nötig sind, verwende ich kurze, synthetisch erzeugte Sounds via Web Audio API (OscillatorNode) – keine Dateien nötig, alles inline generiert:

- **Check-Sound** (Checkbox abhaken): Kurzer aufsteigender Doppel-Ton (150ms)
- **Streak-Sound** (Streak fortgesetzt): Aufsteigende Tonfolge, 3 Noten (400ms)
- **Level-Up-Sound** (Tier aufgestiegen): Triumphale 4-Noten-Fanfare (600ms)
- **Coin-Sound** (Umsatz eingetragen): Münz-Kling (100ms)

### Integration
- `DailyChecklist.tsx`: Check-Sound beim Abhaken einer Aufgabe
- `StreakTracker.tsx`: Streak-Sound wenn Tages-Check gemacht wird
- `Dashboard.tsx`: Coin-Sound beim Umsatz-Speichern, Level-Up bei Tier-Aufstieg
- Mute-Toggle: Kleiner Lautsprecher-Icon im Header (Volume2/VolumeX)

---

## Technische Änderungen

| Datei | Änderung |
|-------|----------|
| **Neue Datei** `src/hooks/useSoundEffects.ts` | Web Audio API basierter Sound-Hook |
| **Neue Datei** `src/components/LiveActivityTicker.tsx` | Echtzeit-Ticker Komponente |
| `src/pages/Dashboard.tsx` | Ticker + Sounds einbinden, Mute-Toggle im Header |
| `src/components/DailyChecklist.tsx` | Check-Sound bei Aufgaben |
| `src/components/StreakTracker.tsx` | Streak-Sound |
| **Migration** | Realtime für daily_revenue aktivieren |

