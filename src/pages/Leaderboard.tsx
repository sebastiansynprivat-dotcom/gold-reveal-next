import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trophy, Crown, Medal, Calendar, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import GoldParticles from "@/components/GoldParticles";
import AnimatedNumber from "@/components/AnimatedNumber";
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

function seededRandom(seed: number): number {
  let x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// End-of-month maximums
const MAX_REVENUES = (() => {
  const arr: number[] = [];
  arr.push(98347); // Sebastian — significantly higher than rest
  for (let i = 1; i < 100; i++) {
    const base = 82000 - (i - 1) * ((82000 - 29000) / 99);
    const jitter = (seededRandom(i * 137) - 0.5) * 5000;
    arr.push(Math.round(Math.max(27000, Math.min(83000, base + jitter))));
  }
  const [first, ...rest] = arr;
  rest.sort((a, b) => b - a);
  return [first, ...rest];
})();

// Pick 5 deterministic days where Sebastian drops to rank 2–3
const SEBASTIAN_SLOW_DAYS = (() => {
  const days = new Set<number>();
  let seed = 42;
  while (days.size < 5) {
    seed += 17;
    const d = Math.floor(seededRandom(seed) * 26) + 3; // days 3–28
    days.add(d);
  }
  return days;
})();

// Pre-compute cumulative revenues for all players for each day (1..31)
function buildCumulativeRevenues(daysInMonth: number) {
  // result[playerIndex][day] = cumulative revenue at that day
  const result: number[][] = [];

  for (let i = 0; i < 100; i++) {
    const maxRev = MAX_REVENUES[i];
    const dailyBase = maxRev / daysInMonth;
    const dayRevenues: number[] = [0]; // day 0 = 0
    let cumulative = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const rand = seededRandom(d * 31 + i * 7 + 999);
      let increment = dailyBase * (0.6 + rand * 0.8);

      // Sebastian (i=0): minor dip on slow days — drops to rank 2–3 max
      if (i === 0 && SEBASTIAN_SLOW_DAYS.has(d)) {
        increment *= 0.85;
      }

      // Add small "uneven" jitter so numbers never look round
      const jitter = Math.round(seededRandom(d * 13 + i * 3 + 777) * 47) - 23;
      cumulative += Math.max(50, Math.round(increment) + jitter);
      dayRevenues.push(cumulative);
    }

    result.push(dayRevenues);
  }

  return result;
}

// Diamond chatters — deterministic set of top players
const DIAMOND_PLAYERS = new Set([0, 2, 5]);

function generateLeaderboard(day: number, cumulativeData: number[][]) {
  const entries = cumulativeData.map((dayRevenues, i) => ({
    playerIndex: i,
    name: FIRST_NAMES[i % FIRST_NAMES.length],
    lastInit: LAST_INITIALS[i % LAST_INITIALS.length],
    revenue: dayRevenues[day],
    rank: 0,
    isDiamond: DIAMOND_PLAYERS.has(i),
  }));

  entries.sort((a, b) => b.revenue - a.revenue);
  entries.forEach((e, idx) => { e.rank = idx + 1; });

  return entries;
}

function censorName(name: string, lastInit: string) {
  const visible = name.slice(0, 3);
  const stars = "*".repeat(Math.max(2, name.length - 3));
  return `${visible}${stars} ${lastInit}.`;
}

function getRankBg(rank: number) {
  if (rank === 1) return "bg-accent/10 border-accent/30";
  if (rank === 2) return "bg-muted/30 border-border/20";
  if (rank === 3) return "bg-muted/20 border-border/15";
  return "bg-secondary/20 border-border/10";
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.012 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

function getDaysInMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const daysInMonth = getDaysInMonth();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const cumulativeData = useMemo(
    () => buildCumulativeRevenues(daysInMonth),
    [daysInMonth]
  );

  const leaderboard = useMemo(
    () => generateLeaderboard(selectedDay, cumulativeData),
    [selectedDay, cumulativeData]
  );

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <GoldParticles spawnRate={0.2} maxParticles={15} baseOpacity={0.15} />

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
      <div className="container max-w-3xl mx-auto px-4 pt-4 pb-1">
        <div className="glass-card-subtle rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] text-muted-foreground">Monatstag</span>
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
            className="[&_[data-radix-slider-track]]:h-1 [&_[data-radix-slider-track]]:bg-secondary/40 [&_[data-radix-slider-range]]:bg-accent [&_[data-radix-slider-thumb]]:h-4 [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:border-accent [&_[data-radix-slider-thumb]]:bg-background [&_[data-radix-slider-thumb]]:shadow-[0_0_8px_hsl(var(--accent)/0.35)]"
          />
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="container max-w-3xl mx-auto px-4 pt-4 pb-2">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-3 gap-2.5 mb-6"
        >
          {/* 2nd */}
          <div className="flex flex-col items-center pt-7">
            <div className="glass-card-subtle rounded-xl p-3 w-full text-center space-y-2">
              <div className="mx-auto h-9 w-9 rounded-full bg-muted/40 border border-border/30 flex items-center justify-center">
                <Medal className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight flex items-center justify-center gap-1">
                {censorName(leaderboard[1].name, leaderboard[1].lastInit)}
                {leaderboard[1].isDiamond && <Gem className="h-3 w-3 text-accent shrink-0" />}
              </p>
              <AnimatedNumber
                value={leaderboard[1].revenue}
                suffix="€"
                className="text-sm font-bold text-foreground tabular-nums block"
              />
            </div>
          </div>

          {/* 1st */}
          <div className="flex flex-col items-center">
            <div className="glass-card rounded-xl p-4 w-full text-center space-y-2.5 gold-gradient-border-animated relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-accent/8 to-transparent pointer-events-none" />
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto h-11 w-11 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center relative"
              >
                <Crown className="h-5 w-5 text-accent" />
              </motion.div>
              <p className="text-[10px] font-semibold text-accent truncate leading-tight">
                {censorName(leaderboard[0].name, leaderboard[0].lastInit)}
              </p>
              <AnimatedNumber
                value={leaderboard[0].revenue}
                suffix="€"
                className="text-base font-bold text-gold-gradient tabular-nums block"
              />
            </div>
          </div>

          {/* 3rd */}
          <div className="flex flex-col items-center pt-9">
            <div className="glass-card-subtle rounded-xl p-3 w-full text-center space-y-2">
              <div className="mx-auto h-9 w-9 rounded-full bg-muted/30 border border-border/20 flex items-center justify-center">
                <Medal className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate leading-tight">
                {censorName(leaderboard[2].name, leaderboard[2].lastInit)}
              </p>
              <AnimatedNumber
                value={leaderboard[2].revenue}
                suffix="€"
                className="text-sm font-bold text-foreground tabular-nums block"
              />
            </div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent mb-3" />

        {/* Full list */}
        <motion.div
          key={`list-${selectedDay}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-1"
        >
          {leaderboard.slice(3).map((entry) => (
            <motion.div
              key={entry.playerIndex}
              variants={staggerItem}
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 ${getRankBg(entry.rank)}`}
            >
              <span className="text-[11px] font-bold text-muted-foreground w-7 text-right shrink-0 tabular-nums">
                #{entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {censorName(entry.name, entry.lastInit)}
                </p>
              </div>
              <AnimatedNumber
                value={entry.revenue}
                suffix="€"
                className="text-[13px] font-bold text-foreground shrink-0 tabular-nums"
                duration={0.5}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
