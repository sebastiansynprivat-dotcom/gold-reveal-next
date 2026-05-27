import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Check,
  Circle,
  Sparkles,
  FolderTree,
  Workflow,
  MessageSquare,
  Layers,
  Repeat,
  Lightbulb,
  ClipboardList,
  Car,
  Trees,
  Quote,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLibraryReads } from "@/hooks/useLibraryReads";

const PDF_URL = "/content/sales-scripts.pdf";
const CONTENT_KEY = "sales-scripts";

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
    icon: FolderTree,
    title: "Erst aufräumen, dann verkaufen",
    kicker: "Deine Mediathek ist dein Verkaufsregal.",
    body: (
      <>
        <p>
          Bevor du auch nur eine Überleitung versuchst, sortiere die Cloud deines Models in
          klare Ordner – nach <span className="text-foreground font-semibold">Skript</span>,
          nicht nach Stimmung. Ein Skript = ein Outfit + ein Ort, in sich aufeinander
          aufbauend.
        </p>
        <p>
          Beispiele: <em>Schwarze Unterwäsche</em>, <em>Spiegel Set</em>, <em>Küche</em>,{" "}

          <em>Dusche</em>, <em>Auto</em>, <em>Outdoor</em>. So musst du im Chat nicht suchen
          – du klickst.
        </p>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mt-3">
          <p className="text-amber-200 text-sm">
            <span className="font-bold">Fehlt dir ein Skript</span> oder ist der Content
            schlecht aufgebaut? Sofort in die WhatsApp-Gruppe schreiben, Model markieren und
            Vanessa taggen. Wir fragen das beim Model nach – damit du sauber arbeiten
            kannst.
          </p>
        </div>
      </>
    ),
  },
  {
    num: "02",
    icon: Workflow,
    title: "Der Übergang ist alles",
    kicker: "Von Smalltalk zum Verkauf – sauber und ohne Bruch.",
    body: (
      <>
        <p>
          Du startest mit den Standardfragen: „Wie alt bist du? Woher kommst du? Was
          arbeitest du? Was machst du in deiner Freizeit?" Das ist der Eisbrecher – nicht
          der Verkauf.
        </p>
        <p>
          Die eigentliche Frage ist:{" "}
          <span className="text-foreground font-semibold">
            Wie komme ich jetzt elegant von „Bauarbeiter" zu meinem Skript?
          </span>{" "}
          Antwort: Du nimmst dir ein Skript aus deiner Liste und überlegst dir genau{" "}
          <span className="text-foreground font-semibold">eine</span> natürliche
          Aussage, die in dieses Skript hineinführt. Diese Aussage schreibst du dir
          einmal raus – und benutzt sie ab dann immer wieder.
        </p>
      </>
    ),
  },
  {
    num: "03",
    icon: MessageSquare,
    title: "Skript für Skript: die Überleitungen",
    kicker: "Für jedes Setting der passende Einstieg.",
    body: (
      <>
        <p>
          Schau dir an, was im Skript räumlich passiert – und schreibe genau das in den
          Chat. Mehr Magie ist es nicht. Hier die häufigsten Beispiele aus dem Coaching:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {[
            {
              tag: "Küche",
              line: "„Bin gerade am Kochen … aber nur in Unterwäsche. Soll ich dir ein Bild schicken?“",
            },
            {
              tag: "Bad / Dusche",
              line: "„Ich spring jetzt unter die Dusche. Magst du sehen, wie ich aussehe, bevor ich rein gehe?“",
            },
            {
              tag: "Badewanne",
              line: "„Lass mich kurz die Wanne einlaufen. Ich entspann mich heute mal richtig – Lust mitzukommen?“",
            },
            {
              tag: "Bett",
              line: "„Lieg gerade nur in Unterwäsche im Bett und langweile mich ein bisschen … hast du Zeit?“",
            },
            {
              tag: "Couch",
              line: "„Mach's mir grad auf der Couch gemütlich – willst sehen, wie ich angezogen bin?“",
            },
            {
              tag: "Spiegel",
              line: "„Steh grad vorm Spiegel und feier mein neues Set richtig. Magst du ein Bild?“",
            },
            {
              tag: "Auto",
              line: "„Bin grade im Auto – und es macht mich gerade voll an. Ich muss gleich ranfahren …“",
              icon: Car,
            },
            {
              tag: "Outdoor",
              line: "„Bin spazieren und such mir grad einen ruhigen Spot. Die Fantasie, draußen erwischt zu werden, macht mich wahnsinnig an …“",
              icon: Trees,
            },
          ].map((s) => (
            <div
              key={s.tag}
              className="rounded-xl bg-secondary/40 border border-border/60 p-4"
            >
              <div className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold mb-2">
                {s.tag}
              </div>
              <div className="text-sm text-foreground/90">{s.line}</div>
            </div>
          ))}
        </div>
        <p className="mt-4">
          Antwortet er positiv, schickst du das{" "}
          <span className="text-foreground font-semibold">kostenlose Teaser-Bild</span> –
          und der Verkaufsablauf startet automatisch.
        </p>
      </>
    ),
  },
  {
    num: "04",
    icon: Layers,
    title: "Der Preis-Aufbau hinter jedem Skript",
    kicker: "Niemals alles zeigen. Stufe für Stufe.",
    body: (
      <>
        <p>
          Jedes Skript folgt demselben Aufbau. Du musst es einmal verstehen – danach läuft
          es automatisch:
        </p>
        <div className="mt-4 space-y-2">
          {[
            { p: "kostenlos", t: "Teaser in Unterwäsche – macht Lust auf mehr." },
            { p: "5 €", t: "Bild, auf dem man Brüste sieht." },
            {
              p: "10 €",
              t: "Bild, auf dem zusätzlich das Höschen sichtbar wird (vorher nicht gezeigt).",
            },
            {
              p: "20 €",
              t: "Video: Pussy zeigen oder – falls schon gesehen – sie spielt an sich rum.",
            },
            { p: "50 €", t: "Video: sie fingert sich." },
            {
              p: "100 €",
              t: "Toy-Video. Krönung des Skripts. Wenn nur Toy-Content existiert, dann 50 € = kleines Toy-Video, 100 € = noch eins.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-secondary/30 border border-border/50 p-3"
            >
              <div className="shrink-0 w-16 text-center rounded-md bg-gradient-to-br from-amber-400/30 to-amber-700/5 border border-amber-400/40 py-1.5 text-amber-300 text-sm font-black">
                {s.p}
              </div>
              <div className="text-sm text-muted-foreground">{s.t}</div>
            </div>
          ))}
        </div>
        <p className="mt-4">
          Wichtig: Zeig nie alles auf einmal. Verdeckt vor unverdeckt. Erst Brüste, dann
          Pussy, dann Bewegung, dann Toy. Sobald du die Reihenfolge brichst, brichst du
          auch den Verkauf.
        </p>
      </>
    ),
  },
  {
    num: "05",
    icon: Repeat,
    title: "Schema F – das Geheimnis der Top-Chatter",
    kicker: "Einmal denken, hundertfach wiederholen.",
    body: (
      <>
        <p>
          Top-Chatter sind nicht kreativer als du. Sie sind nur{" "}
          <span className="text-foreground font-semibold">vorbereiteter</span>. Sie haben
          ihre Überleitungen einmal aufgeschrieben – und wiederholen dann konstant
          dasselbe System.
        </p>
        <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-700/5 border border-amber-400/40 p-5 my-4">
          <div className="flex items-start gap-3">
            <Quote className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200 text-sm italic">
              „Ich bin ein kreativer Mensch – aber im Chat muss ich nicht kreativ sein. Ich
              bin kreativ <em>vor</em> dem Chat. Im Chat wende ich nur an."
            </p>
          </div>
        </div>
        <p>
          Rechne kurz mit: 8 Skripte × je 100 Wiederholungen ={" "}
          <span className="text-foreground font-semibold">800 Verkaufschancen</span>. Davon
          kaufen 100 das ganze Skript komplett durch – bei ~185 € pro Skript sind das
          schnell <span className="text-amber-300 font-bold">20.000 € Umsatz</span>. Ohne
          jeden Tag das Rad neu zu erfinden.
        </p>
        <p>
          Du bist nach 3 Stunden Chatten müde – das ist normal. Aber wer Schema F folgt,
          chattet auch müde noch sauber. Wer sich jedes Mal neu was ausdenkt, ist nach
          zwei Stunden schon schlechter.
        </p>
      </>
    ),
  },
  {
    num: "06",
    icon: Lightbulb,
    title: "Wenn dir keine Überleitung einfällt",
    kicker: "Dein Gedankenprozess – Schritt für Schritt.",
    body: (
      <>
        <p>
          Nimm dir das Skript. Frag dich:{" "}
          <span className="text-foreground font-semibold">
            Wo findet es statt? Was macht man dort normalerweise?
          </span>
        </p>
        <ol className="space-y-2 mt-3">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center justify-center">
              1
            </span>
            <span>
              Ort identifizieren (z. B. Küche).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center justify-center">
              2
            </span>
            <span>
              Logische Tätigkeit ableiten (in der Küche kocht man).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center justify-center">
              3
            </span>
            <span>
              Erotische Wendung einbauen („… aber nur in Unterwäsche").
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center justify-center">
              4
            </span>
            <span>
              Bild-Frage anhängen („Soll ich dir ein Bild schicken?").
            </span>
          </li>
        </ol>
        <p className="mt-4">
          Dieser Vierschritt funktioniert für{" "}
          <span className="text-foreground font-semibold">jedes</span> Skript. Wenn du es
          einmal verinnerlicht hast, fällt dir die Überleitung in 10 Sekunden ein.
        </p>
      </>
    ),
  },
  {
    num: "07",
    icon: ClipboardList,
    title: "Deine Hausaufgabe",
    kicker: "Ohne diesen Schritt bringt dir das Video nichts.",
    body: (
      <>
        <p>
          Geh jetzt in den Account deines Models und mach genau das, was Sebastian im
          Video gemacht hat – aber für <span className="text-foreground font-semibold">deine</span>{" "}
          Skripte:
        </p>
        <ul className="space-y-2 mt-3">
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>Mediathek nach Skripten ordnen.</span>
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Mindestens <span className="text-foreground font-semibold">10 Skripte</span>{" "}
              auflisten (oder alle, wenn du weniger hast).
            </span>
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Zu jedem Skript eine eigene Überleitung schreiben – ein, zwei Sätze reichen.
            </span>
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-amber-400 shrink-0 mt-1" />
            <span>
              Optional: pro Stufe (5 €, 10 €, 20 €, …) einen kurzen Satz vorbereiten, den
              du beim Schicken benutzt.
            </span>
          </li>
        </ul>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mt-4">
          <p className="text-amber-200 text-sm">
            <span className="font-bold">Theorie reicht nicht.</span> Dieses Wissen wird
            erst zu Geld, wenn du es einmal sauber für deinen Account aufgeschrieben hast.
            Danach läuft es automatisch.
          </p>
        </div>
      </>
    ),
  },
];

export default function SalesScripts() {
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
        description: "Stark – jetzt rein in den Account und Überleitungen rausschreiben.",
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
            Verkaufs-Skripte
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
              download="SheX_Verkaufs_Skripte.pdf"
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/30 px-4 py-1.5 text-[11px] uppercase tracking-widest text-amber-300 font-bold mb-4">
            <Sparkles className="h-3 w-3" />
            Sebastian's Verkaufs-Coaching
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05]">
            Vom Smalltalk
            <span className="block text-gold-gradient mt-1">in den Verkauf.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Die saubere Übergangs-Methode aus Sebastians Original-Coaching – mit fertigen
            Überleitungen für jedes Skript in deinem Account.
          </p>
        </motion.div>

        <div className="space-y-5 sm:space-y-7">
          {LESSONS.map((lesson, i) => {
            const Icon = lesson.icon;
            return (
              <motion.article
                key={lesson.num}
                ref={(el) => {
                  lessonRefs.current[i] = el;
                }}
                data-idx={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="relative rounded-2xl overflow-hidden border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary/10 backdrop-blur-sm p-5 sm:p-7 shadow-[0_0_40px_rgba(212,175,55,0.08)]"
              >
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

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 py-4 font-bold"
            >
              <Check className="h-5 w-5" />
              Erledigt – jetzt ab in den Account und die Hausaufgabe machen.
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
            download="SheX_Verkaufs_Skripte.pdf"
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
