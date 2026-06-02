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
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Account vorzuweisen (optional)
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Suche nach Model-Username, E-Mail oder Plattform"
                    className="h-8 pl-7 text-xs bg-secondary/30 border-transparent"
                  />
                </div>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  size={Math.min(6, Math.max(3, filteredAccounts.length + 1))}
                  className="w-full text-xs rounded-md bg-secondary/30 border border-transparent px-2 py-1 text-foreground"
                >
                  <option value="">— kein Account —</option>
                  {filteredAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatAccountLabel(a)}
                    </option>
                  ))}
                </select>
                {accountSearch && (
                  <p className="text-[10px] text-muted-foreground">
                    {filteredAccounts.length} Treffer
                  </p>
                )}
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
