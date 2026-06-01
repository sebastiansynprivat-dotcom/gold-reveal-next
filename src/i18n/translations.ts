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

  // --- Daily Checklist ---
  "checklist.title": { de: "Tägliche Aufgaben", en: "Daily tasks" },
  "checklist.completedSuffix": { de: "erledigt", en: "done" },
  "checklist.allDone": { de: "🎉 Alle Aufgaben erledigt – weiter so!", en: "🎉 All tasks done — keep it up!" },
  "checklist.task1": { de: "Hast du bis zu 6 MassDM's gemacht?", en: "Did you send up to 6 mass DMs?" },
  "checklist.task1.popup": { de: "Muss ich 6 MassDMs machen?", en: "Do I have to send 6 mass DMs?" },
  "checklist.task1.audio": { de: "Wieso ist das wichtig?", en: "Why does this matter?" },
  "checklist.task2": { de: "Deine alte MassDM gelöscht bevor eine neue gesendet wird?", en: "Deleted your old mass DM before sending a new one?" },
  "checklist.task3": { de: "Feedback gegeben, wie der heutige Tag lief?", en: "Shared feedback on how today went?" },
  "checklist.task3.popup": { de: "Wie mache ich das?", en: "How do I do this?" },
  "checklist.task4": { de: "Geschaut ob wir für dich gepostet haben? (Falls nicht, gib uns bitte eine Info in der Gruppe)", en: "Checked if we posted for you? (If not, ping us in the group)" },
  "checklist.task5": { de: "Auf alle Nachrichten geantwortet die in deinem Account offen sind?", en: "Replied to every open message in your account?" },
  "checklist.task5.audio": { de: "Wie weiß ich das alles beantwortet ist?", en: "How do I know everything is answered?" },
  "checklist.task6": { de: "Mindestens 10 Posts von anderen Models kommentiert?", en: "Commented on at least 10 posts from other models?" },
  "checklist.feedback.title": { de: "Tägliches Feedback", en: "Daily feedback" },
  "checklist.feedback.desc": { de: "Bitte diese Vorlage einmal pro Tag aus und schick sie in deine WhatsApp-Gruppe.", en: "Please fill this out once a day and send it to your WhatsApp group." },
  "checklist.feedback.template": { de: "Feedback zum heutigen Tag:\n\nUmsatz:\n\nMassDMs gesendet:\n\nWas lief gut?:\n\nWas lief schlecht?:\n\nOffene Fragen (optional):", en: "Feedback for today:\n\nRevenue:\n\nMass DMs sent:\n\nWhat went well?:\n\nWhat went badly?:\n\nOpen questions (optional):" },
  "checklist.feedback.copy": { de: "Vorlage kopieren", en: "Copy template" },
  "checklist.feedback.copied": { de: "Vorlage kopiert! 📋", en: "Template copied! 📋" },
  "checklist.feedback.copyFail": { de: "Kopieren fehlgeschlagen", en: "Copy failed" },
  "checklist.massdm.title": { de: "Muss ich 6 MassDMs machen?", en: "Do I have to send 6 mass DMs?" },
  "checklist.massdm.desc": { de: "Du solltest mindestens eine MassDM am Tag machen. Wenn du aber keine Käufer findest, mach bitte mehr. Das ist wichtig, weil es deine Chance erhöht, Käufer zu finden.", en: "You should send at least one mass DM per day. If you can't find buyers, send more — it boosts your chance of finding them." },

  // --- Streak ---
  "streak.heading": { de: "Account Upgrade – 7-Tage-Challenge", en: "Account upgrade — 7-day challenge" },
  "streak.daysSuffix": { de: "Tage", en: "days" },
  "streak.today": { de: "Heute", en: "Today" },
  "streak.demo": { de: "Demo", en: "Demo" },
  "streak.unlocked": { de: "Account-Upgrade freigeschaltet! 🎉", en: "Account upgrade unlocked! 🎉" },
  "streak.todayDone": { de: "🔥 Tagesziel erreicht – weiter so, jeder Euro zählt!", en: "🔥 Daily goal reached — keep going, every euro counts!" },
  "streak.daysToUpgradePre": { de: "Noch", en: "Still" },
  "streak.daysToUpgradeSuffix": { de: "Tage bis zum Upgrade!", en: "days to the upgrade!" },
  "streak.openTodayPre": { de: "Erreiche heute", en: "Hit" },
  "streak.openTodaySuffix": { de: "Umsatz, um deine Streak fortzusetzen.", en: "in revenue today to keep your streak going." },
  "streak.toastReached": { de: "🔥 Tagesziel erreicht! Streak +1", en: "🔥 Daily goal reached! Streak +1" },
  "streak.dialog.title": { de: "🎉 7-Tage-Challenge geschafft!", en: "🎉 7-day challenge complete!" },
  "streak.dialog.bodyPre": { de: "Du hast", en: "You hit your" },
  "streak.dialog.bodyMid": { de: "7 Tage in Folge", en: "daily goal of" },
  "streak.dialog.bodyEnd": { de: "erreicht! 🔥", en: "for 7 days straight! 🔥" },
  "streak.dialog.upgrade": { de: "Du bekommst jetzt einen besseren Account.", en: "You're getting a better account now." },
  "streak.dialog.sendText": { de: "Sende diesen Text in deine WhatsApp-Gruppe:", en: "Send this message to your WhatsApp group:" },
  "streak.dialog.tapHint": { de: "👇 Tippe auf die Nachricht – sie wird kopiert & du landest direkt in WhatsApp.", en: "👇 Tap the message — it gets copied & opens WhatsApp directly." },
  "streak.whatsappText": { de: "Hey, ich habe die 7-Tage-Challenge geschafft! 🔥 Ich möchte gerne mein Account-Upgrade erhalten.", en: "Hey, I completed the 7-day challenge! 🔥 I'd like to claim my account upgrade." },
  "streak.copied": { de: "Text kopiert!", en: "Text copied!" },

  // --- Daily goal widget ---
  "dailyGoal.label": { de: "Tagesziel", en: "Daily goal" },

  // --- Month Summary ---
  "monthSummary.heading": { de: "Dein Monat auf einen Blick", en: "Your month at a glance" },
  "monthSummary.disclaimer": { de: "Diese Zahlen sind eine Vorausrechnung. Sie basiert auf deinem bisherigen Tagesdurchschnitt in diesem Monat.", en: "These numbers are a projection based on your daily average so far this month." },
  "monthSummary.ofMonth": { de: "des Monats", en: "of month" },
  "monthSummary.projectedRevenue": { de: "Voraussichtlicher Monatsumsatz", en: "Projected monthly revenue" },
  "monthSummary.projectedEarnings": { de: "Voraussichtlicher Verdienst", en: "Projected earnings" },
  "monthSummary.daysLeftPre": { de: "Noch", en: "Still" },
  "monthSummary.daysLeftSuffix": { de: "Tage bis Monatsende", en: "days until month end" },

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
  "auth.help.telegram.step3.post": { de: "— klicke einmal auf die Zahl neben \"ID:\". Damit ist sie automatisch kopiert.", en: "— tap the number next to \"ID:\" once. It's copied automatically." },
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
