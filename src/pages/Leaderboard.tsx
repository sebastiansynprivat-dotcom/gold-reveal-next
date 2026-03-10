import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trophy, Crown, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoldParticles from "@/components/GoldParticles";
import logo from "@/assets/logo.png";

// Generate 100 fake entries from 100k down to ~30k
const FIRST_NAMES = [
  "Sebastian", "Maximilian", "Alexander", "Lukas", "Jonas", "Leon", "Finn", "Noah", "Elias", "Ben",
  "Paul", "Felix", "Luca", "Tim", "Niklas", "Julian", "David", "Moritz", "Philipp", "Jan",
  "Tom", "Erik", "Fabian", "Marcel", "Dennis", "Kevin", "Patrick", "Christian", "Daniel", "Marco",
  "Tobias", "Stefan", "Andreas", "Michael", "Thomas", "Martin", "Robert", "Simon", "Dominik", "Florian",
  "Oliver", "Sven", "Henrik", "Bastian", "Kai", "Lars", "Nils", "Robin", "Timo", "Sascha",
  "Anna", "Laura", "Lisa", "Sarah", "Julia", "Lena", "Sophia", "Marie", "Hannah", "Emma",
  "Mia", "Leonie", "Amelie", "Clara", "Nina", "Johanna", "Katharina", "Eva", "Maja", "Alina",
  "Jana", "Lara", "Nele", "Selina", "Vanessa", "Jasmin", "Melanie", "Nadine", "Sabrina", "Christina",
  "Jessica", "Stefanie", "Sandra", "Bianca", "Diana", "Franziska", "Helena", "Ines", "Kira", "Miriam",
  "Tamara", "Vera", "Yvonne", "Carla", "Greta", "Hanna", "Ida", "Klara", "Rosa", "Zoe",
];

const LAST_INITIALS = [
  "Sc", "Mü", "Be", "Kl", "Wo", "Ha", "Fi", "Sc", "We", "Kr",
  "Ba", "Ho", "Zi", "La", "Br", "Ri", "St", "Me", "Le", "Bo",
  "Ka", "Pe", "Th", "Wa", "Hu", "Di", "Fr", "Ge", "Ja", "Ne",
  "Ot", "Re", "Un", "Vo", "Wi", "Al", "Eh", "Gr", "He", "Ko",
  "Ma", "Pa", "Qu", "Ru", "Se", "Ta", "Vi", "Xe", "Zu", "Bi",
  "Da", "Fe", "Gi", "Hi", "Jo", "Li", "Mo", "Na", "Ol", "Po",
  "Ra", "Si", "Ti", "Ul", "Va", "Wa", "Ye", "Zi", "An", "Bu",
  "Ch", "Du", "El", "Fa", "Go", "Hö", "Is", "Ju", "Ke", "Lo",
  "Ni", "Op", "Pf", "Ro", "Sw", "Te", "Um", "Ve", "Wö", "Za",
  "Ad", "Bl", "Ce", "Dr", "En", "Fl", "Ga", "Hä", "Im", "Kö",
];

function generateLeaderboard() {
  const entries = [];
  // #1 is Sebastian Sc with 100k
  entries.push({ rank: 1, name: "Sebastian", lastInit: "Sc", revenue: 100000 });

  // Generate remaining 99 entries from ~95k down to ~30k
  for (let i = 1; i < 100; i++) {
    const revenue = Math.round(95000 - (i - 1) * ((95000 - 30000) / 99));
    // Add some randomness ±2k
    const jitter = Math.round((Math.random() - 0.5) * 4000);
    const finalRevenue = Math.max(28000, Math.min(96000, revenue + jitter));
    entries.push({
      rank: i + 1,
      name: FIRST_NAMES[i % FIRST_NAMES.length],
      lastInit: LAST_INITIALS[i % LAST_INITIALS.length],
      revenue: finalRevenue,
    });
  }

  // Sort by revenue descending and re-rank (keep Sebastian #1)
  const [first, ...rest] = entries;
  rest.sort((a, b) => b.revenue - a.revenue);
  return [first, ...rest.map((e, i) => ({ ...e, rank: i + 2 }))];
}

const LEADERBOARD = generateLeaderboard();

function censorName(name: string, lastInit: string) {
  const visible = name.slice(0, 3);
  const stars = "*".repeat(Math.max(2, name.length - 3));
  return `${visible}${stars} ${lastInit}.`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-[hsl(43_76%_46%)]" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-[hsl(0_0%_75%)]" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-[hsl(25_60%_45%)]" />;
  return null;
}

function getRankBg(rank: number) {
  if (rank === 1) return "bg-accent/15 border-accent/40";
  if (rank === 2) return "bg-[hsl(0_0%_75%/0.08)] border-[hsl(0_0%_75%/0.25)]";
  if (rank === 3) return "bg-[hsl(25_60%_45%/0.08)] border-[hsl(25_60%_45%/0.25)]";
  return "bg-secondary/30 border-border/20";
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02 } },
};
const staggerItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export default function Leaderboard() {
  const navigate = useNavigate();

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

      {/* Top 3 Podium */}
      <div className="container max-w-3xl mx-auto px-4 pt-6 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-3 gap-2 mb-6"
        >
          {/* 2nd place */}
          <div className="flex flex-col items-center pt-6">
            <div className="glass-card-subtle rounded-xl p-3 w-full text-center space-y-1.5 border border-[hsl(0_0%_75%/0.2)]">
              <div className="mx-auto h-10 w-10 rounded-full bg-[hsl(0_0%_75%/0.1)] border border-[hsl(0_0%_75%/0.3)] flex items-center justify-center">
                <span className="text-lg font-bold text-[hsl(0_0%_75%)]">2</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate">
                {censorName(LEADERBOARD[1].name, LEADERBOARD[1].lastInit)}
              </p>
              <p className="text-sm font-bold text-foreground">
                {LEADERBOARD[1].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center">
            <div className="glass-card rounded-xl p-3 w-full text-center space-y-1.5 gold-gradient-border-animated relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto h-12 w-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center relative"
              >
                <Crown className="h-6 w-6 text-accent" />
              </motion.div>
              <p className="text-[10px] font-medium text-accent truncate">
                {censorName(LEADERBOARD[0].name, LEADERBOARD[0].lastInit)}
              </p>
              <p className="text-lg font-bold text-gold-gradient">
                {LEADERBOARD[0].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center pt-8">
            <div className="glass-card-subtle rounded-xl p-3 w-full text-center space-y-1.5 border border-[hsl(25_60%_45%/0.2)]">
              <div className="mx-auto h-10 w-10 rounded-full bg-[hsl(25_60%_45%/0.08)] border border-[hsl(25_60%_45%/0.3)] flex items-center justify-center">
                <span className="text-lg font-bold text-[hsl(25_60%_45%)]">3</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground truncate">
                {censorName(LEADERBOARD[2].name, LEADERBOARD[2].lastInit)}
              </p>
              <p className="text-sm font-bold text-foreground">
                {LEADERBOARD[2].revenue.toLocaleString("de-DE")}€
              </p>
            </div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-4" />

        {/* Full list */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-1.5"
        >
          {LEADERBOARD.slice(3).map((entry) => (
            <motion.div
              key={entry.rank}
              variants={staggerItem}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${getRankBg(entry.rank)}`}
            >
              <span className="text-xs font-bold text-muted-foreground w-7 text-right shrink-0">
                #{entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {censorName(entry.name, entry.lastInit)}
                </p>
              </div>
              <span className="text-xs font-bold text-foreground shrink-0">
                {entry.revenue.toLocaleString("de-DE")}€
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
