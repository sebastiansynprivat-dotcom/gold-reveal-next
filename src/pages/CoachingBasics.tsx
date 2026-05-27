import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Check,
  Circle,
  Sparkles,
  Heart,
  Target,
  Zap,
  TrendingUp,
  MessageCircle,
  Layers,
  Repeat,
  Brain,
  Crown,
  Quote,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLibraryReads } from "@/hooks/useLibraryReads";

const PDF_URL = "/content/coaching-basics.pdf";
const CONTENT_KEY = "coaching-basics";

type Lesson = {
  num: string;
  icon: typeof Sparkles;
  title: string;
  kicker: string;
  body: React.ReactNode;
};

const LESSONS: Lesson[] = [
  {
    num: "01",
    icon: Heart,
    title: "Warum die Männer überhaupt da sind",
    kicker: "Verstehe deinen Kunden, bevor du verkaufst.",
    body: (
      <>
        <p>
          Männer sind heute einsamer als je zuvor. Dating Apps und Social Media haben den Pool der
          Frauen massiv vergrößert – aber nur das obere{" "}
          <span className="text-foreground font-semibold">1–10 %</span> der Männer bekommt
          überdurchschnittlich viel Aufmerksamkeit. Der Rest bleibt auf der Strecke.
        </p>
        <p>
          Genau diese Männer landen auf OnlyFans &amp; Co. Sie kommen zwar wegen des Contents, aber
          sie bleiben wegen{" "}
          <span className="text-foreground font-semibold">dem persönlichen Gespräch</span>. Wäre es
          nur der Content, wären sie längst auf einer kostenlosen Erotikseite.
        </p>
        <p className="text-amber-300/90 italic">
          Du gibst ihnen ein gutes Gefühl – das ist deine eigentliche Rolle.
        </p>
      </>
    ),
  },
  {
    num: "02",
    icon: Target,
    title: "Nicht jeder Kunde kauft – und das ist okay",
    kicker: "Verkauf ist ein Zahlenspiel, kein Ego-Spiel.",
    body: (
      <>
        <p>
          In jedem Verkaufsjob der Welt sagen Leute Nein. Immobilienmakler, Telefonverkäufer, alle.
          Wer mit genug Leuten schreibt, findet immer einen Käufer.
        </p>
        <p>
          Lass dich nicht demotivieren. Jeder Kunde, der nicht kauft, bringt dich{" "}
          <span className="text-foreground font-semibold">einen Schritt näher</span> zum nächsten,
          der es tut.
        </p>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mt-3">
          <p className="text-amber-200 text-sm">
            <span className="font-bold">Sebastians Beispiel:</span> 9 Kunden hintereinander haben
            nicht gekauft. Der 10. hat mehrere hundert Euro ausgegeben. Hätte er nach 8 aufgegeben –
            kein Umsatz.
          </p>
        </div>
      </>
    ),
  },
  {
    num: "03",
    icon: Zap,
    title: "Die A-oder-B-Methode",
    kicker: "Maximaler Ertrag, minimal verschwendete Zeit.",
    body: (
      <>
        <p>
          Faustformel:{" "}
          <span className="text-foreground font-semibold">
            Innerhalb der ersten 20 Nachrichten
          </span>{" "}
          geht das erste kostenpflichtige Bild raus. Danach gibt es nur zwei Ausgänge:
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-4">
            <div className="text-emerald-400 text-2xl font-black mb-1">A</div>
            <div className="text-sm text-emerald-200/90">
              Er kauft. Wir bauen die Preisstufen hoch.
            </div>
          </div>
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
            <div className="text-red-400 text-2xl font-black mb-1">B</div>
            <div className="text-sm text-red-200/90">
              Er kauft nicht. Ignorieren, weiterziehen.
            </div>
          </div>
        </div>
        <p className="mt-3">
          20 Nachrichten = 5–10 Minuten. Danach bist du nicht frustriert. Eine Stunde umsonst
          schreiben dagegen – das frisst dich auf. Geh nach Fakten, nicht nach Emotionen.
        </p>
      </>
    ),
  },
  {
    num: "04",
    icon: Brain,
    title: "Du verkaufst keine Bilder – du verkaufst Emotionen",
    kicker: "Der wichtigste Leitsatz im ganzen Coaching.",
    body: (
      <>
        <p>
          Wenn es nur um den Content ginge, wären die Kunden auf kostenlosen Seiten. Sie sind aber
          bei dir – weil sie das <span className="text-foreground font-semibold">Gefühl</span>{" "}
          kaufen, nicht die Pixel.
        </p>
        <div className="rounded-xl bg-secondary/40 border border-border/60 p-5 my-4">
          <div className="flex items-start gap-3">
            <Quote className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground">
                „Hier ist eine Tomate, ich möchte, dass du sie kaufst." → keine Emotion.
              </p>
              <p className="text-amber-200">
                „Das ist so eine saftige Tomate, die schmeckt so lecker…" → Emotion verkauft.
              </p>
            </div>
          </div>
        </div>
        <p>
          Genauso im Chat: nicht „Hier ist ein Video, 20 €." Sondern eine Story drumherum, die ihn
          mitnimmt. Jede Marke der Welt funktioniert so – sie verkauft Gefühle, nicht Produkte.
        </p>
      </>
    ),
  },
  {
    num: "05",
    icon: MessageCircle,
    title: "Die Verkaufsüberleitung",
    kicker: "Von „Mein Hund heißt Günter“ zum Verkauf – in drei Nachrichten.",
    body: (
      <>
        <p>
          Du kannst aus <span className="text-foreground font-semibold">jedem Thema</span> in den
          Verkauf überleiten. Du brauchst nur den Mut, die Brücke selbst zu bauen – der Kunde wird
          es nicht von alleine tun.
        </p>
        <div className="space-y-3 mt-4">
          <div className="rounded-xl bg-secondary/40 border border-border/60 p-4">
            <div className="text-xs uppercase tracking-wider text-amber-400/80 font-bold mb-2">
              Beispiel · Schwarze Unterwäsche
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="text-muted-foreground">Er: „Mein Hund heißt Günter."</div>
              <div>
                Du: „Oh, schöner Name! Ich hab mir heute neue schwarze Unterwäsche gekauft – kann
                ich mal deine Meinung haben?"
              </div>
              <div className="text-muted-foreground">Er: „Klar."</div>
              <div className="text-amber-300">→ Bild raus. Überleitung geschafft.</div>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border/60 p-4">
            <div className="text-xs uppercase tracking-wider text-amber-400/80 font-bold mb-2">
              Beispiel · Banane
            </div>
            <div className="text-sm">
              „Ich war heute im Supermarkt, hab eine Banane gesehen und die hat mich geil gemacht.
              Hast du grade Zeit, dass wir's uns gemeinsam machen?"
            </div>
          </div>
        </div>
        <p className="mt-3">
          Klingt verrückt? Genau das ist der Punkt. Verrückt = emotional = kauft.
        </p>
      </>
    ),
  },
  {
    num: "06",
    icon: Layers,
    title: "Aufbauende Preisstruktur",
    kicker: "Niemals von 0 auf 50 €. Immer Stufe für Stufe.",
    body: (
      <>
        <p>
          Content muss <span className="text-foreground font-semibold">aufeinander aufbauen</span>.
          Kunden zahlen nur mehr, wenn sie auch mehr sehen. Wer sofort Nacktbilder schickt, hat
          danach nichts mehr zu verkaufen.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {[
            { label: "Frei", val: "0 €", color: "from-zinc-500/30 to-zinc-700/10" },
            { label: "Stufe 1", val: "5 €", color: "from-amber-400/30 to-amber-600/5" },
            { label: "Stufe 2", val: "10 €", color: "from-amber-400/35 to-amber-600/10" },
            { label: "Stufe 3", val: "20 €", color: "from-amber-400/40 to-amber-600/10" },
            { label: "Stufe 4", val: "30 €", color: "from-amber-400/45 to-amber-600/15" },
            { label: "Stufe 5", val: "50 €", color: "from-amber-400/55 to-amber-600/15" },
            {
              label: "Gold",
              val: "100 €",
              color: "from-yellow-300/70 to-amber-500/30",
              special: true,
            },
          ].map((s) => (
            <div
              key={s.val}
              className={`rounded-lg bg-gradient-to-b ${s.color} border ${
                s.special ? "border-amber-400/60" : "border-border/40"
              } p-2 text-center`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div
                className={`text-sm font-black ${
                  s.special ? "text-amber-300" : "text-foreground"
                }`}
              >
                {s.val}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4">
          Sobald die <span className="text-amber-300 font-semibold">100 €-Stufe</span> erreicht ist,
          wird sie wiederholt – im selben Kauf. Am Ende eines Skripts sind das schnell{" "}
          <span className="text-foreground font-semibold">200–400 €</span>, die sich für ihn aber
          nicht „teuer" anfühlen, weil sie in Stufen kamen. Selbes Prinzip wie Spotify-Abo: 10 €/Monat
          = 120 €/Jahr, klingt nach nichts.
        </p>
        <p className="mt-2">
          Schreibt er am nächsten Tag wieder?{" "}
          <span className="text-foreground font-semibold">
            Es geht immer wieder bei „kostenlos" los.
          </span>{" "}
          Niemals mittendrin einsteigen.
        </p>
      </>
    ),
  },
  {
    num: "07",
    icon: TrendingUp,
    title: "Der Beispielchat – live durchgespielt",
    kicker: "So fließt ein realer Top-Chat von „Hey“ bis 400 €.",
    body: (
      <>
        <p>Sebastians Chat mit Julian – stark verkürzt, aber das Muster ist klar:</p>
        <ol className="space-y-3 mt-4">
          {[
            {
              step: "Smalltalk + Kompliment",
              detail:
                "„Hey, sag mir mal deinen Namen.“ – „Julian gefällt mir. Wie war dein Tag?“ Sofort Führung übernehmen, Fragen stellen, niemals offen lassen.",
            },
            {
              step: "Sympathie + Brücke",
              detail:
                "„Bei mir auch anstrengend. Ich nehm jetzt ne heiße Dusche und entspann mich.“ → Überleitung läuft.",
            },
            {
              step: "Erstes Bild (5 €)",
              detail:
                "Brüste verdeckt. Er fragt nach. → Bild nackt, exakt nach Preisliste.",
            },
            {
              step: "Fantasie aufbauen",
              detail:
                "„Stell dir vor, du wärst mit mir in der Dusche – was würdest du als Erstes machen?“ Du erfährst, was er mag und gibst es ihm zurück.",
            },
            {
              step: "Stufen 10 → 20 → 30 → 50 €",
              detail:
                "Bei jeder Stufe Story drumherum: „Mein Schwanz ist hart“, „Bewerte mich von 1–10“. Nie nur Content kommentarlos schicken.",
            },
            {
              step: "Heißeste Phase",
              detail:
                "Er sagt „Ich komm gleich“ → NIEMALS sofort kommen lassen. „Warte, ich will mit dir gemeinsam.“ Hier wird am meisten gekauft: 2–4 Videos à 100 €.",
            },
            {
              step: "Sauberer Abschluss",
              detail:
                "Nach dem Orgasmus wird er logisch und denkt über sein Konto nach. Jetzt KEIN Verkauf mehr – stattdessen Nähe: „Würd jetzt deinen Kopf massieren...“ Süßes Selfie kostenlos. „Bis morgen, Süßer.“",
            },
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xs font-black">
                {i + 1}
              </div>
              <div className="text-sm">
                <div className="font-bold text-foreground">{s.step}</div>
                <div className="text-muted-foreground">{s.detail}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-700/5 border border-amber-400/40 p-4 text-center">
          <div className="text-xs uppercase tracking-widest text-amber-300/80">
            Endsumme dieses einen Chats
          </div>
          <div className="text-3xl font-black text-gold-gradient mt-1">~ 400 $</div>
        </div>
      </>
    ),
  },
  {
    num: "08",
    icon: Repeat,
    title: "Stammkunden sind dein echtes Einkommen",
    kicker: "Ein Kunde mit 10 × 400 € schlägt 10 Kunden mit 1 × 400 €.",
    body: (
      <>
        <p>
          Der schönste Abschluss bringt dir nichts, wenn er nie wiederkommt. Deshalb:
        </p>
        <ul className="space-y-2 mt-3">
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Am nächsten Morgen 5 Minuten Zeit nehmen: „Guten Morgen, hast du gut geschlafen?"
            </span>
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Wenn er heute nicht in den Verkauf will – auch okay. Normal hin und her schreiben,
              Beziehung pflegen. Übermorgen kauft er wieder.
            </span>
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Emotionen brauchen Zeit zum Aufbauen. Lass ihn über seinen Chef meckern, hör zu –
              genau wie im echten Leben.
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    num: "09",
    icon: Crown,
    title: "Das Mindset, das alles entscheidet",
    kicker: "Was über Erfolg und Frust wirklich entscheidet.",
    body: (
      <>
        <ul className="space-y-3">
          <li>
            <span className="text-foreground font-bold">Unemotional bleiben.</span> Trag den Frust
            von Kunde 1 niemals zu Kunde 2. Stell dir vor, ein Makler ist pampig zu dir, weil er
            vorher 4 Absagen hatte – du würdest die Wohnung nicht nehmen, auch wenn sie perfekt
            wäre.
          </li>
          <li>
            <span className="text-foreground font-bold">Nein heißt Nein.</span> Wenn er kein Bild
            von sich schicken will – akzeptieren. Nicht diskutieren. „Okay, dann stell ich's mir
            einfach vor." Weiter im Verkauf.
          </li>
          <li>
            <span className="text-foreground font-bold">Authentisch bleiben.</span> Auch wenn der
            Kunde gut zahlt: nicht in Gier verfallen, kein Spam. 2 Minuten zwischendurch normal
            schreiben fühlt sich echt an – und genau das wollen sie.
          </li>
          <li>
            <span className="text-foreground font-bold">Kunde ist König.</span> Solange er kauft,
            darf er fast alles. Ausnahme: weit unter der Gürtellinie. Dann auch hier: faktisch
            entscheiden, nicht emotional.
          </li>
        </ul>
      </>
    ),
  },
];

export default function CoachingBasics() {
  const { reads, markProgress, markCompleted, unmarkCompleted } = useLibraryReads();
  const read = reads[CONTENT_KEY];
  const completed = !!read?.completed_at;

  const lessonRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seen = useRef<Set<number>>(new Set());
  const [maxSeen, setMaxSeen] = useState(0);
  const autoCompletedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (idx > 0 && !seen.current.has(idx - 1)) return;
          seen.current.add(idx);
          setMaxSeen((m) => Math.max(m, seen.current.size));
        });
      },
      { threshold: 0.4 }
    );
    lessonRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (maxSeen === 0) return;
    const pct = Math.round((maxSeen / LESSONS.length) * 100);
    markProgress(CONTENT_KEY, pct);
    if (pct >= 90 && !completed && !autoCompletedRef.current) {
      autoCompletedRef.current = true;
      markCompleted(CONTENT_KEY);
      toast.success("Als gelesen markiert ✓", {
        description: "Stark, dass du dir die Basics drauf geschafft hast.",
      });
    }
  }, [maxSeen, completed, markProgress, markCompleted]);

  const handleToggle = () => {
    if (completed) {
      unmarkCompleted(CONTENT_KEY);
      toast.info("Markierung entfernt");
    } else {
      markCompleted(CONTENT_KEY);
      toast.success("Als gelesen markiert ✓");
    }
  };

  const progressPct = completed ? 100 : Math.round((maxSeen / LESSONS.length) * 100);

  return (
    <div className="min-h-screen text-foreground flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <h1 className="text-sm sm:text-base font-bold tracking-wide uppercase text-gold-gradient truncate">
            Coaching Basics
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs sm:text-sm font-bold px-3 py-2 transition border ${
                completed
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                  : "bg-secondary/50 border-border hover:border-accent/60 text-foreground"
              }`}
            >
              {completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {completed ? "Gelesen" : "Als gelesen markieren"}
              </span>
            </button>
            <a
              href={PDF_URL}
              download="SheX_Coaching_Basics.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-black text-xs sm:text-sm font-bold px-3 py-2 hover:brightness-110 transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums whitespace-nowrap">
            {progressPct}% · Lektion {Math.min(maxSeen, LESSONS.length)}/{LESSONS.length}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/30 px-4 py-1.5 text-[11px] uppercase tracking-widest text-amber-300 font-bold mb-4">
            <Sparkles className="h-3 w-3" />
            Sebastian's Original Coaching
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05]">
            Erfolgreich Chatten
            <span className="block text-gold-gradient mt-1">in 9 Lektionen.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Die Essenz aus über einer Million Euro Verkaufserfahrung – auf den Punkt gebracht.
            Lies in Ruhe durch. Jede Lektion baut auf der vorigen auf.
          </p>
        </motion.div>

        {/* Lessons */}
        <div className="space-y-5 sm:space-y-7">
          {LESSONS.map((lesson, i) => {
            const Icon = lesson.icon;
            const isSeen = seen.current.has(i);
            return (
              <motion.article
                key={lesson.num}
                ref={(el) => (lessonRefs.current[i] = el as HTMLDivElement)}
                data-idx={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="relative rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary/10 backdrop-blur-sm p-5 sm:p-7 shadow-[0_0_40px_rgba(212,175,55,0.08)]"
              >
                {/* gold edge glow */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

                <header className="flex items-start gap-4 mb-4">
                  <div className="shrink-0 relative">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-700/5 border border-amber-400/40 flex items-center justify-center">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 text-[10px] font-black text-amber-300/70 bg-background/80 border border-amber-400/30 rounded px-1.5 py-0.5">
                      {lesson.num}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
                      {lesson.title}
                    </h3>
                    <p className="text-amber-300/80 text-sm mt-1 italic">{lesson.kicker}</p>
                  </div>
                </header>

                <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed space-y-3 [&_p]:m-0">
                  {lesson.body}
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Outro */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 py-4 font-bold"
            >
              <Check className="h-5 w-5" />
              Erledigt – du hast die Coaching Basics durch.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleToggle}
            className={`inline-flex items-center gap-2 rounded-xl font-bold px-6 py-3 text-sm transition border ${
              completed
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                : "bg-secondary/60 border-border hover:border-accent/60 text-foreground"
            }`}
          >
            {completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {completed ? "Als ungelesen markieren" : "Als gelesen markieren"}
          </button>
          <a
            href={PDF_URL}
            download="SheX_Coaching_Basics.pdf"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold px-6 py-3 text-sm shadow-[0_4px_20px_rgba(212,175,55,0.35)] hover:brightness-110 transition"
          >
            <Download className="h-4 w-4" />
            Original-Transkript als PDF
          </a>
        </div>
      </main>
    </div>
  );
}
