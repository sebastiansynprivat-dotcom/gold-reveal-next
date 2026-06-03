import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, RotateCcw, Search, Loader2, ChevronDown } from "lucide-react";

type DeletedRow = {
  id: string;
  entity_type: "model" | "account" | "profile";
  original_id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  platform: string | null;
  model_agency: string | null;
  telegram_id: string | null;
  group_name: string | null;
  deleted_at: string;
  deleted_by: string | null;
  reason: string | null;
  restored_at: string | null;
  data: any;
};

const ENTITY_TABLES: Record<DeletedRow["entity_type"], string> = {
  model: "models",
  account: "accounts",
  profile: "profiles",
};

export default function DeletedRecordsTab() {
  const [rows, setRows] = useState<DeletedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | DeletedRow["entity_type"]>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("deleted_records")
      .select("*")
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data || []) as DeletedRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.entity_type !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.name, r.email, r.username, r.platform, r.telegram_id, r.group_name, r.original_id]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const restore = async (row: DeletedRow) => {
    if (!confirm(`Datensatz "${row.name || row.email || row.original_id}" wiederherstellen?`)) return;
    setBusyId(row.id);
    try {
      const table = ENTITY_TABLES[row.entity_type];
      // Strip volatile fields that can't be re-inserted as-is
      const payload = { ...row.data };
      const { error: insErr } = await (supabase as any).from(table).insert(payload);
      if (insErr) throw insErr;
      const { error: updErr } = await (supabase as any)
        .from("deleted_records")
        .update({ restored_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updErr) throw updErr;
      toast.success("Wiederhergestellt");
      load();
    } catch (e: any) {
      toast.error("Restore fehlgeschlagen: " + (e.message || String(e)));
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (row: DeletedRow) => {
    if (!confirm("Endgültig aus Archiv löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    setBusyId(row.id);
    const { error } = await (supabase as any).from("deleted_records").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Aus Archiv entfernt"); load(); }
    setBusyId(null);
  };

  const badgeColor = (t: string) =>
    t === "model" ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
    t === "account" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">Gelöschte Datensätze (Archiv)</h3>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} / {rows.length}</span>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {(["all", "model", "account", "profile"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === t
                    ? "bg-accent/20 text-accent border-accent/40"
                    : "bg-transparent text-muted-foreground border-border hover:border-accent/30"
                }`}
              >
                {t === "all" ? "Alle" : t === "model" ? "Models" : t === "account" ? "Accounts" : "Profiles"}
              </button>
            ))}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, E-Mail, Username, Platform, Telegram..."
                className="pl-9 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aktualisieren"}
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Keine gelöschten Datensätze.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const isOpen = expanded === r.id;
                const title = r.name || r.email || r.username || r.original_id;
                return (
                  <div key={r.id} className="glass-card-subtle rounded-lg overflow-hidden">
                    <div className="px-3 py-2.5 flex items-center gap-3 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeColor(r.entity_type)}`}>
                        {r.entity_type}
                      </span>
                      <div className="flex-1 min-w-[150px]">
                        <div className="text-sm font-semibold text-foreground truncate">{title}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {r.email && <span>{r.email}</span>}
                          {r.username && <span>@{r.username}</span>}
                          {r.platform && <span>{r.platform}</span>}
                          {r.model_agency && <span>{r.model_agency}</span>}
                          {r.telegram_id && <span>TG: {r.telegram_id}</span>}
                          {r.group_name && <span>{r.group_name}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.deleted_at).toLocaleString("de-DE")}
                      </div>
                      {r.restored_at ? (
                        <span className="text-xs text-emerald-400">Restored</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restore(r)}
                          disabled={busyId === r.id}
                          className="gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => purge(r)}
                        disabled={busyId === r.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    {isOpen && (
                      <pre className="text-[11px] bg-black/40 p-3 overflow-auto max-h-80 border-t border-border text-muted-foreground">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
