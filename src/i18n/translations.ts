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

  // --- Auth page ---
  "auth.signup.title": { de: "Erstelle ein kostenloses Konto bei SheX", en: "Create your free SheX account" },
  "auth.signup.subtitle": { de: "Erstelle dein kostenloses Konto, um deinen Account zu bekommen und damit Geld zu verdienen.", en: "Create your free account to get set up and start earning." },
  "auth.signin.title": { de: "Willkommen zurück", en: "Welcome back" },
  "auth.signin.subtitle": { de: "Melde dich an, um weiterzumachen", en: "Sign in to continue" },
  "auth.placeholder.groupName": { de: "Gruppenname (Beispiel: Max Mustermann)", en: "Group name (e.g. John Doe)" },
  "auth.placeholder.telegramId": { de: "Telegram-ID", en: "Telegram ID" },
  "auth.placeholder.email": { de: "E-Mail Adresse", en: "Email address" },
  "auth.placeholder.password": { de: "Passwort (min. 6 Zeichen)", en: "Password (min. 6 characters)" },
  "auth.help.groupName": { de: "Wo finde ich meinen Gruppennamen?", en: "Where do I find my group name?" },
  "auth.help.groupName.body": { de: "Wir haben mit dir eine Gruppe eröffnet. Den Gruppennamen findest du direkt oben in der Gruppe – kopiere ihn einfach 1:1 und füge ihn hier ein. Beispiel (Der Gruppenname enthält immer deinen Namen): Max Mustermann oder Max Mu", en: "We opened a group with you. You'll find the group name at the top of the chat — copy it 1:1 and paste it here. Example (the group name always contains your name): John Doe or John Do" },
  "auth.help.groupName.warning": { de: "⚠️ Es ist extrem wichtig, dass du den richtigen Gruppennamen angibst, damit du korrekt abgerechnet werden kannst!", en: "⚠️ It's extremely important that you provide the correct group name so you can be billed correctly!" },
  "auth.help.telegram": { de: "Wo finde ich meine Telegram-ID?", en: "Where do I find my Telegram ID?" },
  "auth.help.telegram.step1": { de: "1. Öffne Telegram und starte den Bot", en: "1. Open Telegram and start the bot" },
  "auth.help.telegram.botLink": { de: "Hier klicken – @userinfobot", en: "Click here – @userinfobot" },
  "auth.help.telegram.step2.pre": { de: "2. Tippe", en: "2. Type" },
  "auth.help.telegram.step2.post": { de: "und schicke es ab.", en: "and send it." },
  "auth.help.telegram.step3.pre": { de: "3. Du bekommst eine Antwort mit", en: "3. You'll get a reply with" },
  "auth.help.telegram.step3.post": { de: "— klicke einmal auf die Zahl neben „ID:". Damit ist sie automatisch kopiert.", en: "— tap the number next to \"ID:\" once. It's copied automatically." },
  "auth.help.telegram.step4": { de: "4. Füge sie einfach hier in das Feld ein.", en: "4. Paste it into the field here." },
  "auth.help.telegram.warning": { de: "⚠️ Nur Zahlen, kein @username – die ID brauchen wir für deine Benachrichtigungen.", en: "⚠️ Numbers only, no @username – we need the ID for your notifications." },
  "auth.btn.createAccount": { de: "Konto erstellen", en: "Create account" },
  "auth.btn.signin": { de: "Anmelden", en: "Sign in" },
  "auth.btn.wait": { de: "Bitte warten...", en: "Please wait..." },
  "auth.btn.forgot": { de: "Passwort vergessen?", en: "Forgot password?" },
  "auth.switch.toSignin": { de: "Bereits ein Konto? Hier anmelden", en: "Already have an account? Sign in" },
  "auth.switch.toSignup": { de: "Noch kein Konto? Hier registrieren", en: "No account yet? Sign up here" },
  "auth.confirmGroup.title": { de: "Ist das dein Gruppenname?", en: "Is this your group name?" },
  "auth.confirmGroup.body": { de: "Bitte checke nochmal in deiner", en: "Please double-check it against your" },
  "auth.confirmGroup.bodyMid": { de: "WhatsApp-Gruppe", en: "WhatsApp group" },
  "auth.confirmGroup.bodyEnd": { de: ", ob der Name exakt übereinstimmt. Der korrekte Gruppenname ist wichtig für deine Abrechnung.", en: " to make sure the name matches exactly. The correct group name is essential for your billing." },
  "auth.confirmTg.title": { de: "Ist das deine Telegram-ID?", en: "Is this your Telegram ID?" },
  "auth.confirmTg.body": { de: "Bitte", en: "Please" },
  "auth.confirmTg.bodyMid": { de: "double-checke", en: "double-check" },
  "auth.confirmTg.bodyEnd": { de: "deine Telegram-ID. Du kannst nur abgerechnet werden, wenn die ID korrekt ist – sonst können wir dich nicht zuordnen.", en: "your Telegram ID. We can only bill you correctly if the ID is right — otherwise we can't match you." },
  "auth.confirm.no": { de: "Nein, ändern", en: "No, edit" },
  "auth.confirm.yes": { de: "Ja, stimmt!", en: "Yes, that's right!" },
  "auth.success.title": { de: "Bestätige deine E-Mail", en: "Confirm your email" },
  "auth.success.body": { de: "Wir haben dir eine E-Mail gesendet an", en: "We sent you an email to" },
  "auth.success.bodyEnd": { de: ". Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.", en: ". Click the link in the email to activate your account." },
  "auth.success.spam": { de: "Keine E-Mail erhalten? Schau im Spam-Ordner nach.", en: "No email received? Check your spam folder." },
  "auth.success.back": { de: "Zurück zur Anmeldung", en: "Back to sign in" },
  "auth.error.groupRequired": { de: "Bitte gib deinen Gruppennamen ein.", en: "Please enter your group name." },
  "auth.error.tgInvalid": { de: "Bitte gib eine gültige Telegram-ID ein (nur Zahlen, mindestens 5 Stellen).", en: "Please enter a valid Telegram ID (numbers only, at least 5 digits)." },
  "auth.error.invalidCreds": { de: "E-Mail oder Passwort ist falsch.", en: "Email or password is incorrect." },
  "auth.error.notConfirmed": { de: "Bitte bestätige zuerst deine E-Mail.", en: "Please confirm your email first." },
  "auth.error.alreadyRegistered": { de: "Diese E-Mail ist bereits registriert.", en: "This email is already registered." },
  "auth.error.invalidEmail": { de: "Bitte gib eine gültige E-Mail-Adresse ein.", en: "Please enter a valid email address." },
  "auth.error.rateLimit": { de: "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.", en: "Too many attempts. Please wait a moment and try again." },
  "auth.error.passwordShort": { de: "Das Passwort muss mindestens 6 Zeichen haben.", en: "Password must be at least 6 characters." },
  "auth.error.security": { de: "Bitte warte einen Moment und versuche es erneut.", en: "Please wait a moment and try again." },
};

export function translate(lang: Lang, key: string, fallback?: string): string {
  const entry = dict[key];
  if (!entry) return fallback ?? key;
  return entry[lang] ?? entry.de ?? key;
}
