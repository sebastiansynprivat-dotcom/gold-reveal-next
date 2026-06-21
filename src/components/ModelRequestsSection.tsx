import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Link2,
  XCircle,
  Layers,
  History,
  ChevronDown,
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
  content_link: string | null;
  admin_comment: string | null;
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
    statusRejected: "Abgelehnt",
    done: "Erledigt & speichern",
    reject: "Ablehnen",
    askBack: "Rückfrage stellen",
    askPlaceholder: "Schreib uns eine kurze Rückfrage – wir geben sie an den Chatter weiter, sobald wir sie freigegeben haben.",
    rejectPlaceholder: "Kurzer Grund für die Ablehnung (optional) – z. B. nicht möglich, nicht im Profil, etc.",
    linkLabel: "Content-Link (optional)",
    linkPlaceholder: "https://… z. B. Drive, Dropbox, WeTransfer",
    commentLabel: "Kommentar an das Team (optional)",
    commentPlaceholder: "Z. B. „Content ist hochgeladen, viel Spaß!“",
    send: "Absenden",
    sending: "Senden…",
    askInfo: "Deine Antwort wird vom Team geprüft und dann an den Chatter weitergeleitet.",
    receivedAt: "Reingekommen",
    completedAt: "Erledigt am",
    customer: "Kunde",
    price: "Preis",
    platform: "Plattform",
    contentLink: "Content-Link",
    open: "Öffnen",
    confirmReject: "Anfrage wirklich ablehnen?",
    save: "Speichern",
    cancel: "Abbrechen",
  },
  en: {
    title: "Custom requests",
    none: "No open requests right now. New ones from the team will show up here.",
    statusOpen: "New",
    statusInProgress: "In progress",
    statusDone: "Done",
    statusRejected: "Rejected",
    done: "Mark done & save",
    reject: "Reject",
    askBack: "Ask the team",
    askPlaceholder: "Send the team a short question — we'll forward it to the chatter once approved.",
    rejectPlaceholder: "Short reason for rejection (optional) — e.g. not possible, not on profile…",
    linkLabel: "Content link (optional)",
    linkPlaceholder: "https://… e.g. Drive, Dropbox, WeTransfer",
    commentLabel: "Comment to the team (optional)",
    commentPlaceholder: "E.g. \"Content uploaded, enjoy!\"",
    send: "Send",
    sending: "Sending…",
    askInfo: "Your reply is reviewed by the team and then forwarded to the chatter.",
    receivedAt: "Received",
    completedAt: "Completed",
    customer: "Customer",
    price: "Price",
    platform: "Platform",
    contentLink: "Content link",
    open: "Open",
    confirmReject: "Really reject this request?",
    save: "Save",
    cancel: "Cancel",
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

const PLATFORM_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  brezzels:  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", border: "border-fuchsia-500/40", dot: "bg-fuchsia-400" },
  maloum:    { bg: "bg-violet-500/15",  text: "text-violet-300",  border: "border-violet-500/40",  dot: "bg-violet-400"  },
  fansly:    { bg: "bg-sky-500/15",     text: "text-sky-300",     border: "border-sky-500/40",     dot: "bg-sky-400"     },
  onlyfans:  { bg: "bg-cyan-500/15",    text: "text-cyan-300",    border: "border-cyan-500/40",    dot: "bg-cyan-400"    },
  fanvue:    { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40", dot: "bg-emerald-400" },
  fansyme:   { bg: "bg-pink-500/15",    text: "text-pink-300",    border: "border-pink-500/40",    dot: "bg-pink-400"    },
};

function parsePlatform(description: string): { platform: string | null; cleaned: string } {
  const m = description.match(/^\s*\[\s*Pl?attform\s*[:\-]\s*([^\]]+?)\s*\]\s*/i);
  if (!m) return { platform: null, cleaned: description };
  return { platform: m[1].trim(), cleaned: description.slice(m[0].length) };
}

function platformStyle(name: string) {
  const k = name.toLowerCase().replace(/\s+/g, "");
  return PLATFORM_STYLES[k] || {
    bg: "bg-accent/15", text: "text-accent", border: "border-accent/40", dot: "bg-accent",
  };
}

export default function ModelRequestsSection({ modelId, language = "de" }: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [askingId, setAskingId] = useState<string | null>(null);
  const [askText, setAskText] = useState("");
  const [doneId, setDoneId] = useState<string | null>(null);
  const [doneLink, setDoneLink] = useState("");
  const [doneComment, setDoneComment] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [burst, setBurst] = useState<BurstKey | null>(null);
  const lastBurstRef = useRef<{ key: BurstKey; ts: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("model_requests")
      .select(
        "id, description, price, customer_name, request_type, attachments, created_at, forwarded_to_model_at, model_status, model_completed_at, content_link, admin_comment"
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

  const isClosed = (r: ModelRequest) => r.model_status === "done" || r.model_status === "rejected";
  const open = requests.filter((r) => !isClosed(r));
  const closed = requests.filter(isClosed);

  const triggerBurst = (key: BurstKey) => {
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
        .filter((r) => r.model_completed_at && r.model_status === "done")
        .map((r) => new Date(r.model_completed_at as string)),
    ].sort((a, b) => b.getTime() - a.getTime());

    const last30 = completed.filter((d) => Date.now() - d.getTime() < 30 * 60 * 1000);
    if (last30.length >= 3) { triggerBurst("streak3"); return; }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = completed.filter((d) => d >= startOfDay);
    if (today.length >= 5) { triggerBurst("today5"); return; }
    const recentReq = requests[0];
    if (recentReq?.forwarded_to_model_at) {
      const diff = justCompletedAt.getTime() - new Date(recentReq.forwarded_to_model_at).getTime();
      if (diff > 0 && diff < 30 * 60 * 1000) { triggerBurst("fast"); return; }
    }
    triggerBurst("money");
  };

  const startDone = (req: ModelRequest) => {
    setDoneId(req.id);
    setDoneLink(req.content_link || "");
    setDoneComment("");
    setAskingId(null);
    setRejectingId(null);
  };

  const submitDone = async (req: ModelRequest) => {
    const link = doneLink.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      toast.error(lang === "en" ? "Link must start with http(s)://" : "Link muss mit http(s):// beginnen");
      return;
    }
    setBusyId(req.id);
    const now = new Date();
    const { error } = await supabase
      .from("model_requests")
      .update({
        model_status: "done",
        model_completed_at: now.toISOString(),
        content_link: link || null,
      })
      .eq("id", req.id);
    if (!error && doneComment.trim()) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("model_request_messages").insert({
          request_id: req.id,
          user_id: u.user.id,
          sender_role: "model",
          body: doneComment.trim(),
          visible_to_chatter: false,
        });
      }
    }
    setBusyId(null);
    if (error) {
      toast.error(lang === "en" ? "Could not save" : "Speichern fehlgeschlagen");
      return;
    }
    toast.success(lang === "en" ? "Request marked done ✓" : "Anfrage als erledigt markiert ✓");
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, model_status: "done", model_completed_at: now.toISOString(), content_link: link || null }
          : r
      )
    );
    setDoneId(null);
    setDoneLink("");
    setDoneComment("");
    evaluateSpeed(now);
  };

  const submitReject = async (req: ModelRequest) => {
    setBusyId(req.id);
    const reason = rejectText.trim();
    const now = new Date();
    const { error } = await supabase
      .from("model_requests")
      .update({ model_status: "rejected", model_completed_at: now.toISOString() })
      .eq("id", req.id);
    if (!error && reason) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("model_request_messages").insert({
          request_id: req.id,
          user_id: u.user.id,
          sender_role: "model",
          body: `[Ablehnung] ${reason}`,
          visible_to_chatter: false,
        });
      }
    }
    setBusyId(null);
    if (error) {
      toast.error(lang === "en" ? "Could not save" : "Speichern fehlgeschlagen");
      return;
    }
    toast.success(lang === "en" ? "Request rejected" : "Anfrage abgelehnt");
    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, model_status: "rejected", model_completed_at: now.toISOString() } : r
      )
    );
    setRejectingId(null);
    setRejectText("");
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

      {open.length === 0 && closed.length === 0 ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.none}</p>
      ) : (
        <div className="space-y-3">
          {[...open, ...closed.slice(0, 3)].map((req) => {
            const isDone = req.model_status === "done";
            const isRejected = req.model_status === "rejected";
            const closedReq = isDone || isRejected;
            const isAsking = askingId === req.id;
            const isDoneForm = doneId === req.id;
            const isRejectForm = rejectingId === req.id;
            const { platform, cleaned } = parsePlatform(req.description);
            const ps = platform ? platformStyle(platform) : null;
            const statusLabel = isDone
              ? copy.statusDone
              : isRejected
                ? copy.statusRejected
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
                    : isRejected
                      ? "border-rose-500/25 opacity-80"
                      : req.model_status === "in_progress"
                        ? "border-amber-500/30"
                        : "border-accent/30"
                )}
              >
                {/* Header row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {platform && ps && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
                        ps.bg, ps.text, ps.border
                      )}
                    >
                      <Layers className="h-3 w-3" />
                      {platform}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      isDone
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isRejected
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
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

                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {cleaned}
                </p>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
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

                {isDone && req.content_link && (
                  <a
                    href={req.content_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 underline underline-offset-2 break-all"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    {copy.contentLink}: {req.content_link}
                  </a>
                )}

                {!closedReq && (
                  <>
                    {isAsking ? (
                      <div className="space-y-2">
                        <Textarea
                          value={askText}
                          onChange={(e) => setAskText(e.target.value)}
                          placeholder={copy.askPlaceholder}
                          className="bg-background/40 border-border/40 text-sm min-h-[80px]"
                        />
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">{copy.askInfo}</p>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setAskingId(null); setAskText(""); }}>
                            {copy.cancel}
                          </Button>
                          <Button size="sm" disabled={!askText.trim() || busyId === req.id} onClick={() => sendAsk(req)} className="gap-1.5">
                            {busyId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            {busyId === req.id ? copy.sending : copy.send}
                          </Button>
                        </div>
                      </div>
                    ) : isDoneForm ? (
                      <div className="space-y-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                        <label className="text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                          <Link2 className="h-3 w-3" /> {copy.linkLabel}
                        </label>
                        <Input
                          value={doneLink}
                          onChange={(e) => setDoneLink(e.target.value)}
                          placeholder={copy.linkPlaceholder}
                          className="bg-background/40 border-border/40 text-sm h-9"
                          inputMode="url"
                        />
                        <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pt-1">
                          <MessageCircle className="h-3 w-3" /> {copy.commentLabel}
                        </label>
                        <Textarea
                          value={doneComment}
                          onChange={(e) => setDoneComment(e.target.value)}
                          placeholder={copy.commentPlaceholder}
                          className="bg-background/40 border-border/40 text-sm min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                          <Button size="sm" variant="ghost" onClick={() => { setDoneId(null); setDoneLink(""); setDoneComment(""); }}>
                            {copy.cancel}
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyId === req.id}
                            onClick={() => submitDone(req)}
                            className="gap-1.5 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/40"
                          >
                            {busyId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            {copy.save}
                          </Button>
                        </div>
                      </div>
                    ) : isRejectForm ? (
                      <div className="space-y-2 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3">
                        <p className="text-[11px] font-medium text-rose-300">{copy.confirmReject}</p>
                        <Textarea
                          value={rejectText}
                          onChange={(e) => setRejectText(e.target.value)}
                          placeholder={copy.rejectPlaceholder}
                          className="bg-background/40 border-border/40 text-sm min-h-[60px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectText(""); }}>
                            {copy.cancel}
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyId === req.id}
                            onClick={() => submitReject(req)}
                            className="gap-1.5 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/40"
                          >
                            {busyId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            {copy.reject}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => startDone(req)}
                          disabled={busyId === req.id}
                          className="gap-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {copy.done}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAskingId(req.id); setAskText(""); setDoneId(null); setRejectingId(null); }}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {copy.askBack}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRejectingId(req.id); setRejectText(""); setDoneId(null); setAskingId(null); }}
                          className="gap-1.5 text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 ml-auto"
                        >
                          <XCircle className="h-3 w-3" />
                          {copy.reject}
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
                  background: "linear-gradient(120deg, hsl(43 70% 18% / 0.95), hsl(340 50% 20% / 0.85))",
                  boxShadow: "0 0 40px hsl(43 80% 50% / 0.35), 0 0 20px hsl(340 70% 60% / 0.25), inset 0 0 0 1px hsl(43 70% 60% / 0.4)",
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
                  <p className="text-sm font-bold text-foreground leading-tight">{burstData.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{burstData.body}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
