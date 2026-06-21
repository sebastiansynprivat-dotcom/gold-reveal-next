import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, CheckCircle2, Circle, ExternalLink, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Model = { id: string; name: string; username: string };
type MarketerList = {
  id: string;
  model_id: string;
  title: string;
  description: string | null;
  status: "open" | "done";
  position: number;
  created_at: string;
};
type ListItem = {
  id: string;
  list_id: string;
  position: number;
  title: string;
  reference_url: string | null;
  notes: string | null;
  done: boolean;
};

const sb = supabase as any;

export default function MarketerContentPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [lists, setLists] = useState<MarketerList[]>([]);
  const [itemsByList, setItemsByList] = useState<Record<string, ListItem[]>>({});
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Models assigned to this marketer
    const { data: ma } = await sb
      .from("marketer_model_assignments")
      .select("model_id")
      .eq("marketer_user_id", user.id);
    const modelIds = Array.from(new Set(((ma as any[]) || []).map((r) => r.model_id))).filter(Boolean);

    if (modelIds.length === 0) {
      setModels([]); setLists([]); setItemsByList({}); setLoading(false); return;
    }

    const [{ data: m }, { data: ls }] = await Promise.all([
      sb.from("fanvue_models").select("id,name,username").in("id", modelIds),
      sb
        .from("marketer_lists")
        .select("*")
        .in("model_id", modelIds)
        .eq("status", "open")
        .order("position")
        .order("created_at"),
    ]);
    const fetchedModels = (m as Model[]) || [];
    const fetchedLists = (ls as MarketerList[]) || [];
    setModels(fetchedModels);
    setLists(fetchedLists);

    // Auto-expand all models on first load
    setExpandedModels(new Set(fetchedModels.map((mm) => mm.id)));

    if (fetchedLists.length) {
      const { data: items } = await sb
        .from("marketer_list_items")
        .select("*")
        .in("list_id", fetchedLists.map((l) => l.id))
        .order("position");
      const map: Record<string, ListItem[]> = {};
      ((items as ListItem[]) || []).forEach((it) => { (map[it.list_id] ||= []).push(it); });
      setItemsByList(map);
    } else {
      setItemsByList({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh when admin adds/changes lists for relevant models
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("marketer_lists_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketer_lists" }, () => { load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "marketer_list_items" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeListByModel = useMemo(() => {
    const map: Record<string, MarketerList[]> = {};
    lists.forEach((l) => { (map[l.model_id] ||= []).push(l); });
    return map;
  }, [lists]);

  const toggleItem = async (item: ListItem) => {
    const next = !item.done;
    // Optimistic
    setItemsByList((prev) => {
      const arr = (prev[item.list_id] || []).map((x) => x.id === item.id ? { ...x, done: next } : x);
      return { ...prev, [item.list_id]: arr };
    });
    const { error } = await sb
      .from("marketer_list_items")
      .update({ done: next, done_by: next ? user?.id : null, done_at: next ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) {
      toast.error("Speichern fehlgeschlagen: " + error.message);
      setItemsByList((prev) => {
        const arr = (prev[item.list_id] || []).map((x) => x.id === item.id ? { ...x, done: !next } : x);
        return { ...prev, [item.list_id]: arr };
      });
      return;
    }

    // If all done, mark list complete server-side
    const updated = (itemsByList[item.list_id] || []).map((x) => x.id === item.id ? { ...x, done: next } : x);
    if (next && updated.length > 0 && updated.every((x) => x.done)) {
      const list = lists.find((l) => l.id === item.list_id);
      const { error: rpcErr } = await sb.rpc("complete_marketer_list", { p_list_id: item.list_id });
      if (!rpcErr) {
        toast.success(`Liste „${list?.title || ""}" abgeschlossen!`);
        load();
      }
    }
  };

  const toggleModel = (id: string) =>
    setExpandedModels((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4 text-accent" />
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Meine Listen</h2>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center text-muted-foreground text-sm">
          Wird geladen…
        </div>
      </section>
    );
  }

  if (models.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Meine Listen</h2>
      </div>
      <div className="space-y-3">
        {models.map((mm) => {
          const open = (activeListByModel[mm.id] || []).slice().sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
          const active = open[0];
          const queue = open.slice(1);
          const items = active ? (itemsByList[active.id] || []) : [];
          const done = items.filter((i) => i.done).length;
          const pct = items.length ? Math.round((done / items.length) * 100) : 0;
          const isExpanded = expandedModels.has(mm.id);

          return (
            <motion.div
              key={mm.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => toggleModel(mm.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/5 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-accent shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground truncate">{mm.name || "—"}</h3>
                    {mm.username && <span className="text-[11px] text-muted-foreground">@{mm.username}</span>}
                  </div>
                  {active ? (
                    <>
                      <p className="text-xs text-accent/90 mt-1 truncate">
                        Aktive Liste: <span className="font-semibold">{active.title}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{done}/{items.length}</span>
                      </div>
                      {queue.length > 0 && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1.5">
                          +{queue.length} weitere in Warteschlange
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 mt-1 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-accent/80" />
                      Alle Listen abgearbeitet – warte auf neue Vorgaben.
                    </p>
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && active && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      {active.description && (
                        <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{active.description}</p>
                      )}
                      <div className="space-y-1.5">
                        {items.map((it) => (
                          <div key={it.id} className="flex items-start gap-2 p-2 rounded hover:bg-background/40">
                            <button onClick={() => toggleItem(it)} className="shrink-0 mt-0.5">
                              {it.done
                                ? <CheckCircle2 className="h-4 w-4 text-accent" />
                                : <Circle className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {it.title}
                              </p>
                              {it.notes && <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{it.notes}</p>}
                              {it.reference_url && (
                                <a
                                  href={it.reference_url.startsWith("http") ? it.reference_url : `https://${it.reference_url}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" /> Referenz öffnen
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
