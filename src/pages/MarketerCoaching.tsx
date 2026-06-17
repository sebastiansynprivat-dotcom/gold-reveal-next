import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight, Lock, Sparkles, Trophy,
  Rocket, Target, Flame, Calendar, BookOpen, Zap, Quote, TrendingUp, Star, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// =========================================================================
// COACHING CURRICULUM
// =========================================================================

type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  body: { heading?: string; text?: string; bullets?: string[]; quote?: string; callout?: string }[];
};

type Module = {
  id: string;
  title: string;
  tagline: string;
  icon: any;
  color: string; // tailwind text color
  lessons: Lesson[];
};

const MODULES: Module[] = [
  {
    id: "fundamentals",
    title: "Fundament",
    tagline: "Wie das System funktioniert.",
    icon: Target,
    color: "text-accent",
    lessons: [
      {
        id: "f1",
        title: "Der Model-Account als Bühne",
        subtitle: "Warum Instagram nur die Eintrittskarte ist.",
        minutes: 3,
        body: [
          { text: "Ein Model-Account ist ein Instagram-Profil mit einem einzigen Ziel: Aufmerksamkeit aufbauen und die richtigen User zur Paid-Plattform leiten." },
          {
            heading: "Die drei Säulen jedes Accounts",
            bullets: [
              "**Reels** – der Motor für Reichweite. Sie bringen neue Zuschauer.",
              "**Bilder** – das Gesamtbild. Sie entscheiden, ob jemand folgt.",
              "**Storys** – die Nähe. Sie binden Follower und bewerben direkt.",
            ],
          },
          { text: "Jeder Account hat ein klares Branding (Gym, Polizei, Stewardess …). Das macht ihn wiedererkennbar und glaubwürdig." },
          { quote: "Instagram verdient kein Geld – es öffnet die Tür. Erst auf der Paid-Plattform fließt Umsatz." },
        ],
      },
      {
        id: "f2",
        title: "Der Ablauf in 5 Schritten",
        subtitle: "Die feste Reihenfolge, die funktioniert.",
        minutes: 2,
        body: [
          {
            bullets: [
              "**1. Aufwärmen** – der Account wird echt und glaubwürdig.",
              "**2. Posten** – täglich Reels, Bilder und Storys.",
              "**3. Reichweite** – der Algorithmus spielt aus, die Community wächst.",
              "**4. Werbung** – die Plattform wird im richtigen Moment beworben.",
              "**5. Verdienen** – aus Reichweite wird echtes Einkommen.",
            ],
          },
          { quote: "Die Reihenfolge ist das Erfolgsrezept. Wer abkürzt, verliert Zeit – statt sie zu gewinnen." },
        ],
      },
    ],
  },
  {
    id: "warmup",
    title: "Aufwärmprozess",
    tagline: "Tag 1–7: So baust du Vertrauen bei Instagram auf.",
    icon: Flame,
    color: "text-orange-400",
    lessons: [
      {
        id: "w0",
        title: "Worum es geht",
        subtitle: "Der Algorithmus muss dich für echt halten.",
        minutes: 2,
        body: [
          { text: "Der Aufwärmprozess ist das Fundament. Er zeigt Instagram, dass hinter dem Account ein echter Mensch steht – nur so entsteht später Reichweite." },
          { callout: "Wird er falsch gemacht, bremst der Algorithmus den Account dauerhaft aus. Halte dich exakt an die Reihenfolge – überspringe nichts." },
        ],
      },
      {
        id: "w1",
        title: "Tag 1 · Account vorbereiten",
        subtitle: "Setup als echter Mensch.",
        minutes: 5,
        body: [
          {
            bullets: [
              "Instagram **mit eigener Telefonnummer** neu einrichten – ausschließlich mit **mobilen Daten**, kein WLAN.",
              "Mit normaler Tippgeschwindigkeit anmelden, **kein Copy-Paste**.",
              "**Alle Benachrichtigungen** aktivieren (vor allem Push).",
              "Authentischen Benutzernamen wählen, z. B. `emma.kfm` statt `emma.baddie.69`.",
              "Profilbild sympathisch, **nicht zu viel Haut** – wirkt vertrauenswürdig.",
              "E-Mail (wenn abgefragt) sofort verifizieren.",
              "Bio hinzufügen – nicht sexuell. Danach 10–15 Min. Reels schauen, App schließen, **24 h Pause**.",
            ],
          },
        ],
      },
      {
        id: "w2",
        title: "Tag 2 · Erste Aktivität",
        subtitle: "Verhalten wie ein echter User.",
        minutes: 3,
        body: [
          {
            bullets: [
              "Ca. **30 Min. scrollen** durch Feed & Reels.",
              "**5–10 Likes** auf verschiedenen Seiten.",
              "**1 Story** posten (normales Bild, wenig Haut).",
              "**1 Bild** posten (normales Bild, wenig Haut).",
              "**5–10 Models** folgen – langsam, nicht alle auf einmal.",
            ],
          },
        ],
      },
      {
        id: "w3",
        title: "Tag 3 · Erste Interaktionen",
        subtitle: "Ruhig bleiben – kein Spam.",
        minutes: 2,
        body: [
          {
            bullets: [
              "15–30 Min. Scrollzeit.",
              "**3–5 Likes** auf Beiträge, die dich interessieren.",
              "Kein Spamverhalten, **keine neuen Follows**.",
              "1 Bild posten (normales Bild, wenig Haut).",
              "Wechsel auf ein **Creator-Profil**.",
            ],
          },
        ],
      },
      {
        id: "w4",
        title: "Tag 4 · Routine festigen",
        subtitle: "Realistische Zeitspannen.",
        minutes: 2,
        body: [
          {
            bullets: [
              "Ca. 30 Min. auf Instagram.",
              "Reels schauen, **2–3 andere Creator** liken und folgen.",
              "Alles realistisch verteilt – wie ein echter User.",
              "**1 weitere Story** posten (normales Bild, wenig Haut).",
            ],
          },
        ],
      },
      {
        id: "w5",
        title: "Tag 5 + 6 · Realistisch bleiben",
        subtitle: "1 Like alle 3–5 Minuten.",
        minutes: 2,
        body: [
          {
            bullets: [
              "Ca. 30 Min. auf Instagram.",
              "Reels schauen, 2–3 Creator liken/folgen.",
              "**1 Like alle 3–5 Min.** – ganz natürlich.",
              "1 weitere Story posten (normales Bild, wenig Haut).",
            ],
          },
        ],
      },
      {
        id: "w7",
        title: "Tag 7 · Erstes Reel",
        subtitle: "Ab jetzt täglich Content.",
        minutes: 4,
        body: [
          { text: "Ab heute täglich **1 Reel + 1 Story** posten." },
          {
            heading: "Die ersten 3 Reels: 'clean'",
            bullets: [
              "Kleidung: **Alltagsoutfits** (Jeans, Shirt, Pulli).",
              "Inhalt: Alltagsszenen, POVs, ästhetische Trends, Memes.",
              "Ab Reel 4: langsam mehr Haut zeigen (Shorts, Top, Bikini).",
              "Reels **nur im Reel-Raster** posten, nicht zusätzlich im Feed.",
              "Feed mit Bildern weiter aufbauen (jeden 2. Tag).",
            ],
          },
          { callout: "**Wichtig:** Link-Account erst nach **Tag 30** markieren – vorher wirkt es unseriös." },
          {
            heading: "Wie geht es weiter?",
            bullets: [
              "**1–2 qualitative Reels/Tag** für die nächsten 2–4 Wochen, immer zur **gleichen Zeit** (z. B. 18 Uhr).",
              "**Nach 5 Wochen** ist der Account warm → ab dann **3 Reels/Tag**.",
              "Dann: **nächsten Account anlegen & skalieren**.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "timing",
    title: "Postingzeiten",
    tagline: "Wann gepostet wird – und wann nie.",
    icon: Calendar,
    color: "text-blue-400",
    lessons: [
      {
        id: "t1",
        title: "Die drei goldenen Zeitfenster",
        subtitle: "Zwischen 8 und 20 Uhr – nie danach.",
        minutes: 2,
        body: [
          {
            bullets: [
              "**08–10 Uhr** – Morgens beim Aufwachen, erster Griff zum Handy.",
              "**12–14 Uhr** – Mittagspause, entspanntes Scrollen.",
              "**18–20 Uhr** – Feierabend, stärkste Reichweite & Conversion.",
            ],
          },
          {
            bullets: [
              "**Reels:** in den drei Fenstern oben.",
              "**Storys:** über den Tag verteilt – durchgehend präsent bleiben.",
              "**Nie nach 20 Uhr** posten – Reichweite sinkt spürbar.",
            ],
          },
          { quote: "Feste Zeiten = feste Gewohnheit. Dein Account und deine Follower lernen, wann etwas kommt." },
        ],
      },
    ],
  },
  {
    id: "branding",
    title: "Branding & Profil",
    tagline: "Vom Profil zur Marke.",
    icon: Sparkles,
    color: "text-purple-400",
    lessons: [
      {
        id: "b1",
        title: "Was Branding wirklich heißt",
        subtitle: "Alles, was man auf einen Blick sieht.",
        minutes: 2,
        body: [
          {
            bullets: [
              "Hintergrund, Profilbild, Schriftart, Text, Bio – alles muss zusammenpassen.",
              "Thema wird über drei Träger immer wiederholt: **Kleidung, Texte, Reels**.",
            ],
          },
          { quote: "Erst wenn alles im Einklang steht, wirkt der Account stimmig, glaubwürdig und professionell." },
        ],
      },
      {
        id: "b2",
        title: "Profil-Basics",
        subtitle: "Name · Profilbild · Bio.",
        minutes: 2,
        body: [
          {
            bullets: [
              "**Name:** passend zum Thema.",
              "**Profilbild:** keine Dessous – ein lächelndes Bild wirkt vertrauenswürdiger.",
              "**Bio:** kurz, klar, zum Thema passend.",
            ],
          },
        ],
      },
      {
        id: "b3",
        title: "Highlights – dein Schaufenster",
        subtitle: "Der bewusste Spannungsbogen.",
        minutes: 3,
        body: [
          {
            heading: "Reihenfolge (immer gleich)",
            bullets: [
              "**Me** – Persönliches, Alltag, Nähe.",
              "**Sport** – wenn möglich.",
              "**Daily** – Alltagsbilder.",
              "**Spicy** – der Teaser, der neugierig macht.",
              "**Link** – führt direkt zur Paid-Plattform.",
            ],
          },
          { text: "Bewusster Spannungsbogen: harmlos & nahbar (Me, Sport) → attraktiv → Andeutung (Spicy) → Klick (Link)." },
          { callout: "**Spicy bleibt ein Teaser.** Angedeutet, nicht gezeigt. Weniger ist mehr – die Spannung verkauft, nicht die Auflösung." },
          { quote: "Me macht nahbar, Spicy macht neugierig, der Link macht Umsatz. Genau in dieser Reihenfolge." },
        ],
      },
    ],
  },
  {
    id: "content",
    title: "Content-Handwerk",
    tagline: "Texte, Vorlagen, Konstanz.",
    icon: BookOpen,
    color: "text-pink-400",
    lessons: [
      {
        id: "c1",
        title: "Texte im Content",
        subtitle: "Mittig. Einheitlich. Lesbar.",
        minutes: 2,
        body: [
          {
            bullets: [
              "**Position:** mittig im Video, immer gut lesbar.",
              "**Schriftart:** einfach, einheitlich – aus den Beispielen übernehmen.",
              "**Größe:** lesbar, aber Bild nicht ganz verdecken.",
            ],
          },
          { quote: "Konstanz schlägt Kreativität: Einheitliche Texte machen den Account wiedererkennbar." },
        ],
      },
      {
        id: "c2",
        title: "Vorlagen-System",
        subtitle: "21 Vorlagen pro Woche – nicht bei Null starten.",
        minutes: 2,
        body: [
          { text: "Jede Woche bekommst du **21 fertige Vorlagen** (3 pro Tag). Du übernimmst Caption, Sound und Text – letzteren passt du **nur minimal** an (Branding, Alter, Größe)." },
          {
            heading: "Beispiele",
            bullets: [
              "**FC-Bayern-Fangirl** → „Single, FC-Bayern-Fan" / „Lass ein Herz da, wenn dich mein Lieblingsverein nicht stört"",
              "**Stewardess** → „Suche Flugbegleitung" / „Liebe es, in der Luft zu …"",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ads",
    title: "Werbung & Skalierung",
    tagline: "Ab wann beworben wird – und wie du multiplizierst.",
    icon: TrendingUp,
    color: "text-emerald-400",
    lessons: [
      {
        id: "a1",
        title: "Werbung: zwei Kanäle",
        subtitle: "Storys und Link in Bio.",
        minutes: 2,
        body: [
          {
            bullets: [
              "**Storys** – erreichen jeden Follower, starke Conversion. Rhythmus: **alle 2 Tage**.",
              "**Link in Bio** – 24/7 sichtbar, wird von uns erstellt.",
            ],
          },
        ],
      },
      {
        id: "a2",
        title: "Werbe-Start: ab 500 Followern",
        subtitle: "Vorher fehlt das Vertrauen.",
        minutes: 2,
        body: [
          {
            heading: "Ab 500 Followern",
            bullets: [
              "Account genießt Trust.",
              "Aktive, interagierende Basis.",
              "Werbung wirkt natürlich.",
            ],
          },
          {
            heading: "Zu früh",
            bullets: [
              "Wirkt wie ein Bot.",
              "10 Follower + Link = kein Vertrauen.",
              "Verbrennt Reichweite.",
            ],
          },
          { quote: "Geduld zahlt sich aus: Wer zu früh bewirbt, verbrennt Vertrauen, das nur schwer zurückkommt." },
        ],
      },
      {
        id: "a3",
        title: "Skalierung",
        subtitle: "Ein Account ist nur der Anfang.",
        minutes: 3,
        body: [
          {
            bullets: [
              "**Neuer Account** – frühestens nach **14 Tagen**.",
              "**Maximal 3 Accounts** pro Gerät, sonst wird's riskant.",
              "**Content nur 1×** – jedes Video erscheint nur einmal.",
              "Engpass? Kurz abstimmen, dann gehen wir auf das Model zu.",
            ],
          },
          { quote: "Gleiche Routine, mehrfacher Ertrag: Jeder weitere Account vervielfacht dein Einkommen." },
        ],
      },
    ],
  },
  {
    id: "mindset",
    title: "Mindset",
    tagline: "Die Erwartung, die dich trägt.",
    icon: Award,
    color: "text-yellow-400",
    lessons: [
      {
        id: "m1",
        title: "Realistische Erwartung",
        subtitle: "Kein Sprint – etwas Besseres.",
        minutes: 3,
        body: [
          { text: "Das hier ist **kein Sprint von 0 auf 100** und **kein schneller Reichtum**. Es ist etwas Besseres:" },
          {
            bullets: [
              "Langsames, aber stetiges Wachstum.",
              "Anfangs natürliches Auf & Ab.",
              "Echtes passives Nebeneinkommen.",
              "Realer Wert, den du dir selbst aufbaust.",
            ],
          },
          { callout: "**Monat 1–2:** zäh. Du säst, ohne zu ernten.\n**Monat 3+:** Reichweite springt an, der Algorithmus arbeitet für dich – Aufwand sinkt, Ertrag steigt." },
        ],
      },
      {
        id: "m2",
        title: "Dein Warum",
        subtitle: "Was dich durch jeden zähen Tag trägt.",
        minutes: 2,
        body: [
          { text: "Frag dich von Anfang an: **Wofür machst du es?** Traumurlaub? Traumauto? Finanzielle Sicherheit? Mach es dir bewusst." },
          { quote: "Wer sein Warum kennt, hält jedes Wie aus. Setz dir ein Ziel – und bleib dran." },
        ],
      },
    ],
  },
];

const ALL_LESSON_IDS = MODULES.flatMap((m) => m.lessons.map((l) => `${m.id}:${l.id}`));

// =========================================================================
// DAILY TASKS
// =========================================================================

const DAILY_TASKS = [
  { key: "interact", icon: "💬", label: "5–10 Reels ansehen, liken & kommentieren (wie privat)" },
  { key: "reel1", icon: "🎬", label: "Reel #1 posten (08–10 oder 12–14 Uhr)" },
  { key: "reel2", icon: "🎬", label: "Reel #2 posten (18–20 Uhr Primetime)" },
  { key: "story", icon: "📸", label: "Mindestens 1 Story posten" },
  { key: "feed", icon: "🖼️", label: "Feed-Bild prüfen / heute posten (jeden 2. Tag)" },
  { key: "review", icon: "📊", label: "Performance vom Vortag kurz prüfen" },
];

const QUOTES = [
  "Konstanz schlägt Kreativität.",
  "Wer sein Warum kennt, hält jedes Wie aus.",
  "Geduld zahlt sich aus – jeder Tag baut Vertrauen auf.",
  "Gleiche Zeiten, gleiche Frequenz – so lernt dich der Algorithmus.",
  "Ein Account ist der Anfang. Skalierung ist das Ziel.",
  "Disziplin heute = Autopilot in 90 Tagen.",
];

// =========================================================================
// COMPONENT
// =========================================================================

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function MarketerCoaching() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dailyDone, setDailyDone] = useState<Set<string>>(new Set());
  const [openLesson, setOpenLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  // Load progress
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const [progressRes, tasksRes] = await Promise.all([
        supabase.from("marketer_coaching_progress").select("lesson_id").eq("user_id", user.id),
        supabase.from("marketer_daily_tasks").select("task_key,done").eq("user_id", user.id).eq("task_date", todayISO()),
      ]);
      setCompleted(new Set((progressRes.data || []).map((r: any) => r.lesson_id)));
      setDailyDone(new Set((tasksRes.data || []).filter((r: any) => r.done).map((r: any) => r.task_key)));
      setLoading(false);
    })();
  }, [user?.id]);

  const totalLessons = ALL_LESSON_IDS.length;
  const completedCount = useMemo(
    () => ALL_LESSON_IDS.filter((id) => completed.has(id)).length,
    [completed]
  );
  const overallPct = Math.round((completedCount / totalLessons) * 100);

  const toggleLesson = async (moduleId: string, lessonId: string) => {
    if (!user?.id) return;
    const key = `${moduleId}:${lessonId}`;
    const wasDone = completed.has(key);
    const next = new Set(completed);
    if (wasDone) next.delete(key); else next.add(key);
    setCompleted(next);

    if (wasDone) {
      await supabase.from("marketer_coaching_progress").delete().eq("user_id", user.id).eq("lesson_id", key);
    } else {
      await supabase.from("marketer_coaching_progress").upsert(
        { user_id: user.id, lesson_id: key, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );
      // Celebration when module/whole curriculum finished
      const mod = MODULES.find((m) => m.id === moduleId);
      if (mod && mod.lessons.every((l) => next.has(`${moduleId}:${l.id}`))) {
        toast.success(`🏆 Modul abgeschlossen: ${mod.title}`);
      }
      if (next.size === totalLessons) {
        toast.success("🎉 Alle Module geschafft – du bist startklar!");
      }
    }
  };

  const toggleDailyTask = async (key: string) => {
    if (!user?.id) return;
    const wasDone = dailyDone.has(key);
    const next = new Set(dailyDone);
    if (wasDone) next.delete(key); else next.add(key);
    setDailyDone(next);
    await supabase.from("marketer_daily_tasks").upsert(
      { user_id: user.id, task_date: todayISO(), task_key: key, done: !wasDone },
      { onConflict: "user_id,task_date,task_key" }
    );
    if (!wasDone && next.size === DAILY_TASKS.length) {
      toast.success("🔥 Heute alles erledigt – stark!");
    }
  };

  const dailyPct = Math.round((dailyDone.size / DAILY_TASKS.length) * 100);

  const handleLogout = async () => {
    await signOut();
    navigate("/marketer/login");
  };

  const openModule = MODULES.find((m) => m.id === openLesson?.moduleId);
  const openLessonObj = openModule?.lessons.find((l) => l.id === openLesson?.lessonId);

  // Next recommended lesson
  const nextLesson = useMemo(() => {
    for (const m of MODULES) {
      for (const l of m.lessons) {
        if (!completed.has(`${m.id}:${l.id}`)) return { moduleId: m.id, lessonId: l.id, title: l.title, moduleTitle: m.title };
      }
    }
    return null;
  }, [completed]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 antialiased subpixel-antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/marketer")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-foreground/90">SheX Coaching</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-accent">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-background/50 to-background/30 backdrop-blur-sm p-6 md:p-8"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-accent/80 font-bold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Marketer Academy
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
              Vom Onboarding<br />
              <span className="bg-gradient-to-r from-accent to-yellow-300 bg-clip-text text-transparent">zur Skalierung.</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              Alles, was du als SheX-Marketer wissen musst – kompakt, klar, sofort umsetzbar. Arbeite dich Lektion für Lektion durch und hak deinen Fortschritt ab.
            </p>

            {/* Overall progress */}
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="uppercase tracking-wider text-muted-foreground font-semibold">Dein Fortschritt</span>
                <span className="font-bold text-accent tabular-nums">{completedCount}/{totalLessons} · {overallPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-background/60 overflow-hidden border border-border/40">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent via-yellow-400 to-amber-300 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {nextLesson && (
              <button
                onClick={() => setOpenLesson({ moduleId: nextLesson.moduleId, lessonId: nextLesson.lessonId })}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-yellow-400 text-background font-bold text-sm hover:opacity-95 transition shadow-lg shadow-accent/20"
              >
                <Rocket className="h-4 w-4" />
                Weiter mit: {nextLesson.title}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.section>

        {/* DAILY TASKS */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-5"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-foreground/90">Heute · Tagesroutine</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{dailyDone.size}/{DAILY_TASKS.length}</span>
              <div className="w-24 h-1.5 rounded-full bg-background/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-accent transition-all"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {DAILY_TASKS.map((t) => {
              const done = dailyDone.has(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => toggleDailyTask(t.key)}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    done
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/40 bg-background/40 hover:border-accent/40 hover:bg-accent/5"
                  }`}
                >
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <span className={`flex-1 text-sm leading-snug ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.label}
                  </span>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground/80 italic mt-3">
            Reset um Mitternacht. Streak = täglich alle Aufgaben erledigen.
          </p>
        </motion.section>

        {/* MOTIVATIONAL TIMELINE */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-foreground/90">Realistische Aussichten</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { phase: "Monat 1–2", status: "Zähe Phase", color: "border-orange-500/40 bg-orange-500/10 text-orange-300", desc: "Aufwärmprozess, langsamer Aufbau. Du säst, ohne sofort zu ernten – das ist normal." },
              { phase: "Monat 3–4", status: "Wendepunkt", color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300", desc: "Erste Reels gehen viral, Reichweite springt an, Follower kommen schneller." },
              { phase: "Ab Monat 5", status: "Autopilot", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", desc: "Algorithmus arbeitet für dich. Routine läuft, Aufwand sinkt, Umsatz wächst." },
            ].map((p, i) => (
              <div key={i} className={`rounded-xl border p-4 ${p.color}`}>
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{p.phase}</div>
                <div className="text-base font-extrabold mt-1">{p.status}</div>
                <p className="text-xs mt-2 text-foreground/80 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-background/40 border border-accent/20 p-4">
            <Quote className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm italic text-foreground/90 leading-relaxed">"{QUOTES[quoteIdx]}"</p>
          </div>
        </motion.section>

        {/* MODULES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-foreground/90">Curriculum</h2>
          </div>

          {MODULES.map((mod, mi) => {
            const Icon = mod.icon;
            const modDone = mod.lessons.filter((l) => completed.has(`${mod.id}:${l.id}`)).length;
            const modPct = Math.round((modDone / mod.lessons.length) * 100);
            const prevModDone = mi === 0 ? true : MODULES[mi - 1].lessons.every((l) => completed.has(`${MODULES[mi - 1].id}:${l.id}`));
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + mi * 0.03 }}
                className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm overflow-hidden"
              >
                <div className="p-5 border-b border-border/40">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl border border-accent/30 bg-background/60 flex items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${mod.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Modul {mi + 1}</div>
                        <h3 className="text-base md:text-lg font-extrabold text-foreground leading-tight">{mod.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.tagline}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fortschritt</div>
                      <div className="text-sm font-bold text-accent tabular-nums">{modDone}/{mod.lessons.length}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-background/60 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${modPct}%` }} />
                  </div>
                </div>

                <div className="divide-y divide-border/30">
                  {mod.lessons.map((l, li) => {
                    const key = `${mod.id}:${l.id}`;
                    const done = completed.has(key);
                    const locked = !prevModDone && li > 0 && !done; // soft-lock later lessons of a module if prev module unfinished
                    return (
                      <button
                        key={l.id}
                        onClick={() => !locked && setOpenLesson({ moduleId: mod.id, lessonId: l.id })}
                        disabled={locked}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                          locked ? "opacity-40 cursor-not-allowed" : "hover:bg-accent/5"
                        }`}
                      >
                        <div className="shrink-0">
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          ) : locked ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {l.title}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5">{l.subtitle}</div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                          <span className="tabular-nums">{l.minutes} Min</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* COMPLETION BADGE */}
        {completedCount === totalLessons && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/20 to-yellow-400/10 p-6 text-center"
          >
            <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
            <div className="text-lg font-extrabold text-foreground">Coaching abgeschlossen</div>
            <p className="text-sm text-muted-foreground mt-1">Du kennst das gesamte System. Jetzt heißt es: täglich liefern und skalieren.</p>
          </motion.div>
        )}
      </main>

      {/* LESSON MODAL */}
      <AnimatePresence>
        {openLesson && openModule && openLessonObj && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setOpenLesson(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-accent/30 rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl shadow-accent/10"
            >
              <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border/40 p-4 md:p-5 flex items-center justify-between gap-3 z-10">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-accent font-bold">{openModule.title}</div>
                  <h3 className="text-lg md:text-xl font-extrabold text-foreground leading-tight truncate">{openLessonObj.title}</h3>
                </div>
                <button onClick={() => setOpenLesson(null)} className="text-muted-foreground hover:text-foreground text-2xl leading-none px-2">×</button>
              </div>

              <div className="p-5 md:p-7 space-y-5 antialiased">
                <p className="text-sm text-muted-foreground italic">{openLessonObj.subtitle}</p>

                {openLessonObj.body.map((b, i) => (
                  <div key={i} className="space-y-2">
                    {b.heading && <h4 className="text-sm uppercase tracking-wider font-bold text-accent">{b.heading}</h4>}
                    {b.text && <p className="text-[15px] leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />}
                    {b.bullets && (
                      <ul className="space-y-2">
                        {b.bullets.map((bl, bi) => (
                          <li key={bi} className="flex items-start gap-2.5 text-[15px] text-foreground/90 leading-relaxed">
                            <Star className="h-3.5 w-3.5 text-accent shrink-0 mt-1.5" />
                            <span dangerouslySetInnerHTML={{ __html: renderInline(bl) }} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {b.quote && (
                      <div className="border-l-2 border-accent/60 pl-4 py-1 italic text-foreground/95 text-[15px] leading-relaxed">
                        "{b.quote}"
                      </div>
                    )}
                    {b.callout && (
                      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: renderInline(b.callout) }}
                      />
                    )}
                  </div>
                ))}

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      toggleLesson(openModule.id, openLessonObj.id);
                    }}
                    className={`flex-1 ${completed.has(`${openModule.id}:${openLessonObj.id}`)
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-gradient-to-r from-accent to-yellow-400 text-background hover:opacity-95"}`}
                  >
                    {completed.has(`${openModule.id}:${openLessonObj.id}`) ? (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Erledigt – zurücksetzen</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Als erledigt markieren</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Mark done and jump to next lesson
                      if (!completed.has(`${openModule.id}:${openLessonObj.id}`)) {
                        toggleLesson(openModule.id, openLessonObj.id);
                      }
                      const flat = MODULES.flatMap((m) => m.lessons.map((l) => ({ moduleId: m.id, lessonId: l.id })));
                      const idx = flat.findIndex((x) => x.moduleId === openModule.id && x.lessonId === openLessonObj.id);
                      const next = flat[idx + 1];
                      if (next) setOpenLesson(next);
                      else setOpenLesson(null);
                    }}
                    className="flex-1 border-accent/30"
                  >
                    Nächste Lektion <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function renderInline(s: string) {
  // Minimal markdown: **bold** and `code`
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-background/60 text-accent text-[13px]">$1</code>')
    .replace(/\n/g, "<br/>");
}
