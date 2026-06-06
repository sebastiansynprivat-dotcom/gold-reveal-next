import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Trash2, Search, ExternalLink, ArrowDown, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BotNotification {
  id: string;
  date: string;
  platform: string;
  type: string;
  account_email: string | null;
  message: string;
  created_at: string;
}

const TYPE_ORDER = ["POST", "DM", "CHATTER", "LOGIN"];

export default function SetupNotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BotNotification[]>([]);
  const [active, setActive] = useState<string>("POST");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [modelMap, setModelMap] = useState<Record<string, string>>({});

  // Fetch + realtime
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("bot_notifications")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (mounted) setItems((data || []) as BotNotification[]);
    };
    load();

    const ch = supabase
      .channel("bot_notifications_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_notifications" },
        (payload: any) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as BotNotification, ...prev];
            if (payload.eventType === "DELETE")
              return prev.filter((n) => n.id !== (payload.old as any).id);
            if (payload.eventType === "UPDATE")
              return prev.map((n) => (n.id === payload.new.id ? (payload.new as BotNotification) : n));
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // Load account_email → model_id for clickable links
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("account_email, model_id")
        .not("model_id", "is", null);
      const map: Record<string, string> = {};
      (data || []).forEach((a: any) => {
        if (a.account_email && a.model_id) map[a.account_email.toLowerCase()] = a.model_id;
      });
      setModelMap(map);
    })();
  }, [open]);

  // Categories present in data, in preferred order
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.type));
    const ordered = [
      ...TYPE_ORDER.filter((t) => set.has(t)),
      ...[...set].filter((t) => !TYPE_ORDER.includes(t)).sort(),
    ];
    return ordered.length ? ordered : TYPE_ORDER;
  }, [items]);

  // Keep active tab valid
  useEffect(() => {
    if (categories.length && !categories.includes(active)) setActive(categories[0]);
  }, [categories, active]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((n) => (c[n.type] = (c[n.type] || 0) + 1));
    return c;
  }, [items]);

  const totalCount = items.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items
      .filter((n) => n.type === active)
      .filter(
        (n) =>
          !q ||
          n.message.toLowerCase().includes(q) ||
          n.platform.toLowerCase().includes(q) ||
          (n.account_email || "").toLowerCase().includes(q) ||
          n.date.includes(q),
      );
    return list.sort((a, b) => {
      if (a.date === b.date) return b.created_at.localeCompare(a.created_at);
      return sortDir === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });
  }, [items, active, search, sortDir]);

  const removeOne = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((n) => n.id !== id));
    const { error } = await supabase.from("bot_notifications").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.error("Konnte nicht entfernen");
    }
  };

  const clearActive = async () => {
    if (!filtered.length) return;
    const ids = items.filter((n) => n.type === active).map((n) => n.id);
    const prev = items;
    setItems((p) => p.filter((n) => n.type !== active));
    const { error } = await supabase.from("bot_notifications").delete().in("id", ids);
    if (error) {
      setItems(prev);
      toast.error("Konnte Tab nicht leeren");
    } else {
      toast.success(`${ids.length} entfernt`);
    }
  };

  const openModel = (email: string) => {
    const id = modelMap[email.toLowerCase()];
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
          <span
            className={cn(
              "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center shadow-md",
              totalCount >= 10
                ? "bg-destructive text-destructive-foreground"
                : "bg-accent/20 text-accent ring-1 ring-accent/50",
            )}
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl glass-card border-accent/20 p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <Bell className="h-3.5 w-3.5 text-accent" />
              Bot Notifications
              <Badge
                variant="outline"
                className="ml-1.5 text-[9px] h-4 px-1.5 border-accent/40 text-accent bg-accent/10"
              >
                {totalCount}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Search + Clear */}
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <div className="relative flex-1 input-gold-shimmer rounded-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche Nachricht, Account, Plattform oder Datum…"
                className="pl-7 text-[11px] h-7 border-transparent"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={clearActive}
              disabled={filtered.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear ({filtered.length})
            </Button>
          </div>

          {/* Tabs */}
          <div className="px-3 border-b border-border/40">
            <div className="flex gap-0 relative overflow-x-auto no-scrollbar">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={cn(
                    "relative px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap",
                    active === c ? "text-accent" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative z-10 flex items-center gap-1">
                    {c}
                    {(counts[c] || 0) > 0 && (
                      <span className="min-w-[14px] h-[14px] px-1 rounded-full bg-accent/15 text-accent text-[8px] font-bold flex items-center justify-center">
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

          {/* Column header */}
          <div className="px-3 pt-2 pb-1 grid grid-cols-[64px_56px_100px_1fr_24px] gap-2 items-center text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              Date
              {sortDir === "desc" ? (
                <ArrowDown className="h-2.5 w-2.5" />
              ) : (
                <ArrowUp className="h-2.5 w-2.5" />
              )}
            </button>
            <span>Plat.</span>
            <span>Account</span>
            <span>Message</span>
            <span />
          </div>

          {/* List */}
          <div className="max-h-[55vh] overflow-y-auto py-1 px-2 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <BellOff className="h-6 w-6 opacity-40" />
                <span className="text-[11px]">Alle Benachrichtigungen erledigt</span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((n) => {
                  const email = n.account_email || "";
                  const hasLink = !!modelMap[email.toLowerCase()];
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8, transition: { duration: 0.18 } }}
                      className="grid grid-cols-[64px_56px_100px_1fr_24px] gap-2 items-center px-2 py-1.5 rounded-md hover:bg-accent/5 border border-transparent hover:border-accent/15 transition-colors group"
                    >
                      <span className="text-[9px] text-muted-foreground/80 font-mono tabular-nums">
                        {n.date.slice(5)}
                      </span>
                      <span className="text-[9px] font-bold text-accent/90 uppercase tracking-wider truncate">
                        {n.platform}
                      </span>
                      {email ? (
                        hasLink ? (
                          <button
                            onClick={() => openModel(email)}
                            className="text-[10px] font-semibold text-foreground hover:text-accent transition-colors truncate flex items-center gap-0.5 group/link text-left"
                            title={`Zu ${email}`}
                          >
                            <span className="truncate">{email}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-foreground/80 truncate">
                            {email}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                      <span className="text-[10px] text-muted-foreground truncate" title={n.message}>
                        {n.message}
                      </span>
                      <button
                        onClick={() => removeOne(n.id)}
                        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Entfernen"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
