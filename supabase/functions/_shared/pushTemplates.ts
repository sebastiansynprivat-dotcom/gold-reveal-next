// Centralized push notification templates for chatter notifications.
// All wordings live here so admins can review/edit in one place.
//
// Placeholders use {name}, {amount}, {model}, {goal}, {streak}, {open_tasks},
// {count}, {days}, {missing}. Format with formatTemplate().

export type PushTemplate = {
  key: string;
  category: "pull" | "dopamine";
  cooldown_hours: number; // 0 = no cooldown (per-event keys), 24 = once per day, etc.
  de: { title: string; body: string };
  en: { title: string; body: string };
};

export const PUSH_TEMPLATES: Record<string, PushTemplate> = {
  // ===== A: PULL TRIGGERS =====
  morning_kickoff: {
    key: "morning_kickoff",
    category: "pull",
    cooldown_hours: 20,
    de: {
      title: "Guten Morgen, {name} ☀️",
      body: "Heute starten? Deine Models warten — Tagesziel: {goal}€.",
    },
    en: {
      title: "Good morning, {name} ☀️",
      body: "Ready to roll? Your models are waiting — daily goal: {goal}€.",
    },
  },
  daily_tasks_open: {
    key: "daily_tasks_open",
    category: "pull",
    cooldown_hours: 20,
    de: {
      title: "Tagesroutine offen ✅",
      body: "Noch {open_tasks} Aufgaben offen. 2 Min Aufwand, großer Effekt.",
    },
    en: {
      title: "Today's routine pending ✅",
      body: "{open_tasks} tasks still open. 2 min effort, big impact.",
    },
  },
  inbox_pile_up: {
    key: "inbox_pile_up",
    category: "pull",
    cooldown_hours: 4,
    de: {
      title: "Inbox füllt sich 📬",
      body: "{count} ungelesene Chats bei {model}. Jeder Chat = potenzieller Sale.",
    },
    en: {
      title: "Inbox piling up 📬",
      body: "{count} unread chats on {model}. Every chat = a potential sale.",
    },
  },
  old_chat_warning: {
    key: "old_chat_warning",
    category: "pull",
    cooldown_hours: 20,
    de: {
      title: "Chat verstaubt ⏰",
      body: "Ein Chat bei {model} wartet seit {days} Tagen. Schnell antworten = Rettungs-Sale.",
    },
    en: {
      title: "Chat going stale ⏰",
      body: "A chat on {model} has been waiting {days} days. Quick reply = rescue sale.",
    },
  },
  streak_at_risk: {
    key: "streak_at_risk",
    category: "pull",
    cooldown_hours: 20,
    de: {
      title: "Streak in Gefahr 🔥",
      body: "{streak} Tage am Stück — heute noch nichts. Ein Sale reicht.",
    },
    en: {
      title: "Streak at risk 🔥",
      body: "{streak} days in a row — nothing today yet. One sale saves it.",
    },
  },
  goal_close_no_login: {
    key: "goal_close_no_login",
    category: "pull",
    cooldown_hours: 20,
    de: { title: "Fast da 🎯", body: "Nur noch {missing}€ bis zum Tagesziel. Eine Stunde reicht." },
    en: { title: "Almost there 🎯", body: "Just {missing}€ to your daily goal. One more hour." },
  },
  new_content_drop: {
    key: "new_content_drop",
    category: "pull",
    cooldown_hours: 0,
    de: { title: "Neuer Content 🎬", body: "{model} hat frischen Content. Perfekt für deine Top-Fans." },
    en: { title: "New content 🎬", body: "{model} just dropped fresh content. Perfect for your top fans." },
  },
  model_request_reply: {
    key: "model_request_reply",
    category: "pull",
    cooldown_hours: 0,
    de: { title: "Anfrage beantwortet 💬", body: "{model} hat geantwortet. Schau rein und verkauf's." },
    en: { title: "Request answered 💬", body: "{model} replied. Go check it and sell it." },
  },
  weekend_silent: {
    key: "weekend_silent",
    category: "pull",
    cooldown_hours: 20,
    de: { title: "Wochenend-Welle 🌊", body: "Sa/So sind oft Top-Tage. Deine Fans sind online." },
    en: { title: "Weekend wave 🌊", body: "Weekends often crush — your fans are online." },
  },
  multi_day_inactive: {
    key: "multi_day_inactive",
    category: "pull",
    cooldown_hours: 44,
    de: { title: "Wir vermissen dich 👀", body: "2 Tage Funkstille — alles ok? Deine Accounts laufen sonst leer." },
    en: { title: "We miss you 👀", body: "2 quiet days — everything ok? Your accounts go cold otherwise." },
  },

  // ===== B: DOPAMINE TRIGGERS =====
  sale_big: {
    key: "sale_big",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "💎 BIG SALE", body: "{amount}€ bei {model} — sauber gespielt!" },
    en: { title: "💎 BIG SALE", body: "{amount}€ on {model} — clean play!" },
  },
  sale_huge: {
    key: "sale_huge",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "🚀 MASSIVE SALE", body: "{amount}€!! Heute geht was bei {model}." },
    en: { title: "🚀 MASSIVE SALE", body: "{amount}€!! Today's hitting different on {model}." },
  },
  sale_combo: {
    key: "sale_combo",
    category: "dopamine",
    cooldown_hours: 1,
    de: { title: "🔥 Hot Streak", body: "3 Sales in einer Stunde — du bist in der Zone." },
    en: { title: "🔥 Hot Streak", body: "3 sales in an hour — you're in the zone." },
  },
  personal_record_day: {
    key: "personal_record_day",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "🏆 NEUER REKORD", body: "{amount}€ heute — dein bester Tag seit 30 Tagen." },
    en: { title: "🏆 NEW RECORD", body: "{amount}€ today — your best day in 30 days." },
  },
  goal_reached: {
    key: "goal_reached",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "🎯 ZIEL GEKNACKT", body: "{goal}€ — Tagesziel erfüllt. Jetzt drüberlegen." },
    en: { title: "🎯 GOAL HIT", body: "{goal}€ — daily goal done. Now stack on top." },
  },
  goal_overshoot_150: {
    key: "goal_overshoot_150",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "🥈 150 %", body: "Du bist 50 % über'm Ziel. Nicht aufhören." },
    en: { title: "🥈 150 %", body: "You're 50 % over goal. Don't stop." },
  },
  goal_overshoot_200: {
    key: "goal_overshoot_200",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "🥇 DOPPELT", body: "200 % vom Tagesziel. Heute schreibst du Geschichte." },
    en: { title: "🥇 DOUBLE", body: "200 % of daily goal. Today is history-making." },
  },
  streak_milestone_3: {
    key: "streak_milestone_3",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "🔥 3er Streak", body: "3 Tage in Folge mit Sales. Halt es am Leben." },
    en: { title: "🔥 3-day streak", body: "3 days in a row with sales. Keep it alive." },
  },
  streak_milestone_7: {
    key: "streak_milestone_7",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "🔥🔥 1 Woche Streak", body: "7 Tage. Das ist Konstanz auf Pro-Level." },
    en: { title: "🔥🔥 1-week streak", body: "7 days. Pro-level consistency." },
  },
  streak_milestone_14: {
    key: "streak_milestone_14",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "⚡ 14 Tage", body: "Zwei Wochen non-stop. Echtes Tier." },
    en: { title: "⚡ 14 days", body: "Two weeks non-stop. Beast mode." },
  },
  streak_milestone_30: {
    key: "streak_milestone_30",
    category: "dopamine",
    cooldown_hours: 0,
    de: { title: "👑 30 TAGE STREAK", body: "Ein ganzer Monat. Du gehörst zur Spitze." },
    en: { title: "👑 30-DAY STREAK", body: "A full month. You're top-tier." },
  },
  tasks_all_done: {
    key: "tasks_all_done",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "✨ Routine clean", body: "Alle 6 Tasks heute durch. Pro-Move." },
    en: { title: "✨ Routine clean", body: "All 6 tasks done today. Pro move." },
  },
  inbox_cleared: {
    key: "inbox_cleared",
    category: "dopamine",
    cooldown_hours: 20,
    de: { title: "📭 Inbox = 0", body: "Kein offener Chat bei {model}. Sauber." },
    en: { title: "📭 Inbox = 0", body: "Zero open chats on {model}. Clean." },
  },
  // ===== C: COMMITMENT / HONESTY =====
  commitment_morning: {
    key: "commitment_morning",
    category: "pull",
    cooldown_hours: 20,
    de: {
      title: "Wann bist du heute für deine Models da? ⏰",
      body: "1 Klick — Slots wählen, Streak sichern, Priority-Chatter werden.",
    },
    en: {
      title: "When are you online for your models today? ⏰",
      body: "One tap — pick your slots, keep your streak, unlock priority.",
    },
  },
  commitment_evening_recap: {
    key: "commitment_evening_recap",
    category: "pull",
    cooldown_hours: 12,
    de: {
      title: "Kurz bestätigen 🌙",
      body: "Warst du heute in deinen Slots da? Wir gleichen kurz mit deiner Aktivität ab — Ehrlichkeit lohnt sich.",
    },
    en: {
      title: "Quick check-in 🌙",
      body: "Were you online in your slots today? We cross-check with activity — honesty always pays.",
    },
  },
  commitment_honesty_confirmed: {
    key: "commitment_honesty_confirmed",
    category: "pull",
    cooldown_hours: 0,
    de: {
      title: "Bestätigung passt nicht ⚠️",
      body: "Deine heutige Bestätigung passt nicht zur Aktivität. Ehrlichkeit hätte deinen Tier gehalten.",
    },
    en: {
      title: "Confirmation mismatch ⚠️",
      body: "Today's check-in doesn't match your activity. Honesty would have kept your tier.",
    },
  },
  commitment_honest_no_thanks: {
    key: "commitment_honest_no_thanks",
    category: "pull",
    cooldown_hours: 0,
    de: {
      title: "Danke für die Ehrlichkeit 🙏",
      body: "Kein Streak-Bruch — morgen gehts weiter.",
    },
    en: {
      title: "Thanks for being honest 🙏",
      body: "No streak reset — fresh start tomorrow.",
    },
  },
  commitment_pattern_warning: {
    key: "commitment_pattern_warning",
    category: "pull",
    cooldown_hours: 24,
    de: {
      title: "Muster bemerkt 👀",
      body: "Uns fallen Muster auf. Kurze Ehrlichkeit hilft dir mehr als knappe Jas.",
    },
    en: {
      title: "Pattern noticed 👀",
      body: "We're seeing a pattern. Honesty helps you more than empty 'yes' answers.",
    },
  },
};

export function formatTemplate(tpl: string, ctx: Record<string, unknown>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = ctx[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function renderPush(
  key: string,
  lang: "de" | "en",
  ctx: Record<string, unknown>,
): { title: string; body: string; title_en: string; body_en: string } | null {
  const t = PUSH_TEMPLATES[key];
  if (!t) return null;
  return {
    title: formatTemplate(t.de.title, ctx),
    body: formatTemplate(t.de.body, ctx),
    title_en: formatTemplate(t.en.title, ctx),
    body_en: formatTemplate(t.en.body, ctx),
  };
}
