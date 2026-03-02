export interface QuizQuestionBase {
  id: number;
  category: string;
  question: string;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  type: "multiple-choice";
  options: string[];
  correctAnswer: number;
}

export interface SortQuestion extends QuizQuestionBase {
  type: "sort";
  items: string[];
  correctOrder: string[];
}

export interface MatchQuestion extends QuizQuestionBase {
  type: "match";
  labels: string[];
  descriptions: string[];
}

export type QuizQuestion = MultipleChoiceQuestion | SortQuestion | MatchQuestion;

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    type: "multiple-choice",
    category: "Kundenpsychologie",
    question: "Warum sind die meisten Männer auf Plattformen wie OnlyFans und Co. unterwegs?",
    options: [
      "Sie suchen primär nach kostenlosem Content, der nirgendwo sonst verfügbar ist.",
      "Sie fühlen sich oft einsam und suchen neben dem Content vor allem nach persönlichem Austausch.",
      "Sie wollen ausschließlich anonyme Spenden an Content-Ersteller vergeben.",
      "Sie möchten die Models in der Regel im echten Leben kennenlernen und heiraten.",
    ],
    correctAnswer: 1,
  },
  {
    id: 2,
    type: "multiple-choice",
    category: "Verkaufsstrategie",
    question: 'Was beschreibt die \u201eA- oder B-Methode\u201c aus dem Training?',
    options: [
      "Man schickt dem Kunden zwei Bilder (Bild A und Bild B) und lässt ihn seinen Favoriten wählen.",
      "Man teilt die Kunden in Premium-Käufer (A) und Standard-Käufer (B) ein.",
      "Man findet innerhalb der ersten 20 Nachrichten heraus, ob der Kunde kauft (A) oder nicht kauft (B), um keine Zeit zu verschwenden.",
      "Man testet abwechselnd eine freundliche (A) und eine distanzierte (B) Persönlichkeit beim Schreiben.",
    ],
    correctAnswer: 2,
  },
  {
    id: 3,
    type: "multiple-choice",
    category: "Verkaufsphilosophie",
    question: "Was ist der zentrale Leitsatz bezüglich des Verkaufens?",
    options: [
      "Wir verkaufen keinen Content, sondern wir verkaufen die Emotionen, die der Content mit sich bringt.",
      "Wir müssen den Content so schnell wie möglich verkaufen, bevor der Kunde offline geht.",
      "Wir sollten immer mit Rabatten arbeiten, um die Verkaufsrate zu erhöhen.",
      "Der Content muss immer professionell produziert sein, die Emotion spielt nur eine Nebenrolle.",
    ],
    correctAnswer: 0,
  },
  {
    id: 4,
    type: "sort",
    category: "Preisstruktur",
    question: "Sortiere die Preisstufen in die korrekte, aufbauende Reihenfolge. Tippe die Werte der Reihe nach an:",
    correctOrder: ["Kostenlos", "5", "10", "20", "30", "50", "100"],
    items: ["25", "50", "10", "75", "30", "Kostenlos", "5", "15", "100", "20"],
  },
  {
    id: 5,
    type: "match",
    category: "Preisstruktur",
    question: "Ordne den Preisstufen den passenden Content zu:",
    labels: ["Kostenlos", "5€", "10€", "20€", "30€", "50€", "100€"],
    descriptions: [
      "Niemals Nudes, maximal Unterwäsche / verdeckter Körper",
      "Bild / Video Brüste nackt",
      "Bild / Video Komplett nackt",
      "Video an sich rumspielen",
      "Video Leichtes masturbieren",
      "Video Fingern / leichtes spielen mit Toy",
      "Toy / Fingern (Ab hier alles flexibel)",
    ],
  },
  {
    id: 6,
    type: "multiple-choice",
    category: "Content-Strategie",
    question: "Warum ist es laut Training fatal, beim ersten kostenlosen Bild bereits komplette Nacktheit zu zeigen?",
    options: [
      "Weil der Kunde dadurch eingeschüchtert werden könnte.",
      "Weil das Account-System dies aus technischen Gründen blockiert.",
      "Weil kostenlose Nacktbilder gegen die Richtlinien der Plattformen verstoßen.",
      "Weil der Kunde danach keinen Grund mehr hat, für aufbauenden Content zu bezahlen.",
    ],
    correctAnswer: 3,
  },
  {
    id: 7,
    type: "multiple-choice",
    category: "Zeitmanagement",
    question: "Wie sollte man reagieren, wenn ein Kunde ausdrücklich sagt, dass er kein Geld ausgeben wird?",
    options: [
      "Man sollte versuchen, einen Kompromiss zu finden und ihm zumindest ein 5-Euro-Bild aufzuschwatzen.",
      "Man ignoriert den Kunden und wendet sich dem nächsten Chat zu, ohne wertvolle Zeit zu verschwenden.",
      "Man schickt ihm als Dankeschön für seine Ehrlichkeit ein letztes kostenloses Bild.",
      "Man beginnt eine Diskussion darüber, dass Arbeit belohnt werden muss.",
    ],
    correctAnswer: 1,
  },
  {
    id: 8,
    type: "multiple-choice",
    category: "Gesprächsführung",
    question: "Welche Technik wird empfohlen, um von einem normalen Gesprächsverlauf in den Verkauf überzuleiten?",
    options: [
      "Man sendet völlig unangekündigt die Preisliste, um die Absichten direkt zu klären.",
      "Man wartet passiv ab, bis der Kunde von sich aus nach intimen Inhalten fragt.",
      'Man nutzt eine kleine, fiktive Story (z.B. \u201eIch habe mir neue Unterwäsche gekauft, willst du sie sehen?\u201c), um das Thema aktiv zu wechseln.',
      "Man fragt den Kunden, ob er genug Geld auf seinem Konto hat, bevor man fortfährt.",
    ],
    correctAnswer: 2,
  },
  {
    id: 9,
    type: "multiple-choice",
    category: "Mindset",
    question: "Was sollte man tun, wenn man mit mehreren Kunden hintereinander schreibt, die alle keinen Content kaufen?",
    options: [
      "Man beendet die Schicht für diesen Tag, da das Timing offensichtlich schlecht ist.",
      "Man geht unemotional an den nächsten Chat heran, da jeder Nicht-Käufer einen näher an einen Käufer bringt.",
      "Man senkt sofort die Preise für alle kommenden Kunden, um wenigstens etwas zu verkaufen.",
      "Man beschwert sich beim nächsten Kunden über die Geizigkeit der vorherigen Nutzer.",
    ],
    correctAnswer: 1,
  },
  {
    id: 10,
    type: "multiple-choice",
    category: "Gesprächsabschluss",
    question: "Wie ist das ideale Vorgehen unmittelbar nachdem der Kunde zum Höhepunkt gekommen ist?",
    options: [
      "Man drängt ihn sofort, ein Monatsabo abzuschließen, solange er noch online ist.",
      "Man bricht das Gespräch sofort ab, da jetzt vorerst kein Umsatz mehr generiert werden kann.",
      'Man schreibt noch kurz entspannt weiter und führt den Chat zu einem schönen Abschluss (z.B. mit einem \u201eGute Nacht\u201c-Selfie).',
      "Man schickt ihm unaufgefordert Links zu den sozialen Medien des Models.",
    ],
    correctAnswer: 2,
  },
  {
    id: 11,
    type: "multiple-choice",
    category: "Kundenbindung",
    question: "Wenn ein Kunde am Vortag viel Geld ausgegeben hat, wie sollte man am nächsten Morgen idealerweise den Chat beginnen?",
    options: [
      'Mit einer lockeren Nachricht wie \u201eGuten Morgen, hast du gut geschlafen?\u201c, um die Bindung zu pflegen.',
      "Man schreibt ihn erst wieder an, wenn man neuen, extrem teuren Content zum Verkaufen hat.",
      "Man beginnt direkt mit einer Aufforderung, den Rest der Preisliste vom Vortag abzuarbeiten.",
      "Man wartet grundsätzlich, bis der Kunde von sich aus wieder schreibt.",
    ],
    correctAnswer: 0,
  },
];
