import { motion } from "framer-motion";
import { Film, Image as ImageIcon, Video, Send, ArrowUpRight } from "lucide-react";

export type TelegramContentChannelsProps = {
  reelsUrl?: string | null;
  backgroundsUrl?: string | null;
  feedUrl?: string | null;
  title?: string;
  subtitle?: string;
};

const CHANNELS = [
  {
    key: "reels" as const,
    label: "Reels",
    desc: "Inspiration & Hooks für virale Reels",
    icon: Film,
  },
  {
    key: "backgrounds" as const,
    label: "Background-Videos",
    desc: "B-Roll & Background-Footage",
    icon: Video,
  },
  {
    key: "feed" as const,
    label: "Feed / Story",
    desc: "Bilder für Feed & Stories",
    icon: ImageIcon,
  },
];

export default function TelegramContentChannels({
  reelsUrl,
  backgroundsUrl,
  feedUrl,
  title = "Content-Kanäle",
  subtitle = "Direkt zu den Telegram-Kanälen mit dem aktuellen Content",
}: TelegramContentChannelsProps) {
  const urls: Record<string, string | null | undefined> = {
    reels: reelsUrl,
    backgrounds: backgroundsUrl,
    feed: feedUrl,
  };
  const visible = CHANNELS.filter((c) => (urls[c.key] || "").trim().length > 0);
  if (visible.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Send className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground/80 mb-3">{subtitle}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((c, idx) => {
          const Icon = c.icon;
          const href = (urls[c.key] || "").trim();
          return (
            <motion.a
              key={c.key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-4 backdrop-blur-sm hover:border-accent/60 hover:shadow-[0_0_30px_hsl(var(--accent)/0.25)] transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
              <div
                aria-hidden="true"
                className="absolute -inset-x-12 -top-12 h-24 rotate-12 bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="relative flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-accent/15 border border-accent/30 p-2.5">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-foreground truncate">{c.label}</h3>
                    <ArrowUpRight className="h-3.5 w-3.5 text-accent/70 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                  <p className="text-[10px] uppercase tracking-wider text-accent/80 font-semibold mt-2 inline-flex items-center gap-1">
                    <Send className="h-2.5 w-2.5" /> Telegram öffnen
                  </p>
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
