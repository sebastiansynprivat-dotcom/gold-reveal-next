import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AttentionRow {
  id: string;
  account_id: string;
  date: string;
  type: "post" | "message" | "campaign";
  reason: string;
  resolved_by_user: boolean;
  resolved_by_user_id: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
}

interface AccountLite {
  id: string;
  platform: string | null;
  account_email: string | null;
  username: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const typeColor: Record<string, string> = {
  post: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  message: "bg-purple-500/15 text-purple-400 border-purple-500/40",
  campaign: "bg-amber-500/15 text-amber-400 border-amber-500/40",
};

export default function SetupAttentionAlert() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttentionRow[]>([]);
  const [accounts, setAccounts] = useState<Record<string, AccountLite>>({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "message" | "campaign">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const today = todayISO();

  // Load today's rows + realtime
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("setup_attention")
        .select("*")
        .eq("date", today)
        .order("created_at", { ascending: false });
      if (mounted) setRows((data || []) as AttentionRow[]);
    };
    load();

    const ch = supabase
      .channel("setup_attention_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "setup_attention" },
        (payload: any) => {
          setRows((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((r) => r.id !== payload.old.id);
            const next = payload.new as AttentionRow;
            if (next.date !== today) return prev;
            if (payload.eventType === "INSERT") return [next, ...prev.filter((r) => r.id !== next.id)];
            return prev.map((r) => (r.id === next.id ? next : r));
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [today]);

  // Load account metadata for the affected rows
  useEffect(() => {
    if (!rows.length) return;
    const missing = rows.map((r) => r.account_id).filter((id) => !accounts[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, platform, account_email, username")
        .in("id", [...new Set(missing)]);
      if (data) {
        setAccounts((prev) => {
          const next = { ...prev };
          (data as AccountLite[]).forEach((a) => (next[a.id] = a));
          return next;
        });
      }
    })();
  }, [rows, accounts]);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const p = accounts[r.account_id]?.platform;
      if (p) set.add(p);
    });
    return [...set].sort();
  }, [rows, accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter === "open" && r.resolved_by_user) return false;
      if (statusFilter === "done" && !r.resolved_by_user) return false;
      const a = accounts[r.account_id];
      if (platformFilter !== "all" && a?.platform !== platformFilter) return false;
      if (!q) return true;
      return (
        (a?.platform || "").toLowerCase().includes(q) ||
        (a?.account_email || "").toLowerCase().includes(q) ||
        (a?.username || "").toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.type.includes(q)
      );
    }).sort((a, b) => {
      const pa = accounts[a.account_id]?.platform || "";
      const pb = accounts[b.account_id]?.platform || "";
      if (pa !== pb) return pa.localeCompare(pb);
      return a.type.localeCompare(b.type);
    });
  }, [rows, accounts, search, typeFilter, statusFilter, platformFilter]);

  const toggleResolved = async (row: AttentionRow) => {
    const newVal = !row.resolved_by_user;
    let name: string | null = null;
    if (newVal && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      name = (profile?.name as string) || user.email || "Admin";
    }
    const patch = newVal
      ? {
          resolved_by_user: true,
          resolved_by_user_id: user?.id ?? null,
          resolved_by_name: name,
          resolved_at: new Date().toISOString(),
        }
      : {
          resolved_by_user: false,
          resolved_by_user_id: null,
          resolved_by_name: null,
          resolved_at: null,
        };
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } as AttentionRow : r)));
    const { error } = await supabase.from("setup_attention").update(patch).eq("id", row.id);
    if (error) {
      toast.error("Konnte Status nicht ändern");
    }
  };

  const refreshNow = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-setup-attention");
      if (error) throw error;
      toast.success(`Aktualisiert: ${data?.count ?? 0} Hinweise`);
    } catch (e: any) {
      toast.error(e?.message || "Fehler bei der Aktualisierung");
    } finally {
      setRefreshing(false);
    }
  };

  if (rows.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes setup-attention-flash {
          0%, 100% { opacity: 1; text-shadow: 0 0 12px rgba(239,68,68,0.85); }
          50% { opacity: 0.25; text-shadow: 0 0 4px rgba(239,68,68,0.3); }
        }
        .setup-attention-flash { animation: setup-attention-flash 1s ease-in-out infinite; }
      `}</style>
      <button
        onClick={() => setOpen(true)}
        className="setup-attention-flash text-red-500 font-extrabold tracking-wider text-sm uppercase select-none focus:outline-none"
        title="Setup-Probleme anzeigen"
      >
        ATTENTION !!!
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl glass-card border-red-500/30 p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Setup Attention
              <Badge variant="outline" className="ml-1.5 text-[9px] h-4 px-1.5 border-red-500/40 text-red-400 bg-red-500/10">
                {rows.length}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-[10px] px-2"
                onClick={refreshNow}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", refreshing && "animate-spin")} />
                Jetzt neu prüfen
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border/40">
            <div className="relative input-gold-shimmer rounded-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche Account, Plattform, Grund…"
                className="pl-7 text-[11px] h-7 border-transparent"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="px-3 py-2 border-b border-border/40 flex flex-wrap gap-2">
            <FilterChips
              label="Typ"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as any)}
              options={[
                { id: "all", label: "Alle" },
                { id: "post", label: "Post" },
                { id: "message", label: "Message" },
                { id: "campaign", label: "Campaign" },
              ]}
            />
            <FilterChips
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={[
                { id: "all", label: "Alle" },
                { id: "open", label: "Offen" },
                { id: "done", label: "✓ Erledigt" },
              ]}
            />
            {platforms.length > 0 && (
              <FilterChips
                label="Plattform"
                value={platformFilter}
                onChange={(v) => setPlatformFilter(v)}
                options={[{ id: "all", label: "Alle" }, ...platforms.map((p) => ({ id: p, label: p }))]}
              />
            )}
          </div>

          {/* Table */}
          <div className="max-h-[55vh] overflow-y-auto">
            <div className="grid grid-cols-[80px_1fr_70px_1.4fr_110px_30px] gap-2 px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur">
              <span>Plattform</span>
              <span>Account</span>
              <span>Typ</span>
              <span>Grund</span>
              <span>Erledigt von</span>
              <span />
            </div>
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-muted-foreground">Keine Einträge</div>
            ) : (
              filtered.map((r) => {
                const a = accounts[r.account_id];
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "grid grid-cols-[80px_1fr_70px_1.4fr_110px_30px] gap-2 px-3 py-2 items-center text-[11px] border-b border-border/30 hover:bg-accent/5 transition-colors",
                      r.resolved_by_user && "opacity-60",
                    )}
                  >
                    <span className="text-[10px] font-bold text-accent/90 uppercase tracking-wider truncate">
                      {a?.platform || "—"}
                    </span>
                    <div className="min-w-0">
                      <div className={cn("font-semibold text-foreground truncate", r.resolved_by_user && "line-through")}>
                        {a?.account_email || a?.id || "—"}
                      </div>
                      {a?.username && (
                        <div className="text-[9px] text-muted-foreground truncate">@{a.username}</div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border w-fit",
                        typeColor[r.type],
                      )}
                    >
                      {r.type}
                    </span>
                    <span className={cn("text-muted-foreground truncate", r.resolved_by_user && "line-through")} title={r.reason}>
                      {r.reason}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate" title={r.resolved_by_name || ""}>
                      {r.resolved_by_name || "—"}
                    </span>
                    <button
                      onClick={() => toggleResolved(r)}
                      className={cn(
                        "h-5 w-5 rounded flex items-center justify-center border transition-colors",
                        r.resolved_by_user
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : "border-border/50 text-muted-foreground/40 hover:text-green-400 hover:border-green-500/40",
                      )}
                      aria-label="Erledigt umschalten"
                      title={r.resolved_by_user ? "Als offen markieren" : "Als erledigt markieren"}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ChipProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}

function FilterChips({ label, value, onChange, options }: ChipProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-1">{label}</span>
      <div className="flex gap-0.5 p-0.5 rounded-md bg-secondary/30">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "px-2 py-0.5 text-[10px] rounded transition-colors",
              value === o.id
                ? "bg-accent/20 text-accent font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
