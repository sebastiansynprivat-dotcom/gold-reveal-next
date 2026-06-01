import { useEffect, useMemo, useState } from "react";
import { Bell, Trash2, Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

type Category = "POST" | "DM" | "CHATTER" | "LOGIN";
type Platform = "4BASED" | "MALOUM" | "BREZZELS" | "FANSYME";

export interface BotNotification {
  id: string;
  date: string;
  platform: Platform;
  category: Category;
  message: string;
}

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

// Extract model username from message
function extractModel(msg: string): { name: string | null; rest: string } {
  // [username]
  const bracket = msg.match(/\[([^\]]+)\]/);
  if (bracket) {
    return { name: bracket[1], rest: msg.replace(bracket[0], "").trim() };
  }
  // "Error logging in: username"
  const colonEnd = msg.match(/:\s*([a-zA-Z0-9._-]+)\s*$/);
  if (colonEnd && !/^\d+$/.test(colonEnd[1])) {
    return { name: colonEnd[1], rest: msg.slice(0, msg.lastIndexOf(":")).trim() };
  }
  return { name: null, rest: msg };
}

export default function SetupNotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BotNotification[]>(MOCK);
  const [active, setActive] = useState<Category>("POST");
  const [search, setSearch] = useState("");
  const [modelMap, setModelMap] = useState<Record<string, string>>({});

  // Load username → model_id map for clickable model links
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("account_email, model_id")
        .not("model_id", "is", null);
      const map: Record<string, string> = {};
      (data || []).forEach((a: any) => {
        if (a.account_email && a.model_id) {
          map[a.account_email.toLowerCase()] = a.model_id;
        }
      });
      setModelMap(map);
    })();
  }, [open]);

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

  const openModel = (username: string) => {
    const id = modelMap[username.toLowerCase()];
    if (!id) return;
    setOpen(false);
    navigate(`/admin/model/${id}/view`);
  };

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
        <DialogContent className="max-w-2xl glass-card border-accent/20 p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <Bell className="h-3.5 w-3.5 text-accent" />
              Bot Benachrichtigungen
              <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1.5">
                {totalCount}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <div className="relative flex-1 input-gold-shimmer rounded-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen…"
                className="pl-7 text-[11px] h-7 border-transparent"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearAll}
              disabled={filtered.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          {/* Tabs */}
          <div className="px-3 border-b border-border/40">
            <div className="flex gap-0 relative">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={cn(
                    "relative px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    active === c ? "text-accent" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative z-10 flex items-center gap-1">
                    {c}
                    {counts[c] > 0 && (
                      <span className="min-w-[14px] h-[14px] px-1 rounded-full bg-destructive/80 text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
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
          <div className="max-h-[55vh] overflow-y-auto py-1.5 px-2 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-muted-foreground">
                Keine Benachrichtigungen
              </div>
            ) : (
              filtered.map((n) => {
                const { name: modelName, rest } = extractModel(n.message);
                const hasModelLink = modelName && modelMap[modelName.toLowerCase()];
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/5 border border-transparent hover:border-accent/15 transition-colors group"
                  >
                    <span className="text-[9px] text-muted-foreground/70 font-mono w-[60px] shrink-0 tabular-nums">
                      {n.date.slice(5)}
                    </span>
                    <span className="text-[9px] font-bold text-accent/90 w-[56px] shrink-0 uppercase tracking-wider">
                      {n.platform}
                    </span>
                    {modelName ? (
                      hasModelLink ? (
                        <button
                          onClick={() => openModel(modelName)}
                          className="text-[10px] font-semibold text-foreground hover:text-accent transition-colors w-[100px] shrink-0 truncate flex items-center gap-0.5 group/link"
                          title={`Zu ${modelName}`}
                        >
                          <span className="truncate">{modelName}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-foreground/80 w-[100px] shrink-0 truncate">
                          {modelName}
                        </span>
                      )
                    ) : (
                      <span className="w-[100px] shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground flex-1 truncate">
                      {rest || n.message}
                    </span>
                    <button
                      onClick={() => removeOne(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive shrink-0"
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
