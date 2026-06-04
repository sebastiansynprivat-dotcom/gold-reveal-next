import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Sparkles, Link2, Users, Send, Loader2, Check, History, ExternalLink } from "lucide-react";

type Model = {
  id: string;
  name: string | null;
  username: string | null;
  model_agency: string | null;
  model_active: boolean;
};

type AccountInfo = {
  id: string;
  platform: string;
  account_email: string | null;
  assigned_to: string | null;
  model_active: boolean;
};

type DropHistory = {
  id: string;
  model_name: string;
  content_link: string | null;
  message: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function ContentDropDialog({ open, onOpenChange }: Props) {
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Model | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"new" | "history">("new");
  const [history, setHistory] = useState<DropHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("models")
      .select("id, name, username, model_agency, model_active")
      .eq("model_active", true)
      .order("name", { ascending: true })
      .range(0, 9999)
      .then(({ data }) => setModels((data as Model[]) || []));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setQuery("");
      setLink("");
      setMessage("");
      setAccounts([]);
      setTab("new");
    }
  }, [open]);

  useEffect(() => {
    if (!selected) {
      setAccounts([]);
      return;
    }
    setLoadingAccounts(true);
    supabase
      .from("accounts")
      .select("id, platform, account_email, assigned_to, model_active")
      .eq("model_id", selected.id)
      .then(({ data }) => {
        setAccounts((data as AccountInfo[]) || []);
        setLoadingAccounts(false);
      });
  }, [selected]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("content_drops")
      .select("id, model_name, content_link, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory((data as DropHistory[]) || []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (open && tab === "history") loadHistory();
  }, [open, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models.slice(0, 30);
    return models
      .filter((m) =>
        [m.name, m.username, m.model_agency]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [models, query]);

  const platformsActive = useMemo(() => {
    const map = new Map<string, { chatters: number; emails: string[] }>();
    accounts
      .filter((a) => a.model_active)
      .forEach((a) => {
        const cur = map.get(a.platform) || { chatters: 0, emails: [] };
        if (a.assigned_to) cur.chatters += 1;
        if (a.account_email) cur.emails.push(a.account_email);
        map.set(a.platform, cur);
      });
    return Array.from(map.entries()).map(([platform, info]) => ({ platform, ...info }));
  }, [accounts]);

  const totalChatters = useMemo(
    () =>
      new Set(
        accounts.filter((a) => a.model_active && a.assigned_to).map((a) => a.assigned_to as string)
      ).size,
    [accounts]
  );

  const submit = async () => {
    if (!selected) return toast.error("Bitte Model auswählen");
    if (!link.trim() && !message.trim()) return toast.error("Link oder Nachricht erforderlich");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-content-drop", {
        body: {
          model_id: selected.id,
          content_link: link.trim(),
          message: message.trim(),
        },
      });
      if (error) throw error;
      toast.success(
        `Content gesendet an ${data?.recipients ?? 0} Chatter`
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Fehler beim Senden");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-card border-accent/20 p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-b from-accent/5 to-transparent">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <DialogTitle className="text-lg text-gold-gradient">Neuer Content Drop</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Wähle das Model, füge optional einen Link oder eine Nachricht ein – alle aktiven Chatter werden benachrichtigt.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 p-1 rounded-lg bg-secondary/40 border border-border/40 w-fit">
            <button
              onClick={() => setTab("new")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "new"
                  ? "bg-accent/20 text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3 inline mr-1" /> Neuer Drop
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "history"
                  ? "bg-accent/20 text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3 w-3 inline mr-1" /> Verlauf
            </button>
          </div>
        </div>

        {tab === "new" ? (
          <>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Model Search */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  1. Model auswählen
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Model suchen (Name, Username, Agentur)…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (selected) setSelected(null);
                    }}
                    className="pl-10 bg-secondary/40 border-border/50"
                  />
                </div>

                {!selected && filtered.length > 0 && (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border/50 bg-secondary/20 divide-y divide-border/30">
                    {filtered.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/10 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.name || m.username || "—"}
                          </p>
                          {m.username && m.name && (
                            <p className="text-[10px] text-muted-foreground truncate">@{m.username}</p>
                          )}
                        </div>
                        {m.model_agency && (
                          <span className="text-[9px] uppercase tracking-wider text-accent/80 px-2 py-0.5 rounded bg-accent/10 shrink-0">
                            {m.model_agency}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg border border-accent/40 bg-accent/5 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="h-4 w-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {selected.name || selected.username}
                          </p>
                          {selected.username && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              @{selected.username} · {selected.model_agency || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Ändern
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Account Preview */}
              {selected && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Empfänger ({totalChatters} Chatter auf {platformsActive.length} Plattform
                    {platformsActive.length === 1 ? "" : "en"})
                  </label>
                  {loadingAccounts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : platformsActive.length === 0 ? (
                    <p className="text-xs text-red-400 px-3 py-2 rounded bg-red-500/10 border border-red-500/20">
                      Keine aktiven Accounts mit zugewiesenen Chattern gefunden.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {platformsActive.map((p) => (
                        <div
                          key={p.platform}
                          className="rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2"
                        >
                          <p className="text-[10px] uppercase tracking-wider text-accent font-bold">
                            {p.platform}
                          </p>
                          <p className="text-xs text-foreground mt-0.5">
                            {p.chatters} Chatter · {p.emails.length} Account
                            {p.emails.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content Link */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3 w-3" /> 2. Content-Link <span className="text-muted-foreground/70 normal-case">(optional)</span>
                </label>
                <Input
                  placeholder="https://drive.google.com/…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="bg-secondary/40 border-border/50"
                />
              </div>

              {/* Optional message */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  3. Nachricht (optional)
                </label>
                <Textarea
                  placeholder="z.B. Frische Solo-Pics von Alina – ab sofort nutzbar"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="bg-secondary/40 border-border/50 text-sm"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/50 bg-secondary/20 flex items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground">
                Chatter sehen die Karte im Dashboard und erhalten eine Push.
              </p>
              <button
                onClick={submit}
                disabled={submitting || !selected || (!link.trim() && !message.trim())}
                className="h-10 px-5 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 50%))",
                  color: "hsl(0 0% 4%)",
                  boxShadow: "0 4px 20px -4px hsl(43 56% 52% / 0.4)",
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Wird gesendet…" : "Content broadcasten"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Noch keine Content Drops gesendet.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-foreground truncate">
                        {d.model_name || "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(d.created_at).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {d.message && (
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-snug">
                        {d.message}
                      </p>
                    )}
                    {d.content_link && (
                      <a
                        href={d.content_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline truncate max-w-full"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{d.content_link}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
