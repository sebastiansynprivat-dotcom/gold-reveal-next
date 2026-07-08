// Deterministische Rotation: alle Tester sehen den gleichen Spruch pro Tag.
// Jeden Tag rotiert er weiter (dayOfYear % length).

export type Quote = { de: string; en: string };

export const COMMITMENT_QUOTES: Quote[] = [
  { de: "Ein Mann ist nur so viel wert wie sein Wort.", en: "A man is only worth as much as his word." },
  { de: "Disziplin schlägt Motivation. Jeden Tag.", en: "Discipline beats motivation. Every day." },
  { de: "Der einzige Wettbewerb ist der von gestern.", en: "The only competition is yesterday's you." },
  { de: "Konsistenz ist der Cheat-Code, den keiner nutzt.", en: "Consistency is the cheat code no one uses." },
  { de: "Amateure warten auf Inspiration. Profis erscheinen.", en: "Amateurs wait for inspiration. Pros show up." },
  { de: "Was du heute nicht tust, verpasst du für immer.", en: "What you don't do today, you miss forever." },
  { de: "Kleine Schritte, jeden Tag. Das ist der Weg.", en: "Small steps, every day. That's the way." },
  { de: "Deine Zukunft wird gerade in diesem Moment gebaut.", en: "Your future is being built right now." },
  { de: "Nicht der Stärkste gewinnt — der Konsequenteste.", en: "Not the strongest wins — the most consistent." },
  { de: "Ausreden zahlen keine Rechnungen.", en: "Excuses don't pay bills." },
  { de: "Wer sich morgens commited, entscheidet den ganzen Tag.", en: "Commit in the morning, own the whole day." },
  { de: "Zuverlässige Männer bekommen die besten Chancen.", en: "Reliable men get the best opportunities." },
  { de: "Dein Wort ist deine Währung.", en: "Your word is your currency." },
  { de: "Erfolg mag Gewohnheiten, keine Talente.", en: "Success loves habits, not talent." },
  { de: "Wer heute liefert, wird morgen gefragt.", en: "Deliver today, get called tomorrow." },
  { de: "Champions machen es, wenn keiner zuschaut.", en: "Champions do it when no one's watching." },
  { de: "Fokus ist der neue IQ.", en: "Focus is the new IQ." },
  { de: "Jeder Chat zählt. Jeder Klick baut das Reich.", en: "Every chat counts. Every click builds the empire." },
  { de: "Weiche Männer, harte Zeiten. Harte Männer, weiche Zeiten.", en: "Soft men, hard times. Hard men, soft times." },
  { de: "Du bist einen Streak entfernt vom nächsten Level.", en: "You're one streak away from the next level." },
  { de: "Verlässlichkeit ist unfair im Vorteil.", en: "Reliability is an unfair advantage." },
  { de: "Wer sich selbst nicht enttäuscht, enttäuscht andere nie.", en: "Never let yourself down — you'll never let others down." },
  { de: "Aktion killt Angst. Immer.", en: "Action kills fear. Every time." },
  { de: "Gewohnheit schlägt Willenskraft.", en: "Habit beats willpower." },
  { de: "Große Kunden gehen an die, die morgens da sind.", en: "Big clients go to those who show up in the morning." },
  { de: "Zeige mir deinen Kalender — ich sage dir deine Zukunft.", en: "Show me your calendar — I'll tell you your future." },
  { de: "Heute erledigt schlägt morgen perfekt.", en: "Done today beats perfect tomorrow." },
  { de: "Ein Committer ist unbezahlbar.", en: "A committer is priceless." },
  { de: "Der Unterschied? Sie machen es einfach.", en: "The difference? They just do it." },
  { de: "Momentum ist heilig. Brich ihn nicht.", en: "Momentum is sacred. Don't break it." },
];

export function getQuoteForToday(lang: "de" | "en" = "de"): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const q = COMMITMENT_QUOTES[dayOfYear % COMMITMENT_QUOTES.length];
  return lang === "en" ? q.en : q.de;
}
