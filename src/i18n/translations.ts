// Central translation dictionary for the chatter area.
// Keys are added incrementally as components are migrated.
// Always provide both `de` and `en` for every key.

export type Lang = "de" | "en";

type Dict = Record<string, { de: string; en: string }>;

export const dict: Dict = {
  // --- Header / global chrome ---
  "header.dashboard": { de: "Dashboard", en: "Dashboard" },
  "header.signOut": { de: "Abmelden", en: "Sign out" },
  "header.language.de": { de: "Deutsch", en: "German" },
  "header.language.en": { de: "Englisch", en: "English" },
  "header.language.tooltip": { de: "Sprache umstellen", en: "Change language" },

  // --- Quick Action Bar ---
  "quick.requests": { de: "Anfragen", en: "Requests" },
  "quick.inspiration": { de: "Inspiration", en: "Inspiration" },
  "quick.invoice": { de: "Auszahlung", en: "Payout" },
  "quick.question": { de: "Ich habe eine Frage", en: "I have a question" },
  "quick.tour": { de: "Tour", en: "Tour" },

  // --- Common ---
  "common.save": { de: "Speichern", en: "Save" },
  "common.cancel": { de: "Abbrechen", en: "Cancel" },
  "common.close": { de: "Schließen", en: "Close" },
  "common.back": { de: "Zurück", en: "Back" },
  "common.next": { de: "Weiter", en: "Next" },
  "common.confirm": { de: "Bestätigen", en: "Confirm" },
  "common.loading": { de: "Lädt…", en: "Loading…" },
  "common.copy": { de: "Kopieren", en: "Copy" },
  "common.copied": { de: "Kopiert!", en: "Copied!" },

  // --- Dashboard sections (initial wave) ---
  "dashboard.welcomeBack": { de: "Willkommen zurück", en: "Welcome back" },
  "dashboard.todayRevenue": { de: "Heutiger Umsatz", en: "Today's revenue" },
  "dashboard.monthRevenue": { de: "Monatsumsatz", en: "Monthly revenue" },
  "dashboard.dailyGoal": { de: "Tagesziel", en: "Daily goal" },
  "dashboard.streak": { de: "Streak", en: "Streak" },
  "dashboard.tasks": { de: "Deine Aufgaben heute", en: "Your tasks today" },
  "dashboard.accounts": { de: "Deine Accounts", en: "Your accounts" },
  "dashboard.account": { de: "Dein Account", en: "Your account" },
  "dashboard.requests": { de: "Anfragen", en: "Requests" },
  "dashboard.inspiration": { de: "Inspiration", en: "Inspiration" },
  "dashboard.chat": { de: "KI Mastermind", en: "Mastermind AI" },
  "dashboard.askQuestion": { de: "Ich habe eine Frage", en: "I have a question" },
  "dashboard.haveQuestion": { de: "Hast du eine Frage?", en: "Have a question?" },
  "dashboard.askAnything": { de: "Frag mich alles", en: "Ask me anything" },
  "dashboard.viewAll": { de: "Alle ansehen", en: "View all" },
  "dashboard.showMore": { de: "Mehr anzeigen", en: "Show more" },
  "dashboard.showLess": { de: "Weniger anzeigen", en: "Show less" },

  // --- Streak ---
  "streak.title": { de: "Deine Streak", en: "Your streak" },
  "streak.day": { de: "Tag", en: "Day" },
  "streak.days": { de: "Tage", en: "Days" },
  "streak.keepItUp": { de: "Weiter so!", en: "Keep it up!" },
  "streak.todayDone": { de: "Heute erledigt", en: "Done today" },
  "streak.todayMissing": { de: "Heute noch offen", en: "Still open today" },

  // --- Daily Checklist ---
  "checklist.title": { de: "Daily Checklist", en: "Daily checklist" },
  "checklist.subtitle": { de: "Erledige alle Aufgaben, um deine Streak zu halten", en: "Complete all tasks to keep your streak alive" },
  "checklist.completed": { de: "erledigt", en: "completed" },
  "checklist.allDone": { de: "Alles erledigt – stark!", en: "All done — nice work!" },
  "checklist.copyMessage": { de: "WhatsApp Nachricht kopieren", en: "Copy WhatsApp message" },

  // --- Month Summary ---
  "monthSummary.title": { de: "Monats-Hochrechnung", en: "Monthly projection" },
  "monthSummary.projected": { de: "Hochgerechnet", en: "Projected" },
  "monthSummary.avgPerDay": { de: "Ø pro Tag", en: "Avg per day" },
  "monthSummary.daysLeft": { de: "Tage übrig", en: "days left" },

  // --- Revenue Chart ---
  "chart.last7Days": { de: "Letzte 7 Tage", en: "Last 7 days" },
  "chart.revenue": { de: "Umsatz", en: "Revenue" },

  // --- Push / Notifications ---
  "push.enable.title": { de: "Push-Benachrichtigungen aktivieren", en: "Enable push notifications" },
  "push.enable.body": { de: "Verpasse keine wichtigen Updates mehr.", en: "Don't miss any important updates." },
  "push.enable.cta": { de: "Aktivieren", en: "Enable" },
  "push.denied.banner": { de: "Push-Benachrichtigungen sind deaktiviert.", en: "Push notifications are disabled." },
  "push.denied.howto": { de: "So aktivierst du sie", en: "How to enable them" },

  // --- Dialogs ---
  "dialog.question.title": { de: "Stelle deine Frage", en: "Ask your question" },
  "dialog.question.placeholder": { de: "Was möchtest du wissen?", en: "What would you like to know?" },
  "dialog.question.send": { de: "Senden", en: "Send" },
  "dialog.billing.title": { de: "Auszahlungs-Info", en: "Payout info" },
  "dialog.gewerbe.title": { de: "Gewerbe anmelden", en: "Register your business" },

  // --- Bonus / leaderboard ---
  "bonus.title": { de: "Bonus-System", en: "Bonus system" },
  "bonus.currentTier": { de: "Aktuelle Stufe", en: "Current tier" },
  "bonus.nextTier": { de: "Nächste Stufe", en: "Next tier" },
  "leaderboard.title": { de: "Bestenliste", en: "Leaderboard" },

  // --- Account section ---
  "account.credentials": { de: "Zugangsdaten", en: "Credentials" },
  "account.email": { de: "E-Mail", en: "Email" },
  "account.password": { de: "Passwort", en: "Password" },
  "account.domain": { de: "Domain", en: "Domain" },
  "account.openPlatform": { de: "Plattform öffnen", en: "Open platform" },
};

export function translate(lang: Lang, key: string, fallback?: string): string {
  const entry = dict[key];
  if (!entry) return fallback ?? key;
  return entry[lang] ?? entry.de ?? key;
}
