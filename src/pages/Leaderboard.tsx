import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trophy, Crown, Medal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import GoldParticles from "@/components/GoldParticles";
import logo from "@/assets/logo.png";

const FIRST_NAMES = [
  "Sebastian","Maximilian","Alexander","Lukas","Jonas","Leon","Finn","Noah","Elias","Ben",
  "Paul","Felix","Luca","Tim","Niklas","Julian","David","Moritz","Philipp","Jan",
  "Tom","Erik","Fabian","Marcel","Dennis","Kevin","Patrick","Christian","Daniel","Marco",
  "Tobias","Stefan","Andreas","Michael","Thomas","Martin","Robert","Simon","Dominik","Florian",
  "Oliver","Sven","Henrik","Bastian","Kai","Lars","Nils","Robin","Timo","Sascha",
  "Anna","Laura","Lisa","Sarah","Julia","Lena","Sophia","Marie","Hannah","Emma",
  "Mia","Leonie","Amelie","Clara","Nina","Johanna","Katharina","Eva","Maja","Alina",
  "Jana","Lara","Nele","Selina","Vanessa","Jasmin","Melanie","Nadine","Sabrina","Christina",
  "Jessica","Stefanie","Sandra","Bianca","Diana","Franziska","Helena","Ines","Kira","Miriam",
  "Tamara","Vera","Yvonne","Carla","Greta","Hanna","Ida","Klara","Rosa","Zoe",
];

const LAST_INITIALS = [
  "Sc","Mü","Be","Kl","Wo","Ha","Fi","Sc","We","Kr",
  "Ba","Ho","Zi","La","Br","Ri","St","Me","Le","Bo",
  "Ka","Pe","Th","Wa","Hu","Di","Fr","Ge","Ja","Ne",
  "Ot","Re","Un","Vo","Wi","Al","Eh","Gr","He","Ko",
  "Ma","Pa","Qu","Ru","Se","Ta","Vi","Xe","Zu","Bi",
  "Da","Fe","Gi","Hi","Jo","Li","Mo","Na","Ol","Po",
  "Ra","Si","Ti","Ul","Va","Wa","Ye","Zi","An","Bu",
  "Ch","Du","El","Fa","Go","Hö","Is","Ju","Ke","Lo",
  "Ni","Op","Pf","Ro","Sw","Te","Um","Ve","Wö","Za",
  "Ad","Bl","Ce","Dr","En","Fl","Ga","Hä","Im","Kö",
];

// Deterministic pseudo-random from seed
function seededRandom(seed: number): number {
  let x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Max revenues per player (end-of-month targets)
const MAX_REVENUES = (() => {
  const arr: number[] = [];
  // #1 Sebastian: 98347
  arr.push(98347);
  for (let i = 1; i < 100; i++) {
    const base = 93000 - (i - 1) * ((93000 - 29000) / 99);
    const jitter = (seededRandom(i * 137) - 0.5) * 6000;
    arr.push(Math.round(Math.max(27000, Math.min(94000, base + jitter))));
  }
  // Sort rest descending, keep #1
  const [first, ...rest] = arr;
  rest.sort((a, b) => b - a);
  return [first, ...rest];
})();

function generateLeaderboard(day: number, daysInMonth: number) {
  const progress = day / daysInMonth;

  const entries = MAX_REVENUES.map((maxRev, i) => {
    const rand = seededRandom(day * 31 + i * 7);
    const dayRevenue = Math.round(maxRev * progress * (0.82 + rand * 0.36));
    // Make numbers "krumm" — never round hundreds
    const uneven = dayRevenue + Math.round(seededRandom(day * 13 + i * 3) * 47) - 23;
    return {
      rank: i + 1,
      name: FIRST_NAMES[i % FIRST_NAMES.length],
      lastInit: LAST_INITIALS[i % LAST_INITIALS.length],
      revenue: Math.max(day === 1 ? 200 : 500, uneven),
    };
  });

  // Keep Sebastian #1, sort rest
  const [first, ...rest] = entries;
  rest.sort((a, b) => b.revenue - a.revenue);
  return [first, ...rest.map((e, idx) => ({ ...e, rank: idx + 2 }))];
}

function censorName(name: string, lastInit: string) {
  const visible = name.slice(0, 3);
  const stars = "*".repeat(Math.max(2, name.length - 3));
  return `${visible}${stars} ${lastInit}.`;
}

function getRankBg(rank: number) {
  if (rank === 1) return "bg-accent/15 border-accent/40";
  if (rank === 2) return "bg-[hsl(0_0%_75%/0.08)] border-[hsl(0_0%_75%/0.25)]";
  if (rank === 3) return "bg-[hsl(25_60%_45%/0.08)] border-[hsl(25_60%_45%/0.25)]";
  return "bg-secondary/30 border-border/20";
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.015 } },
};
const staggerItem = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

function getDaysInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const daysInMonth = getDaysInMonth();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const leaderboard = useMemo(
    () => generateLeaderboard(selectedDay, daysInMonth),
    [selectedDay, daysInMonth]
  );

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <GoldParticles spawnRate={0.25} maxParticles={20} baseOpacity={0.2} />

      {/* Header */}
      <header className="header-gradient-border">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
          <div>
            <h1 className="text-base font-bold text-foreground">Bestenliste</h1>
            <p className="text-[10px] text-muted-foreground">Top-Chatter nach Monatsumsatz</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-accent">Top 100</span>
          </div>
        </div>
      </header>

      {/* Day Slider */}
      <div className="container max-w-3xl mx-auto px-4 pt-4">
        <div className="glass-card-subtle rounded-xl px-4 py-3 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Monatstag</span>
            </div>
            <span className="text-sm font-bold text-gold-gradient tabular-nums">
              Tag {selectedDay} / {daysInMonth}
            </span>
          </div>
          <Slider
            value={[selectedDay]}
            onValueChange={(v) => setSelectedDay(v[0])}
            min={1}
            max={daysInMonth}
            step={1}
            className="[&_[data-radix-slider-track]]:h-1.5 [&_[data-radix-slider-track]]:bg-secondary/50 [&_[data-radix-slider-range]]:bg-accent [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:border-accent [&_[data-radix-slider-thumb]]:bg-background [&_[data-radix-slider-thumb]]:shadow-[0_0_8px_hsl(var(--accent)/0.4)]"
          />
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="container max-w-3xl mx-auto px-4 pt-5 pb-2">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-3 gap-2.5 mb-5"
        >
          {/* 2nd */}
          <div className="flex flex-col items-center pt-6">
            <div className="glass-card-subtle rounded-xl p-3.5 w-full text-center space-y-2 border border-[hsl(0_0%_75%/0.2)]">
              <div className="mx-auto h-10 w-10 rounded-full bg-[hsl(0_0%_75%/0.1)] border border-[hsl(0_0%_75%/0.3)] flex items-center justify-center">
                <Medal className="h-5 w-5 text-[hsl(0_0%_75%)]" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
                {censorName(leaderboard[1].name, leaderboard[1].lastInit)}
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {leaderboard[1].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>

          {/* 1st */}
          <div className="flex flex-col items-center">
            <div className="glass-card rounded-xl p-4 w-full text-center space-y-2 gold-gradient-border-animated relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto h-12 w-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center relative"
              >
                <Crown className="h-6 w-6 text-accent" />
              </motion.div>
              <p className="text-[10px] font-semibold text-accent truncate leading-tight">
                {censorName(leaderboard[0].name, leaderboard[0].lastInit)}
              </p>
              <p className="text-lg font-bold text-gold-gradient tabular-nums">
                {leaderboard[0].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>

          {/* 3rd */}
          <div className="flex flex-col items-center pt-8">
            <div className="glass-card-subtle rounded-xl p-3.5 w-full text-center space-y-2 border border-[hsl(25_60%_45%/0.2)]">
              <div className="mx-auto h-10 w-10 rounded-full bg-[hsl(25_60%_45%/0.08)] border border-[hsl(25_60%_45%/0.3)] flex items-center justify-center">
                <Medal className="h-5 w-5 text-[hsl(25_60%_45%)]" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
                {censorName(leaderboard[2].name, leaderboard[2].lastInit)}
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {leaderboard[2].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-4" />

        {/* Full list */}
        <motion.div
          key={`list-${selectedDay}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-1.5"
        >
          {leaderboard.slice(3).map((entry) => (
            <motion.div
              key={entry.rank}
              variants={staggerItem}
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${getRankBg(entry.rank)}`}
            >
              <span className="text-xs font-bold text-muted-foreground w-7 text-right shrink-0 tabular-nums">
                #{entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {censorName(entry.name, entry.lastInit)}
                </p>
              </div>
              <span className="text-[13px] font-bold text-foreground shrink-0 tabular-nums">
                {entry.revenue.toLocaleString("de-DE")}€
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
