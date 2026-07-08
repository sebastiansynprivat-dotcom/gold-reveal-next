# Daily Commitment Ritual – v3 (Honesty-Framing im Evening Prompt)

Rest des Plans (Morgen-Push, 3-Step Dialog, Slot-Chips, Streak-Tiers, Priority-Framing, Admin-Panel, Auto-Confirm via Revenue-Event) bleibt wie in v2. **Neu: das Evening-Confirm-Popup bekommt einen Honesty-Layer.**

---

## Warum

Wenn die Ja/Nein-Frage rein selbst-deklariert wirkt, ist die Versuchung zu lügen zu groß. Wir brauchen einen sanften Hinweis, dass wir **stichprobenartig gegenchecken** – ohne dass es nach Überwachung oder Drohung klingt. Ehrliches "Nein" darf keinen Schaden anrichten, unehrliches "Ja" muss teurer sein als ein ehrliches "Nein".

Psychologisch nutzen wir zwei Effekte:
- **Observer-Effekt / Honor-Code** (Mazar-Amir-Ariely 2008): Schon der bloße Hinweis auf mögliche Kontrolle senkt Lügen-Rate massiv, ohne dass wirklich flächendeckend geprüft werden muss.
- **Asymmetrische Konsequenz**: Ehrlich "Nein" = neutral. Unehrlich "Ja" = deutlicher Tier-Rückschritt. Das macht Ehrlichkeit zur dominanten Strategie.

---

## Neues Evening-Confirm-Popup (21:30)

**Layout:** Glass-Card, gold-akzentuiert. 3 Elemente:

1. **Frage (fett):** *"Warst du heute wie versprochen für deine Models da?"*
2. **Sub-Text (klein, gold-transparent):**
   > *"Kurze Info: Wir gleichen deine Antwort automatisch mit Login- und Sale-Aktivität ab. Ehrliches „Nein" kostet dich nichts – dein Streak pausiert einfach. Ein „Ja", das nicht passt, kostet dich eine Tier-Stufe. Ehrlichkeit lohnt sich hier immer."*
3. **Zwei CTAs:**
   - ✅ *"Ja, war ich"* (gold, primary)
   - 😔 *"Heute nicht geschafft"* (glass, secondary — bewusst nicht negativ formuliert)

Kein "Vielleicht", kein "Später". Bewusst binär.

---

## Honesty-Check-Logik (Backend)

Läuft in `chatter-pulse-pushes` (23:00 Berlin) für alle "Ja"-Antworten des Tages:

**Signal-Aggregation pro Chatter für den heutigen Tag:**
- Login-Events im Slot-Fenster (aus `login_events` / `app_install_status.last_active_at`)
- Revenue-Events im Slot-Fenster (aus `accounts_data` / `ingest-revenue`)
- Push-Opens (aus `chatter_push_log` + Delivery-Tracking, falls vorhanden)

**Klassifikation:**

| Beweislage | Klassifikation | Konsequenz |
|---|---|---|
| Mindestens ein Signal im Slot-Fenster | ✅ Ja bestätigt | Streak +1, Tier bleibt / steigt |
| Kein Signal, aber Login irgendwann heute | ⚠️ Unklar | Streak +1 (Benefit of the doubt), aber intern `honesty_flag=soft` |
| Kein Signal, kein Login den ganzen Tag | ❌ Ja widerlegt | Streak reset **und** Tier -1 Stufe. Push: *"Deine heutige Bestätigung passt nicht zur Aktivität. Ehrlichkeit hätte deinen Tier gehalten."* |
| Antwort war "Nein" | ➖ Ehrlich | Streak pausiert (kein Reset), Tier bleibt. Push: *"Danke für die Ehrlichkeit — morgen gehts weiter."* |
| 3× `honesty_flag=soft` in 14 Tagen | ⚠️ Muster | Tier -1, Push: *"Uns fallen Muster auf. Kurze Ehrlichkeit hilft dir mehr als knappe Jas."* |

**Wichtig:** Widerlegung nur bei **null Signalen den ganzen Tag** — das ist objektiv und unstreitbar. So können wir nie fälschlich jemanden bestrafen, der wirklich da war (weil dann garantiert ein Login existiert).

---

## Was sich in Plan v2 konkret ändert

- **Evening-Push-Template** (`commitment_evening_recap`): Body ergänzt um Verifizierungs-Hinweis in einer Zeile: *"Wir gleichen kurz mit deiner Aktivität ab — Ehrlichkeit lohnt sich."*
- **Neue Push-Templates:**
  - `commitment_honesty_confirmed` (nur bei widerlegtem Ja) — gold-warnend, nicht aggressiv
  - `commitment_honest_no_thanks` (bei ehrlichem Nein) — kurz, positiv
  - `commitment_pattern_warning` (bei 3× soft flag) — sichtbar, aber nicht zerstörerisch
- **DB-Felder in `chatter_daily_commitment`:**
  - `confirmed_by_user boolean` (true/false/null)
  - `honesty_verdict text` — `confirmed` / `soft_unclear` / `disproved` / `honest_no` / null
  - `signal_snapshot jsonb` — `{ logins: [...], sales: [...], slots: [...] }` für Nachvollziehbarkeit
- **Neuer Cron-Trigger** in `chatter-pulse-pushes` um 23:00 Berlin: `verifyHonesty()`-Sweep über den heutigen Tag.
- **Admin-Panel** bekommt einen "Honesty-Log"-Tab: pro Chatter die letzten 30 Tage mit Verdict + Signal-Snapshot. Read-only, dient nur der Admin-Übersicht.

---

## Was bewusst NICHT passiert

- Keine öffentliche Bloßstellung. Verdict ist nur für den Chatter selbst + Admins sichtbar.
- Kein Ban, kein Account-Verlust — maximal Tier -1.
- Kein Rechtsstreit mit dem Chatter: Wir sagen im Popup transparent, dass wir abgleichen. Wer trotzdem "Ja" klickt ohne da gewesen zu sein, weiß was er tut.
- Kein Perfektionsdruck: "Unklar"-Fälle gehen zu Gunsten des Chatters.

---

## Umsetzungs-Reihenfolge (leicht ergänzt)

1. DB + Streak-RPC + Push-Templates (inkl. neue Honesty-Templates).
2. Commitment-Dialog + Morgen-Push + Deep-Link.
3. Streak-Widget + Tier-System + **Evening-Confirm-Prompt mit Honesty-Framing**.
4. **Honesty-Sweep-Cron (23:00) + Signal-Snapshot-Speicherung.**
5. Auto-Confirm via Revenue-Event (Bonus-Signal fürs Honesty-Log).
6. Admin-Panel + Honesty-Log-Tab + optionale Priority-Assignment-Sortierung.

---

## Offene Fragen (unverändert von v2)

1. **Slot-Struktur:** feste 4 Chips (Morgen/Mittag/Abend/Nacht), freier Slider, oder beides?
2. **Tier-Namen:** Consistent / Reliable / Priority Chatter / Elite okay – oder andere?
3. **"Heute Pause"-Button** im Morgen-Dialog erlauben (1× pro Woche ohne Streak-Schaden) oder ganz weglassen?
