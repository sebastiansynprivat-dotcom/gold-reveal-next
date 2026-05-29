import { useMemo, useState } from "react";
import { Bell, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Category = "POST" | "DM" | "CHATTER" | "LOGIN";
type Platform = "4BASED" | "MALOUM" | "BREZZELS" | "FANSYME";

export interface BotNotification {
  id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  category: Category;
  message: string;
}

// Mock data — wird später ans Backend angebunden
const MOCK: BotNotification[] = [
  { id: "1", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Failed to create database [alice_mo]" },
  { id: "2", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Media not found [alice_mo]" },
  { id: "3", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Failed to create database [sweetpoli]" },
  { id: "4", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Media not found [sweetpoli]" },
  { id: "5", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Failed to create database [marisexy]" },
  { id: "6", date: "2026-05-28", platform: "4BASED", category: "POST", message: "Media not found [marisexy]" },
  { id: "7", date: "2026-05-27", platform: "4BASED", category: "DM", message: "Login Failed [lindacute]" },
  { id: "8", date: "2026-05-27", platform: "4BASED", category: "DM", message: "No DMs Sent [hotasslaura]" },
  { id: "9", date: "2026-05-27", platform: "4BASED", category: "DM", message: "Login Failed [angelinaskirschen]" },
  { id: "10", date: "2026-05-27", platform: "4BASED", category: "DM", message: "No DMs Sent [valeryy]" },
  { id: "11", date: "2026-05-27", platform: "4BASED", category: "DM", message: "No DMs Sent [jiillx]" },
  { id: "12", date: "2026-05-29", platform: "MALOUM", category: "CHATTER", message: "8206918020: ETELEGRAM: 403 Forbidden: bot was blocked by the user" },
  { id: "13", date: "2026-05-29", platform: "BREZZELS", category: "CHATTER", message: "68951069: ETELEGRAM: 400 Bad Request: chat not found" },
  { id: "14", date: "2026-05-29", platform: "BREZZELS", category: "CHATTER", message: "6770584903: ETELEGRAM: 403 Forbidden: bot was blocked by the user" },
  { id: "15", date: "2026-05-29", platform: "MALOUM", category: "CHATTER", message: "8502109312: ETELEGRAM: 400 Bad Request: chat not found" },
  { id: "16", date: "2026-05-29", platform: "MALOUM", category: "CHATTER", message: "7750580003: ETELEGRAM: 400 Bad Request: chat not found" },
  { id: "17", date: "2026-05-29", platform: "BREZZELS", category: "LOGIN", message: "Error logging in: linaluxe" },
  { id: "18", date: "2026-05-29", platform: "BREZZELS", category: "LOGIN", message: "Error logging in: holyjones" },
  { id: "19", date: "2026-05-29", platform: "BREZZELS", category: "LOGIN", message: "Error logging in: barbiesophia" },
  { id: "20", date: "2026-05-29", platform: "4BASED", category: "LOGIN", message: "Error logging in: sophiexo" },
  { id: "21", date: "2026-05-29", platform: "BREZZELS", category: "LOGIN", message: "Error logging in: kira-liv" },
];

const CATEGORIES: Category[] = ["POST", "DM", "CHATTER", "LOGIN"];

export default function SetupNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BotNotification[]>(MOCK);
  const [active, setActive] = useState<Category>("POST");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<Category, number> = { POST: 0, DM: 0, CHATTER: 0, LOGIN: 0 };
    items.forEach((n) => (c[n.category] += 1));
    return c;
  }, [items]);

  const totalCount = items.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((n) => n.category === active)
      .filter(
        (n) =>
          !q ||
          n.message.toLowerCase().includes(q) ||
          n.platform.toLowerCase().includes(q) ||
          n.date.includes(q),
      );
  }, [items, active, search]);

  const removeOne = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));
  const clearAll = () => setItems((prev) => prev.filter((n) => n.category !== active));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative h-8 w-8 rounded-lg flex items-center justify-center bg-secondary/40 hover:bg-accent/15 border border-border hover:border-accent/40 transition-colors group"
        aria-label="Bot Benachrichtigungen"
      >
        <Bell className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
        {totalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-md">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl glass-card border-accent/20 p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-accent" />
              Bot Benachrichtigungen
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {totalCount}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 border-b border-border/50 flex items-center gap-2">
            <div className="relative flex-1 input-gold-shimmer rounded-lg">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search / Filter…"
                className="pl-8 text-xs h-8 border-transparent"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={clearAll}
              disabled={filtered.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-2 border-b border-border/50">
            <div className="flex gap-1 relative">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={cn(
                    "relative px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    active === c ? "text-accent" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {c}
                    {counts[c] > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                        {counts[c]}
                      </span>
                    )}
                  </span>
                  {active === c && (
                    <motion.div
                      layoutId="activeNotifTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[55vh] overflow-y-auto p-3 space-y-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                Keine Benachrichtigungen
              </div>
            ) : (
              filtered.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/15 hover:border-accent/30 hover:bg-accent/10 transition-colors group"
                >
                  <span className="text-[11px] text-muted-foreground font-mono w-20 shrink-0">
                    {n.date}
                  </span>
                  <span className="text-[10px] font-bold text-accent w-20 shrink-0 uppercase tracking-wider">
                    {n.platform}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground/70 w-16 shrink-0 uppercase">
                    {n.category}
                  </span>
                  <span className="text-xs text-foreground flex-1 truncate">{n.message}</span>
                  <button
                    onClick={() => removeOne(n.id)}
                    className="opacity-60 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 shrink-0"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
