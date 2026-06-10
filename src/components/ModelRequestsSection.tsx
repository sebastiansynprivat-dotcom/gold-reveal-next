import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Inbox,
  CheckCircle2,
  MessageCircle,
  Send,
  Loader2,
  Clock,
  Sparkles,
  Flame,
  Zap,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ModelRequest {
  id: string;
  description: string;
  price: number | null;
  customer_name: string | null;
  request_type: string;
  attachments: any;
  created_at: string;
  forwarded_to_model_at: string | null;
  model_status: string | null;
  model_completed_at: string | null;
}

interface Props {
  modelId: string;
  language?: "de" | "en";
}

const COPY = {
  de: {
    title: "Custom-Anfragen",
    none: "Aktuell keine offenen Anfragen vom Team. Sobald eine reinkommt, siehst du sie hier.",
    statusOpen: "Neu",
    statusInProgress: "In Bearbeitung",
    statusDone: "Erledigt",
    done: "Erledigt & speichern",
    askBack: "Rückfrage stellen",
    askPlaceholder: "Schreib uns eine kurze Rückfrage – wir geben sie an den Chatter weiter, sobald wir sie freigegeben haben.",
    send: "Absenden",
    sending: "Senden…",
    askInfo: "Deine Antwort wird vom Team geprüft und dann an den Chatter weitergeleitet.",
    receivedAt: "Reingekommen",
    completedAt: "Erledigt am",
    customer: "Kunde",
    price: "Preis",
  },
  en: {
    title: "Custom requests",
    none: "No open requests right now. New ones from the team will show up here.",
    statusOpen: "New",
    statusInProgress: "In progress",
    statusDone: "Done",
    done: "Mark done & save",
    askBack: "Ask the team",
    askPlaceholder: "Send the team a short question — we'll forward it to the chatter once approved.",
    send: "Send",
    sending: "Sending…",
    askInfo: "Your reply is reviewed by the team and then forwarded to the chatter.",
    receivedAt: "Received",
    completedAt: "Completed",
    customer: "Customer",
    price: "Price",
  },
} as const;

const SPEED_MESSAGES = {
  de: {
    streak3: { icon: Flame, title: "🔥 3 Anfragen in Folge!", body: "Du bist im Flow – weiter so!" },
    today5: { icon: Zap, title: "⚡ Starke Performance heute", body: "5+ Anfragen erledigt – das spürt der Umsatz." },
    fast: { icon: Rocket, title: "🚀 Schnelle Bearbeitung", body: "Schneller arbeiten = mehr Umsatz im Monat." },
    money: { icon: TrendingUp, title: "💰 Top-Tempo!", body: "Jede schnelle Anfrage bringt dich näher an den nächsten Bonus." },
  },
  en: {
    streak3: { icon: Flame, title: "🔥 3 requests in a row!", body: "You're in the flow — keep going!" },
    today5: { icon: Zap, title: "⚡ Strong day", body: "5+ requests done — revenue is feeling it." },
    fast: { icon: Rocket, title: "🚀 Fast turnaround", body: "Faster work = more monthly revenue." },
    money: { icon: TrendingUp, title: "💰 Peak tempo!", body: "Every fast request gets you closer to the next bonus." },
  },
} as const;

type BurstKey = keyof typeof SPEED_MESSAGES.de;

export default function ModelRequestsSection({ modelId, language = "de" }: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [askingId, setAskingId] = useState<string | null>(null);
  const [askText, setAskText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [burst, setBurst] = useState<BurstKey | null>(null);
  const lastBurstRef = useRef<{ key: BurstKey; ts: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("model_requests")
      .select(
        "id, description, price, customer_name, request_type, attachments, created_at, forwarded_to_model_at, model_status, model_completed_at"
      )
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })
      .limit(50);
    setRequests((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`model_requests_${modelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_requests", filter: `model_id=eq.${modelId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const open = requests.filter((r) => r.model_status !== "done");
  const done = requests.filter((r) => r.model_status === "done");

  const triggerBurst = (key: BurstKey) => {
    // Avoid spamming the same burst within 30 min
    const prev = lastBurstRef.current;
    if (prev && prev.key === key && Date.now() - prev.ts < 30 * 60 * 1000) return;
    lastBurstRef.current = { key, ts: Date.now() };
    setBurst(key);
    setTimeout(() => setBurst((k) => (k === key ? null : k)), 4200);
  };

  const evaluateSpeed = (justCompletedAt: Date) => {
    const completed = [
      justCompletedAt,
      ...requests
        .filter((r) => r.model_completed_at)
        .map((r) => new Date(r.model_completed_at as string)),
    ].sort((a, b) => b.getTime() - a.getTime());

    // 3 in last 30 min
    const last30 = completed.filter((d) => Date.now() - d.getTime() < 30 * 60 * 1000);
    if (last30.length >= 3) {
      triggerBurst("streak3");
      return;
    }
    // 5+ today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = completed.filter((d) => d >= startOfDay);
    if (today.length >= 5) {
      triggerBurst("today5");
      return;
    }
    // Fast turnaround: completed within 30 min of forwarded
    const recentReq = requests[0];
    if (recentReq?.forwarded_to_model_at) {
      const diff = justCompletedAt.getTime() - new Date(recentReq.forwarded_to_model_at).getTime();
      if (diff > 0 && diff < 30 * 60 * 1000) {
        triggerBurst("fast");
        return;
      }
    }
    // Default money burst once per session
    triggerBurst("money");
  };

  const completeRequest = async (req: ModelRequest) => {
    setBusyId(req.id);
    const now = new Date();
    const { error } = await supabase
      .from("model_requests")
      .update({ model_status: "done", model_completed_at: now.toISOString() })
      .eq("id", req.id);
    setBusyId(null);
    if (error) {
      toast.error(lang === "en" ? "Could not save" : "Speichern fehlgeschlagen");
      return;
    }
    toast.success(lang === "en" ? "Request marked done ✓" : "Anfrage als erledigt markiert ✓");
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, model_status: "done", model_completed_at: now.toISOString() } : r
      )
    );
    evaluateSpeed(now);
  };

  const sendAsk = async (req: ModelRequest) => {
    const body = askText.trim();
    if (!body) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusyId(req.id);
    const { error } = await supabase.from("model_request_messages").insert({
      request_id: req.id,
      user_id: u.user.id,
      sender_role: "model",
      body,
      visible_to_chatter: false,
    });
    if (!error) {
      // also mark in_progress on first message
      if (req.model_status === "open" || !req.model_status) {
        await supabase
          .from("model_requests")
          .update({ model_status: "in_progress" })
          .eq("id", req.id);
        setRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, model_status: "in_progress" } : r))
        );
      }
    }
    setBusyId(null);
    if (error) {
      toast.error(lang === "en" ? "Could not send" : "Senden fehlgeschlagen");
      return;
    }
    toast.success(lang === "en" ? "Sent to the team ✓" : "Ans Team gesendet ✓");
    setAskText("");
    setAskingId(null);
  };

  const burstData = burst ? SPEED_MESSAGES[lang][burst] : null;
  const BurstIcon = burstData?.icon;

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString(lang === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading && requests.length === 0) {
    return (
      <section className="glass-card rounded-2xl p-5 card-inner-glow">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">{copy.title}</h2>
        </div>
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> …
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-2xl p-5 card-inner-glow space-y-4 relative">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">{copy.title}</h2>
        {open.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 tabular-nums">
            {open.length} {lang === "en" ? "open" : "offen"}
          </span>
        )}
      </div>

      {open.length === 0 && done.length === 0 ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.none}</p>
      ) : (
        <div className="space-y-3">
          {[...open, ...done.slice(0, 3)].map((req) => {
            const isDone = req.model_status === "done";
            const isAsking = askingId === req.id;
            const statusLabel = isDone
              ? copy.statusDone
              : req.model_status === "in_progress"
                ? copy.statusInProgress
                : copy.statusOpen;
            return (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass-card-subtle rounded-xl p-4 space-y-3 border",
                  isDone
                    ? "border-emerald-500/25"
                    : req.model_status === "in_progress"
                      ? "border-amber-500/30"
                      : "border-accent/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          isDone
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : req.model_status === "in_progress"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-accent/15 text-accent border-accent/40"
                        )}
                      >
                        {statusLabel}
                      </span>
                      {req.price != null && (
                        <span className="text-[10px] text-emerald-400 tabular-nums">
                          {copy.price}: {Number(req.price).toFixed(2)} €
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-wrap break-words">
                      {req.description}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {copy.receivedAt}: {fmtDate(req.forwarded_to_model_at || req.created_at)}
                      </span>
                      {req.customer_name && (
                        <span>{copy.customer}: {req.customer_name}</span>
                      )}
                      {isDone && req.model_completed_at && (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {copy.completedAt}: {fmtDate(req.model_completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isDone && (
                  <>
                    {isAsking ? (
                      <div className="space-y-2">
                        <Textarea
                          value={askText}
                          onChange={(e) => setAskText(e.target.value)}
                          placeholder={copy.askPlaceholder}
                          className="bg-background/40 border-border/40 text-sm min-h-[80px]"
                        />
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                          {copy.askInfo}
                        </p>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAskingId(null);
                              setAskText("");
                            }}
                          >
                            {lang === "en" ? "Cancel" : "Abbrechen"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!askText.trim() || busyId === req.id}
                            onClick={() => sendAsk(req)}
                            className="gap-1.5"
                          >
                            {busyId === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            {busyId === req.id ? copy.sending : copy.send}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => completeRequest(req)}
                          disabled={busyId === req.id}
                          className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                        >
                          {busyId === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {copy.done}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAskingId(req.id);
                            setAskText("");
                          }}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {copy.askBack}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Speed-Streak Burst overlay */}
      <AnimatePresence>
        {burst && burstData && BurstIcon && (
          <motion.div
            key={burst}
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] pointer-events-none"
          >
            <div className="relative">
              {/* Sparkle ring */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * 70;
                const y = Math.sin(angle) * 70;
                return (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{ x, y, opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
                    transition={{ duration: 1.4, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                  >
                    <Sparkles className="h-3 w-3 text-accent drop-shadow-[0_0_6px_hsl(43_56%_52%/0.8)]" />
                  </motion.div>
                );
              })}
              <div
                className="glass-card rounded-2xl px-5 py-3.5 flex items-center gap-3 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(120deg, hsl(43 70% 18% / 0.95), hsl(340 50% 20% / 0.85))",
                  boxShadow:
                    "0 0 40px hsl(43 80% 50% / 0.35), 0 0 20px hsl(340 70% 60% / 0.25), inset 0 0 0 1px hsl(43 70% 60% / 0.4)",
                }}
              >
                <motion.div
                  initial={{ rotate: -20, scale: 0.6 }}
                  animate={{ rotate: 0, scale: [0.6, 1.3, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <BurstIcon className="h-7 w-7 text-accent drop-shadow-[0_0_10px_hsl(43_80%_55%/0.9)]" />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {burstData.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {burstData.body}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
