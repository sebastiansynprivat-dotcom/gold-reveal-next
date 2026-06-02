import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserPlus, Loader2, Trash2, CheckCircle2, Clock, Search, X, Check, AtSign, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreChatter {
  id: string;
  name: string;
  telegram_id: string;
  language: "de" | "en";
  preassigned_account_id: string | null;
  claimed_at: string | null;
  claimed_user_id: string | null;
  created_at: string;
}

interface AccountOption {
  id: string;
  platform: string;
  account_email: string;
  assigned_to: string | null;
  model_id?: string | null;
  model_name?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freeAccounts: AccountOption[];
}

export default function PreChattersDialog({ open, onOpenChange, freeAccounts }: Props) {
  const [list, setList] = useState<PreChatter[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [accountId, setAccountId] = useState<string>("");
  const [accountSearch, setAccountSearch] = useState("");

  // Map of model_id → username (fetched once when dialog opens)
  const [modelUsernames, setModelUsernames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pre_chatters" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Fehler beim Laden: " + error.message);
      return;
    }
    setList((data as any[]) as PreChatter[]);
  };

  const loadModelUsernames = async () => {
    const ids = Array.from(new Set(freeAccounts.map((a) => a.model_id).filter(Boolean))) as string[];
    if (ids.length === 0) {
      setModelUsernames({});
      return;
    }
    const { data, error } = await supabase.from("models").select("id, username").in("id", ids);
    if (error) return;
    const map: Record<string, string> = {};
    (data || []).forEach((m: any) => {
      if (m.username) map[m.id] = m.username;
    });
    setModelUsernames(map);
  };

  useEffect(() => {
    if (open) {
      load();
      loadModelUsernames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return freeAccounts;
    return freeAccounts.filter((a) => {
      const username = a.model_id ? (modelUsernames[a.model_id] || "").toLowerCase() : "";
      const modelName = (a.model_name || "").toLowerCase();
      const email = (a.account_email || "").toLowerCase();
      const platform = (a.platform || "").toLowerCase();
      return (
        username.includes(q) ||
        modelName.includes(q) ||
        email.includes(q) ||
        platform.includes(q)
      );
    });
  }, [accountSearch, freeAccounts, modelUsernames]);

  const add = async () => {
    if (!telegram.trim()) {
      toast.error("Telegram-ID ist erforderlich");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pre_chatters" as any).insert({
      name: groupName.trim(),
      telegram_id: telegram.trim(),
      language,
      preassigned_account_id: accountId || null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Chatter vorgemerkt");
    setGroupName("");
    setTelegram("");
    setAccountId("");
    setAccountSearch("");
    setLanguage("de");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("pre_chatters" as any).delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Eintrag entfernt");
    load();
  };

  const formatAccountLabel = (a: AccountOption) => {
    const username = a.model_id ? modelUsernames[a.model_id] : null;
    const parts = [a.platform];
    if (username) parts.push(`@${username}`);
    else if (a.model_name) parts.push(a.model_name);
    parts.push(a.account_email);
    return parts.filter(Boolean).join(" · ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/30 sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 gold-glow">
              <UserPlus className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-foreground text-base font-bold">Chatter vorab anlegen</DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Werden beim Signup über Telegram-ID automatisch verknüpft
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1 -mr-1 pt-3">
          {/* Form */}
          <div className="glass-card-subtle rounded-xl p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Gruppenname (optional)</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                  className="h-8 text-xs bg-secondary/30 border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Telegram-ID *</label>
                <Input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="Telegram-ID"
                  className="h-8 text-xs bg-secondary/30 border-transparent"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Sprache</label>
                <div className="flex gap-1.5">
                  {(["de", "en"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={cn(
                        "flex-1 h-8 rounded-md text-xs font-medium transition-all border",
                        language === lang
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-secondary/30 text-muted-foreground border-transparent hover:text-foreground",
                      )}
                    >
                      {lang === "de" ? "🇩🇪 Deutsch" : "🇬🇧 Englisch"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Account vorzuweisen (optional)
                </label>

                {/* Search field */}
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <Input
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Model, E-Mail oder Plattform suchen…"
                    className="h-9 pl-8 pr-8 text-xs bg-secondary/40 border border-border/40 focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:border-accent/50 rounded-lg"
                  />
                  {accountSearch && (
                    <button
                      type="button"
                      onClick={() => setAccountSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition"
                      aria-label="Suche leeren"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Results list */}
                <div className="rounded-lg border border-border/40 bg-background/40 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/20">
                    {/* "no account" option */}
                    <button
                      type="button"
                      onClick={() => setAccountId("")}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors",
                        accountId === ""
                          ? "bg-accent/10 text-foreground"
                          : "hover:bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                        accountId === "" ? "border-accent bg-accent" : "border-border/60",
                      )}>
                        {accountId === "" && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                      </div>
                      <span className="text-[11px] italic">— kein Account zuweisen —</span>
                    </button>

                    {filteredAccounts.length === 0 ? (
                      <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                        Keine Treffer
                      </div>
                    ) : (
                      filteredAccounts.map((a) => {
                        const selected = accountId === a.id;
                        const username = a.model_id ? modelUsernames[a.model_id] : null;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAccountId(a.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                              selected ? "bg-accent/10" : "hover:bg-secondary/40",
                            )}
                          >
                            <div className={cn(
                              "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                              selected ? "border-accent bg-accent" : "border-border/60",
                            )}>
                              {selected && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-accent/15 text-accent border-accent/20 uppercase tracking-wide"
                            >
                              {a.platform}
                            </Badge>
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              {username ? (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground truncate">
                                  <AtSign className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                  {username}
                                </span>
                              ) : a.model_name ? (
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {a.model_name}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                                <Mail className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{a.account_email}</span>
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/30 bg-secondary/20">
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {accountSearch ? `${filteredAccounts.length} Treffer` : `${freeAccounts.length} freie Accounts`}
                    </span>
                    {accountId && (
                      <button
                        type="button"
                        onClick={() => setAccountId("")}
                        className="text-[9px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
                      >
                        Auswahl zurücksetzen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={add}
              disabled={saving}
              size="sm"
              className="w-full h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Hinzufügen"}
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              <p className="text-[11px] font-semibold text-foreground tracking-wide uppercase">Vorgemerkt</p>
              <Badge variant="secondary" className="text-[9px] ml-auto">
                {list.length}
              </Badge>
            </div>
            {loading ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : list.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-6">Keine Einträge</p>
            ) : (
              list.map((pc) => {
                const acc = pc.preassigned_account_id
                  ? freeAccounts.find((a) => a.id === pc.preassigned_account_id)
                  : null;
                return (
                  <div
                    key={pc.id}
                    className="flex items-center justify-between p-3 rounded-xl glass-card-subtle"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-accent/20">
                          {pc.language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                        </Badge>
                        {pc.claimed_at ? (
                          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> verknüpft
                          </Badge>
                        ) : (
                          <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                            <Clock className="h-2.5 w-2.5 mr-0.5" /> wartet
                          </Badge>
                        )}
                        {acc && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {formatAccountLabel(acc)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">
                        {pc.name || "—"} · {pc.telegram_id}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(pc.id)}
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0 ml-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
