

# Chatter Dashboard – Neue Unterseite `/dashboard`

## Überblick

Eine neue, mobile-first Dashboard-Seite im bestehenden Schwarz-Gold-Design mit vier Bereichen: Plattform-Header, Telegram-ID-Eingabe, Earnings-Dashboard mit Bonus-System und KI-Chat-Support.

## Seitenstruktur

```text
┌────────────────────────────────┐
│  Logo + "Aktiv auf: [Plattform]" │  ← URL-Param ?platform=Brezzels
├────────────────────────────────┤
│  Telegram ID Eingabefeld       │  ← localStorage-Persistenz
├────────────────────────────────┤
│  Earnings Dashboard            │
│  ┌──────────┐ ┌──────────┐    │
│  │ Umsatz   │ │ Verdienst│    │
│  └──────────┘ └──────────┘    │
│  [Umsatz-Eingabefeld zum Test] │
│  ┌─ Status: Starter / Gold ──┐ │
│  │ Progress-Bar → 2.000€     │ │
│  │ 20% → 25% Gold-Status     │ │
│  └───────────────────────────┘ │
│  🎆 Konfetti bei Gold-Status   │
├────────────────────────────────┤
│  KI-Chat (fixiert unten)       │
│  FAQ-fähig + freie Fragen      │
└────────────────────────────────┘
```

## Neue Dateien

### 1. `src/pages/Dashboard.tsx`
Hauptseite mit allen vier Bereichen:

- **Plattform-Header**: Liest `?platform=` aus URL-Params, Fallback "Brezzels"
- **Telegram-ID**: Input + Speichern-Button, persistiert in `localStorage`
- **Earnings-Dashboard**:
  - Umsatz-Eingabefeld (Slider oder Input) zum Testen
  - Berechnung: unter 2.000€ → 20%, ab 2.000€ → 25% auf alles
  - Goldene Progress-Bar (vorhandene `Progress`-Komponente) Richtung 2.000€
  - Status-Badge "Starter" vs "Gold-Status" mit Animation
  - `canvas-confetti` (bereits installiert!) bei Erreichen von 2.000€
- **Verdienst-Anzeige**: Zwei glass-cards mit Umsatz und errechnetem Verdienst

### 2. `supabase/functions/chat/index.ts`
Edge Function für KI-Chat via Lovable AI Gateway:
- System-Prompt auf Deutsch mit Brezzels-Kontext und FAQ-Wissen eingebaut
- FAQ-Antworten im System-Prompt: Auszahlung, Rate erhöhen, technische Probleme
- Streaming SSE, Fehlerbehandlung (429/402)
- Model: `google/gemini-3-flash-preview`

### 3. `src/components/DashboardChat.tsx`
Chat-Komponente fixiert am unteren Rand:
- Eingabefeld + Senden-Button
- Streaming token-by-token Rendering
- Collapsed/Expanded-Toggle
- Glass-Morphism Styling
- Mobile: volle Breite, Desktop: max-width Panel

## Bestehende Dateien

### `src/App.tsx`
- Neue Route `/dashboard` → `<Dashboard />`

## Technische Details

- Bonus-Logik rein im Frontend: `verdienst = umsatz >= 2000 ? umsatz * 0.25 : umsatz * 0.20`
- Konfetti via `canvas-confetti` (bereits als Dependency vorhanden)
- Chat streamt via `fetch` + SSE-Parsing direkt an die Edge Function
- Kein Auth nötig, `verify_jwt = false` für die Chat-Funktion
- Alle Texte auf Deutsch

