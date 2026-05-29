# 🔥 Surge-Push: "Du bist on fire" Momentum-Benachrichtigung

Zusätzlich zur normalen Einnahmen-Push gibt es eine **zweite, seltenere Push-Up-Art**, die nur dann feuert, wenn ein echter Sales-Burst erkannt wird. Sie fasst zusammen, was in den letzten X Minuten reingekommen ist — als Dopamin-Booster.

## Trigger-Logik (im `ingest-revenue` Edge Function)

Nach jedem Insert wird geprüft, ob ein **Surge** vorliegt. Surge = einer von drei Auslösern:

1. **Burst-Window** — In den letzten **15 Minuten** ≥ **3 Sales** vom selben Chatter → "🔥 3 Sales in 12 Min von Name — €240 reingeholt!"
2. **Big-Sale** — Einzel-Sale ≥ **€100** → "💰 BIG ONE! €150 auf einen Schlag"

Cooldown: max. **1 Surge-Push pro Chatter pro 20 Min**, damit es selten und besonders bleibt.

## Inhalt der Surge-Push

```
Title:  🔥 HOT STREAK!
Body:   3 Sales in 12 Min · +€240 · Tages-Total €580
        Tier: Crusher → noch €120 bis Beast Mode
Image:  Flammen/Lightning-Visual (Apple zeigt's rich)
Tag:    surge-{userId}  (überschreibt vorherige Surge-Push)
```

Unterschied zur normalen Push: anderes Icon (🔥 statt 🟢/🔴), aggressivere Sprache, zeigt explizit **Geschwindigkeit** ("in X Min") statt nur Betrag.

## Daten-Quelle

- Query auf `daily_revenue` für aktuellen User, letzte 15 Min → Burst-Check
- Aktuelles Tages-Total bereits vorhanden im Function
- Tier/Next-Tier aus bestehender Bonus-Logik (`mem://features/bonus-system`)

## State-Tracking für Cooldown

Neue Spalte `last_surge_push_at` auf `profiles` (oder kleine `surge_push_log` Tabelle wenn sauberer). Vor dem Senden prüfen: `now() - last_surge_push_at > 20 min`.

## Optional (wenn gewünscht)

- **Platform-spezifisch**: Surge nur für 4Based (höchste Tickets)
- **Sound**: Auf Android Casino-Jackpot-Sound, Apple bekommt nur den rich Visual
- **Admin-Channel**: Surge-Pushes auch an Super-Admins als "🔥 {Chatter} on fire" für FOMO im Team

## Technische Änderungen

- `supabase/functions/ingest-revenue/index.ts` — Surge-Detection + zweite `sendPush` Branch
- Migration: `profiles.last_surge_push_at TIMESTAMPTZ` (+ GRANT bleibt wie ist)
- Neue Helper: `detectSurge(userId, newAmount, todayTotal)` → returns Surge-Type oder null