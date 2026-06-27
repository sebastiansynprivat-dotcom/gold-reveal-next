## Klarstellung aus deiner Rückmeldung

- Chatter arbeiten **nicht** im Dashboard, sondern auf Maloum/Brezzels/4based etc. „Online im Dashboard" ist also kein sinnvolles Signal.
- Wir brauchen also: **Pull-Trigger** (komm rein, hak ab, lies das) + **Dopamin-Pushes parallel zur Arbeit** auf der externen Plattform (Sale läuft rein → Glückwunsch-Push aufs Handy).
- Du willst pro Trigger **konkret den Push-Text sehen**, damit du genehmigen kannst, was rausgeht.

## Trigger-Katalog mit konkretem Wording

Alle Texte sind **Vorlagen mit Platzhaltern** `{name}`, `{amount}`, `{streak}`, `{goal_pct}` usw. Sprache richtet sich nach `profiles.ui_language` (DE/EN). KI-Variante kommt erst in Phase 2 — Phase 1 nutzt exakt diese festen Texte, damit du genau weißt, was Ben und Markus jeweils auf dem Lockscreen sehen.

### Kategorie A — Pull-Trigger („Komm rein und mach was")

| Key | Wann | Titel | Body | Cooldown |
|---|---|---|---|---|
| `morning_kickoff` | Werktag 09:30 lokal, hat aktive Accounts | `Guten Morgen, {name} ☀️` | `Heute starten? Deine Models warten — Tagesziel: {goal}€.` | 1×/Tag |
| `daily_tasks_open` | 14:00 lokal, <3 von 6 Daily-Tasks abgehakt | `Tagesroutine offen ✅` | `Noch {open_tasks} Aufgaben offen. 2 Min Aufwand, großer Effekt.` | 1×/Tag |
| `inbox_pile_up` | `unread_chats > 20` auf einem seiner Accounts (letzter Snapshot) | `Inbox füllt sich 📬` | `{count} ungelesene Chats bei {model}. Jeder Chat = potenzieller Sale.` | 1×/4h |
| `old_chat_warning` | `oldest_chat ≥ 2 Tage` auf seinem Account | `Chat verstaubt ⏰` | `Ein Chat bei {model} wartet seit {days} Tagen. Schnell antworten = Rettungs-Sale.` | 1×/Tag |
| `streak_at_risk` | Streak ≥3 Tage aktiv, heute 0€, ab 19:00 lokal | `Streak in Gefahr 🔥` | `{streak} Tage am Stück — heute noch nichts. Ein Sale reicht.` | 1×/Tag |
| `goal_close_no_login` | 80–99 % vom Tagesziel erreicht, seit 2h kein Sale | `Fast da 🎯` | `Nur noch {missing}€ bis zum Tagesziel. Eine Stunde reicht.` | 1×/Tag |
| `new_content_drop` | Neuer `content_drops` Eintrag für sein zugewiesenes Model, noch nicht gelesen | `Neuer Content 🎬` | `{model} hat frischen Content. Perfekt für deine Top-Fans.` | sofort, 1×/Drop |
| `model_request_reply` | Auf seine Model-Request kam Antwort | `Anfrage beantwortet 💬` | `{model} hat geantwortet. Schau rein und verkauf's.` | sofort |
| `weekend_silent` | Sa/So 11:00 lokal, kein Sale heute | `Wochenend-Welle 🌊` | `Sa/So sind oft Top-Tage. Deine Fans sind online.` | 1×/Tag |
| `multi_day_inactive` | 48h kein Sale, aktive Accounts | `Wir vermissen dich 👀` | `2 Tage Funkstille — alles ok? Deine Accounts laufen sonst leer.` | 1×/2 Tage |

### Kategorie B — Dopamin-Pushes („Du bist gerade brilliant")

Diese feuern unabhängig von Tageszeit/Login, weil sie ein konkretes Erfolgs-Event spiegeln.

| Key | Wann | Titel | Body | Cooldown |
|---|---|---|---|---|
| `sale_big` | Eigener Sale ≥ 100 € | `💎 BIG SALE` | `{amount}€ bei {model} — sauber gespielt!` | pro Sale 1× |
| `sale_huge` | Eigener Sale ≥ 250 € | `🚀 MASSIVE SALE` | `{amount}€!! Heute geht was bei {model}.` | pro Sale 1× |
| `sale_combo` | 3 Sales in 60 min auf seinen Accounts | `🔥 Hot Streak` | `3 Sales in einer Stunde — du bist in der Zone.` | 1×/60 min |
| `personal_record_day` | Heutiger Tages-Revenue > sein 30-Tage-Höchsttag | `🏆 NEUER REKORD` | `{amount}€ heute — dein bester Tag seit 30 Tagen.` | 1×/Tag |
| `goal_reached` | Erstmals heute Tagesziel zu 100% | `🎯 ZIEL GEKNACKT` | `{goal}€ — Tagesziel erfüllt. Jetzt drüberlegen.` | 1×/Tag |
| `goal_overshoot_150` | 150 % vom Tagesziel | `🥈 150 %` | `Du bist 50 % über'm Ziel. Nicht aufhören.` | 1×/Tag |
| `goal_overshoot_200` | 200 % vom Tagesziel | `🥇 DOPPELT` | `200 % vom Tagesziel. Heute schreibst du Geschichte.` | 1×/Tag |
| `streak_milestone_3` | Streak erreicht genau 3 Tage | `🔥 3er Streak` | `3 Tage in Folge mit Sales. Halt es am Leben.` | 1× |
| `streak_milestone_7` | Streak erreicht 7 Tage | `🔥🔥 1 Woche Streak` | `7 Tage. Das ist Konstanz auf Pro-Level.` | 1× |
| `streak_milestone_14` | 14 Tage Streak | `⚡ 14 Tage` | `Zwei Wochen non-stop. Echtes Tier.` | 1× |
| `streak_milestone_30` | 30 Tage Streak | `👑 30 TAGE STREAK` | `Ein ganzer Monat. Du gehörst zur Spitze.` | 1× |
| `tasks_all_done` | Alle 6 Daily-Tasks heute abgehakt | `✨ Routine clean` | `Alle 6 Tasks heute durch. Pro-Move.` | 1×/Tag |
| `inbox_cleared` | `unread_chats` fällt auf 0 auf einem seiner Accounts | `📭 Inbox = 0` | `Kein offener Chat bei {model}. Sauber.` | 1×/Account/Tag |

> Alle EN-Varianten werden 1:1 mitgepflegt. Ich packe sie in eine zentrale `pushTemplates.ts`, damit du sie an einer Stelle siehst und editieren kannst.

## Empfänger-Isolation (Ben ≠ Markus)

- Jeder Push wird über genau **eine** `target_user_id` aufgelöst.
- Sale → `account_assignments` zur Verkaufszeit liefert den verantwortlichen Chatter → nur dessen `push_subscriptions`.
- Pulse-Cron iteriert pro Chatter eindeutig.
- Kein Broadcast, kein `in([...])`, niemals.

## Audit-Tabelle `chatter_push_log`

So siehst du nachträglich **wer was wann gekriegt hat**:

```
id uuid pk
user_id uuid          -- Empfänger (immer gesetzt)
trigger_key text      -- z.B. 'sale_big'
title text            -- gesendeter Titel
body text             -- gesendeter Body
context jsonb         -- Werte {amount: 120, model: 'Lia'}
sent_at timestamptz
```

Dient gleichzeitig als Cooldown-Quelle UND als Audit-Log.

## Architektur

| Komponente | Zweck |
|---|---|
| `supabase/functions/_shared/pushTemplates.ts` (neu) | Alle Wordings DE/EN an einem Ort |
| `chatter-pulse-pushes` Edge Fn (neu) | pg_cron alle 30 min: wertet alle A-Trigger pro Chatter aus |
| `chatter-dopamine-pushes` Edge Fn (neu) | Wird von Sale-Webhook + `ingest-revenue` aufgerufen, wertet B-Trigger sofort aus |
| `chatter-task-pushes` Edge Fn (neu) | Wird vom Frontend nach Task-Check / Goal aufgerufen |
| `chatter_push_log` Tabelle (neu) | Audit + Cooldown |
| `send-notification` (existiert) | Wird intern aufgerufen |

Quiet Hours: 23:00–07:30 lokal pausieren A-Trigger; B-Trigger feuern immer (Erfolge wollen sofort gefeiert werden).
Tages-Cap: max 4 Pull-Trigger / 24h pro Chatter, B-Trigger zählen nicht mit.

## Admin-Sichtbarkeit

Neuer Tab im Admin-Dashboard **„Push-Engine"**:
- **Liste aller Templates** (Key, Titel-Vorlage, Body-Vorlage, DE/EN, Cooldown, Aktiv-Toggle).
- **Log-Viewer**: pro Chatter die letzten 20 Pushes mit Titel/Body/Zeitpunkt.
- **„Trockenlauf für [Chatter]"**: zeigt, was *gerade jetzt* feuern würde, ohne tatsächlich zu senden.

So kannst du jederzeit sehen: „Ben hat heute morgen `morning_kickoff` bekommen, dann um 14:12 `daily_tasks_open`, um 15:30 `sale_big`."

## Vorschlag Rollout

**Phase 1 (zuerst, deterministisch — du siehst exakt obige Texte):**
- Tabelle `chatter_push_log`
- `pushTemplates.ts` mit allen Wordings oben
- Pulse-Cron mit `morning_kickoff`, `inbox_pile_up`, `multi_day_inactive`, `streak_at_risk`
- Dopamin mit `sale_big`, `sale_huge`, `goal_reached`, `streak_milestone_*`
- Admin „Push-Engine" Tab mit Template-Liste + Log

**Phase 2:** Restliche Trigger, Quiet Hours, Tages-Cap, optional KI-Variante (verfeinert die Texte, ändert die Trigger-Logik nicht).

**Phase 3:** Pro-Trigger Aktiv-Toggle, Trockenlauf-Button.

## Bevor ich baue, eine Sache zu bestätigen

Sind die Wordings oben in dem Tonfall, den du willst? Konkret:
- **„Du"-Form, locker, manchmal Slang** („sauber gespielt", „in der Zone") — ok?
- **Max 1 Emoji im Titel, max 1 im Body** — ok?
- Soll ich für Phase 1 **direkt alle ~23 Trigger** scharfschalten oder lieber wie vorgeschlagen mit den 8 Kern-Triggern starten?
