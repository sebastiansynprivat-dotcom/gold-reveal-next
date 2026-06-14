import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  UserPlus,
  Loader2,
  Trash2,
  Clock,
  Search,
  X,
  Check,
  AtSign,
  Mail,
  CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreProfile {
  id: string;
  name: string | null;
  telegram_id: string | null;
  language: "de" | "en";
  group_name: string;
  created_at: string;
  assignments: {
    id: string;
    account_id: string;
    start_date: string;
  }[];
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
  const [list, setList] = useState<PreProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [modelUsernames, setModelUsernames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: profs, error } = await supabase
      .from("profiles")
      .select("id, name, telegram_id, language, group_name, created_at, pre_create")
      .eq("pre_create", true)
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      toast.error("Fehler beim Laden: " + error.message);
      return;
    }
    const ids = (profs || []).map((p: any) => p.id);
    let assignmentsByProfile: Record<string, PreProfile["assignments"]> = {};
    if (ids.length > 0) {
      const { data: aas } = await supabase
        .from("account_assignments")
        .select("id, account_id, start_date, end_date, profile_id")
        .in("profile_id", ids)
        .is("end_date", null);
      (aas || []).forEach((a: any) => {
        if (!assignmentsByProfile[a.profile_id]) assignmentsByProfile[a.profile_id] = [];
        assignmentsByProfile[a.profile_id].push({
          id: a.id,
          account_id: a.account_id,
          start_date: a.start_date,
        });
      });
    }
    setList(
      (profs || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        telegram_id: p.telegram_id,
        language: (p.language || "de") as "de" | "en",
        group_name: p.group_name || "",
        created_at: p.created_at,
        assignments: assignmentsByProfile[p.id] || [],
      })),
    );
    setLoading(false);
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
    const base = q
      ? freeAccounts.filter((a) => {
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
        })
      : freeAccounts;
    return [...base].sort((a, b) => {
      const aFree = a.assigned_to ? 1 : 0;
      const bFree = b.assigned_to ? 1 : 0;
      return aFree - bFree;
    });
  }, [accountSearch, freeAccounts, modelUsernames]);

  const freeCount = useMemo(() => freeAccounts.filter((a) => !a.assigned_to).length, [freeAccounts]);

  const toggleAccount = (id: string) => {
    setAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const add = async () => {
    if (!telegram.trim()) {
      toast.error("Telegram-ID ist erforderlich");
      return;
    }
    setSaving(true);
    try {
      // 0) Guard: there must not already be a real (non pre-create) profile with this Telegram-ID.
      //    Otherwise the pre-create row stays orphaned and is never matched on login.
      const { data: existing, error: existErr } = await supabase
        .from("profiles")
        .select("id, group_name, pre_create, user_id")
        .eq("telegram_id", telegram.trim())
        .eq("pre_create", false)
        .limit(1);
      if (existErr) throw existErr;
      if (existing && existing.length > 0) {
        const name = (existing[0] as any).group_name || "Chatter";
        toast.error(
          `Es gibt bereits einen registrierten Chatter mit dieser Telegram-ID (${name}). Bitte Accounts direkt diesem Chatter zuweisen.`,
        );
        setSaving(false);
        return;
      }

      // 1) Create pre-create profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .insert({
          user_id: null as any,
          pre_create: true,
          name: groupName.trim() || null,
          group_name: groupName.trim() || "",
          telegram_id: telegram.trim(),
          language,
        } as any)
        .select("id")
        .single();
      if (profErr) throw profErr;

      // 2) Create assignment rows
      if (accountIds.length > 0) {
        const startStr = format(startDate, "yyyy-MM-dd");
        const rows = accountIds.map((aid) => ({
          account_id: aid,
          profile_id: (prof as any).id,
          user_id: null,
          start_date: startStr,
          assigned_at: new Date().toISOString(),
        }));
        const { error: aaErr } = await supabase
          .from("account_assignments")
          .insert(rows as any);
        if (aaErr) throw aaErr;
      }

      toast.success("Chatter vorgemerkt");
      setGroupName("");
      setTelegram("");
      setAccountIds([]);
      setAccountSearch("");
      setLanguage("de");
      setStartDate(new Date());
      load();
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    // Delete profile; trigger close_assignments_on_profile_archive will close assignments
    // and we also want them gone — so delete assignments first to be safe.
    await supabase.from("account_assignments").delete().eq("profile_id", id);
    const { error } = await supabase.from("profiles").delete().eq("id", id);
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
              <div className="space-y-1">
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
                      {lang === "de" ? "🇩🇪 DE" : "🇬🇧 EN"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Startdatum</label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-full justify-start text-xs font-normal bg-secondary/30 border-transparent"
                    >
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      {format(startDate, "dd.MM.yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => {
                        if (d) setStartDate(d);
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                  <span>Accounts vorzuweisen (Mehrfachauswahl)</span>
                  {accountIds.length > 0 && (
                    <span className="text-accent normal-case">{accountIds.length} ausgewählt</span>
                  )}
                </label>

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

                <div className="rounded-lg border border-border/40 bg-background/40 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/20">
                    {filteredAccounts.length === 0 ? (
                      <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                        Keine Treffer
                      </div>
                    ) : (
                      filteredAccounts.map((a) => {
                        const selected = accountIds.includes(a.id);
                        const username = a.model_id ? modelUsernames[a.model_id] : null;
                        const isAssigned = !!a.assigned_to;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            disabled={isAssigned}
                            onClick={() => !isAssigned && toggleAccount(a.id)}
                            title={isAssigned ? "Bereits einem Chatter zugewiesen" : undefined}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors",
                              selected ? "bg-accent/10" : "hover:bg-secondary/40",
                              isAssigned && "opacity-50 cursor-not-allowed hover:bg-transparent",
                            )}
                          >
                            <div className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
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
                            {isAssigned && (
                              <Badge className="text-[8px] px-1.5 py-0 h-4 shrink-0 bg-amber-500/15 text-amber-400 border-amber-500/30 uppercase tracking-wide">
                                vergeben
                              </Badge>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-border/30 bg-secondary/20">
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {accountSearch ? `${filteredAccounts.length} Treffer` : `${freeCount} freie Accounts`}
                    </span>
                    {accountIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAccountIds([])}
                        className="text-[9px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition"
                      >
                        Auswahl leeren
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
                const accs = pc.assignments
                  .map((a) => freeAccounts.find((fa) => fa.id === a.account_id))
                  .filter(Boolean) as AccountOption[];
                return (
                  <div
                    key={pc.id}
                    className="flex items-start justify-between p-3 rounded-xl glass-card-subtle gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-accent/20">
                          {pc.language === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
                        </Badge>
                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                          <Clock className="h-2.5 w-2.5 mr-0.5" /> wartet
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">
                        {pc.name || pc.group_name || "—"} · {pc.telegram_id}
                      </p>
                      {accs.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {accs.map((a, i) => (
                            <Badge
                              key={a.id}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0"
                            >
                              {formatAccountLabel(a)}
                              {pc.assignments[i]?.start_date && (
                                <span className="ml-1 opacity-60">
                                  · {format(new Date(pc.assignments[i].start_date), "dd.MM.yy")}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(pc.id)}
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
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
