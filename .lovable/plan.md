## Ziel

Der Morgen-Dialog erklärt aktuell zu vage, was der Priority Pool bringt. Das Ganze soll **spielerischer, klarer und dopamin-lastiger** werden — und nach dem Commit soll auf dem Dashboard eine feste "Commitment-Card" stehen, die den ganzen Tag sichtbar bleibt (Streak, gewählte Slots, Motivationsspruch, Fortschritt).

Alles bleibt hinter dem `isCommitmentTester`-Flag — nur `sebastianpushtest@gmail.com` sieht es.

## Umsetzung

### 1. Morgen-Dialog aufwerten (`CommitmentPrompt.tsx`)

**Neuer Step 1 — "Was du bekommst" (Onboarding-Screen, nur beim allerersten Commit oder alle 7 Tage einmal):**
- 3 klare Benefit-Kacheln mit Icons:
  - 🏆 **Priority Pool** — "Neue Top-Models & VIP-Kunden gehen zuerst an zuverlässige Chatter"
  - 💰 **Höhere Tier-Stufen** — "Ab 7 Tagen Streak: +5% Commission-Boost"
  - ⚡ **Sofort-Zugriff** — "Content-Drops & neue Accounts siehst du 2h früher"
- Kleine Progress-Bar unten: "So funktioniert's" → Slots wählen → Ziel setzen → dranbleiben.

**Step 2 (Slots) — mit Live-Feedback:**
- Nach Slot-Auswahl erscheint ein kleiner grüner Badge: "Du deckst X von 4 Slots ab — Zuverlässigkeits-Score: XX%".
- Wer alle 4 wählt, sieht ein "🔥 Vollzeit-Committer"-Badge mit Glow.

**Step 3 (Goal-Slider) — Kontext dazu:**
- Unter dem Slider: "Ø deiner letzten 7 Tage: XXX€" (aus `daily_revenue` gezogen) — hilft realistisch zu setzen.
- Bei Goal > Ø: "Ambitioniert 💪" | bei ≤ Ø: "Sicher & solide ✅".

**Step 4 (neu) — "Dein Wort":**
- Statt nur Sparkles: **Streak-Anzeige groß in der Mitte** (aktueller Streak in Tagen, mit Flammen-Icon).
- Motivationsspruch des Tages (Rotation aus ~30 Sprüchen, deterministisch per Datum → gleicher Spruch für alle den ganzen Tag). Beispiele:
  - "Ein Mann ist nur so viel wert wie sein Wort."
  - "Disziplin schlägt Motivation. Jeden Tag."
  - "Der einzige Wettbewerb ist der von gestern."
- Confetti-Burst beim Bestätigen + Sound (`useSoundEffects`).

### 2. Neue Dashboard-Card: "Heutiger Commit" (`CommitmentCard.tsx`, neu)

Erscheint auf dem Dashboard **nachdem** der User committed hat, ersetzt keinen bestehenden Slot — wird oben eingehängt (nur für Tester sichtbar).

Inhalt:
```
┌─────────────────────────────────────┐
│  🔥 5-Tage-Streak     Ziel: 200€    │
│                                      │
│  ✓ Morgens  ✓ Mittags  ○ Abends     │
│                                      │
│  ▓▓▓▓▓▓▓░░░  145€ / 200€ (72%)      │
│                                      │
│  "Disziplin schlägt Motivation."     │
│                                      │
│  ⏰ Nächster Check-in: 21:00        │
└─────────────────────────────────────┘
```

- Streak-Zahl mit goldenem Glow (nutze `hot-streak-visuals`-Style aus Memory).
- Fortschrittsbar = heutiger Umsatz vs. Goal (live aus `daily_revenue`).
- Bei ≥100% Ziel: Card wechselt auf grün-golden, Badge "✅ Ziel erreicht — Streak safe".
- Bei ≥85%: Pulsing-Effekt (siehe `gamification-urgency` memory).
- Countdown zum Abend-Check-in.

### 3. Abend-Check-in aufwerten

Zusätzlich zu der Ehrlichkeits-Info: nach "Ja"-Klick → **Reward-Screen** statt nur Toast:
- Streak-Zahl animiert +1 hoch (`AnimatedNumber`).
- Confetti + Sound.
- Bei Milestone-Streaks (3, 7, 14, 30) → `LootBoxReward`-Trigger.
- Bei "Nein" → warmer, nicht-strafender Screen: "Morgen ist ein neuer Tag. Streak pausiert, nicht verloren."

### 4. Motivationssprüche-Pool

Neue Datei `src/lib/commitmentQuotes.ts` mit ~30 DE/EN-Sprüchen. Deterministische Auswahl: `quotes[dayOfYear % quotes.length]` → alle Tester sehen denselben Spruch pro Tag, aber täglich rotiert.

### 5. Guardrails

- Alles ausschließlich hinter `isCommitmentTester(user.id)`.
- `CommitmentCard` rendert `null`, wenn kein Commit für heute existiert oder User nicht in Allowlist.
- Kein Backend-Change nötig — Streak lässt sich aus vorhandenen `chatter_daily_commitment`-Rows berechnen (COUNT consecutive days mit `confirmed_by_user=true`).

## Technische Details

- **Streak-Berechnung:** kleine Helper-Function `getCurrentStreak(userId)` — holt letzte 30 Rows nach Datum, zählt rückwärts consecutive `confirmed_by_user=true` (heute erlaubt `null`, weil noch nicht bestätigt).
- **Ø-Umsatz:** Aggregation aus `daily_revenue` letzte 7 Tage, gecached im Component-State.
- **Sound:** `useSoundEffects().play("success")` beim Commit-Speichern + beim "Ja".
- **Confetti:** `canvas-confetti` (bereits im Projekt für Streak-Celebration verwendet).
- **Debug-Panel bekommt einen Button dazu:** "Streak +1 simulieren" (fügt Fake-Row für gestern ein), damit sich alle Milestone-States testen lassen.

## Was du danach testen kannst

- `/dashboard?commit=1` → neuer aufgeblasener Dialog mit Benefits, Live-Score, Motivationsspruch, Confetti.
- Nach Commit: Dashboard zeigt **CommitmentCard** oben.
- `/dashboard?checkin=1` → Reward-Animation beim "Ja".
- Debug-Panel: "Streak +6 simulieren" → beim nächsten "Ja" triggert 7-Tage-LootBox.
