## Ziel

Sobald in `ingest-revenue` ein neuer Verkauf erkannt wird, bekommt der Chatter, dem der zugehörige Account zugeordnet ist, einen Push direkt aufs Handy. Nur Chatter (kein Admin, kein Model). Funktioniert über die bestehende Account → `assigned_to` → `user_id` Verknüpfung.

## Was wir schon haben

- `ingest-revenue` erkennt bereits jeden einzelnen neuen Sale (Diff gegen `revenue_report.data`) → `pendingSales`.
- Es baut bereits eine `chatterMap` (`platform|model` → `group_name`) für die Admin-Pushes.
- `send-notification` Edge-Function kann gezielt an `target_user_id` pushen, basierend auf `push_subscriptions`.
- Chatter sind bereits Opt-In für Web Push (PWA-Onboarding).

→ Wir müssen also nur den **`user_id`** des zugewiesenen Chatters mit ausliefern und dann einen zusätzlichen Call an `send-notification` mit `target_user_id` machen.

## Änderungen

### 1. `supabase/functions/ingest-revenue/index.ts`

- `chatterMap` erweitern: statt nur `group_name` speichern wir `{ user_id, name }` pro `platform|model`-Key.
- Nach dem bestehenden Admin-Push-Loop einen zweiten Loop hinzufügen, der pro Sale (wenn `user_id` gefunden) `send-notification` mit `target_user_id` aufruft.
- Gamifizierte Texte (rotierend zufällig pro Sale):
  - `💸 KA-CHING! +{amount}€` / `🔥 NEUER VERKAUF! +{amount}€` / `🚀 BOOM! +{amount}€ rein` / `⚡ SALE! +{amount}€` / `🎰 JACKPOT! +{amount}€` / `💎 +{amount}€ — du Maschine!`
  - Body: kurzer Hype-Satz + Model-Name, z. B. `„{model}" hat gerade gezahlt. Weiter so! 🏆`
- Bei großen Sales (≥100€): Premium-Variante mit `🏆 BIG SALE! +{amount}€` und extra Hype-Body („Das ist Top-Liga 💪").
- Bei Sale-Burst des gleichen Chatters innerhalb von 15 min (≥3 Sales): einmaliger Combo-Push: `🔥🔥 STREAK x{n}! +{sum}€ in {min} min — du bist on fire!` (Cooldown via neuer Tabelle bzw. wiederverwendet — siehe unten).
- URL im Payload: `/dashboard` (Default in `send-notification`).
- Fire-and-forget (`.catch(() => {})`) damit der Ingest nie blockiert.

### 2. Combo-Cooldown (klein)

Wir nutzen die schon existierende `revenue_surge_log` Tabelle, aber mit einem neuen Scope-Präfix: `chatter:{user_id}`. Kein Schema-Change nötig.

### 3. `send-notification`

Keine Änderung — unterstützt bereits `target_user_id` exakt für diesen Use Case. URL `/dashboard` bleibt Default.

## Was wir NICHT anfassen

- Kein neues Schema, keine neue Tabelle, keine neue Edge Function.
- Admin-Pushes, Surge-Detection, Realtime-Counter bleiben 1:1.
- Model- und Fanvue-Logins bekommen weiterhin nichts.

## Technische Details

- Lookup-Erweiterung in `ingest-revenue`:
  ```ts
  // statt Map<string,string>:
  const chatterMap = new Map<string, { user_id: string; name: string }>();
  // ...
  chatterMap.set(key, { user_id: a.assigned_to, name: ch });
  ```
- Neuer Push-Loop nach Admin-Loop:
  ```ts
  const HYPE_TITLES = [
    "💸 KA-CHING!", "🔥 NEUER VERKAUF!", "🚀 BOOM!",
    "⚡ SALE!", "🎰 JACKPOT!", "💎 Cha-Ching!"
  ];
  const HYPE_BODIES = [
    "Weiter so 🏆", "Du Maschine 💪", "On Fire 🔥",
    "Nächster Level 🚀", "Lass es krachen 💥"
  ];
  for (const s of pendingSales) {
    const ch = chatterMap.get(`${s.platform}|${s.model.toLowerCase()}`);
    if (!ch?.user_id) continue;
    const amountStr = formatEUR(s.amount);
    const big = s.amount >= 100;
    const title = big
      ? `🏆 BIG SALE! +${amountStr}`
      : `${pick(HYPE_TITLES)} +${amountStr}`;
    const body = big
      ? `„${s.model}" — das ist Top-Liga 💪`
      : `„${s.model}" hat gerade gezahlt · ${pick(HYPE_BODIES)}`;
    fetch(`${url.replace("send-admin-push","send-notification")}`, {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${serviceKey}` },
      body: JSON.stringify({ title, body, target_user_id: ch.user_id }),
    }).catch(() => {});
  }
  ```
- Combo-Check (innerhalb existierender Surge-Sektion): pro `user_id` zählen, ob ≥3 Sales in 15 min, Cooldown 20 min via `revenue_surge_log` mit `scope = chatter:{user_id}`.

## Akzeptanzkriterien

- Chatter A, dem Account X (Platform `maloum`, Model `Lina`) zugeordnet ist, bekommt sofort einen Push wenn ein neuer Sale von `Lina` auf Maloum reinkommt — kein anderer User.
- Nicht-zugeordnete Sales → kein Chatter-Push (nur Admin-Push wie bisher).
- ≥100€ Sale → Big-Sale-Variante.
- 3+ Sales desselben Chatters in 15 min → zusätzlicher Combo-Push (max alle 20 min).
- Keine Pushes an Admins/Models über diese Schiene.

## Build-Schritt

Nach den Edits: `supabase--deploy_edge_functions(["ingest-revenue"])`.
