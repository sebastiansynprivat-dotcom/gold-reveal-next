import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, CheckCircle2, Circle, ExternalLink, Sparkles, ChevronDown, ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Model = { id: string; name: string; username: string };
type MarketerList = {
  id: string;
  model_id: string;
  title: string;
  description: string | null;
  status: "open" | "done";
  position: number;
  completed_at: string | null;
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
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [showHistoryFor, setShowHistoryFor] = useState<Set<string>>(new Set());

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

    // Fetch ALL lists (open + done) so the marketer sees new queued lists
    // and can browse past completed ones for context.
    const [{ data: m }, { data: ls }] = await Promise.all([
      sb.from("fanvue_models").select("id,name,username").in("id", modelIds),
      sb
        .from("marketer_lists")
        .select("*")
        .in("model_id", modelIds)
        .order("model_id")
        .order("status")
        .order("position")
        .order("created_at"),
    ]);
    const fetchedModels = (m as Model[]) || [];
    const fetchedLists = (ls as MarketerList[]) || [];
    setModels(fetchedModels);
    setLists(fetchedLists);

    // Auto-expand all model cards on first load
    setExpandedModels((prev) => (prev.size ? prev : new Set(fetchedModels.map((mm) => mm.id))));

    if (fetchedLists.length) {
      const { data: items } = await sb
        .from("marketer_list_items")
        .select("*")
        .in("list_id", fetchedLists.map((l) => l.id))
        .order("position");
      const map: Record<string, ListItem[]> = {};
      ((items as ListItem[]) || []).forEach((it) => { (map[it.list_id] ||= []).push(it); });
      setItemsByList(map);

      // Auto-expand the active (first open) list per model
      const activeIds = new Set<string>();
      const grouped: Record<string, MarketerList[]> = {};
      fetchedLists.forEach((l) => { (grouped[l.model_id] ||= []).push(l); });
      Object.values(grouped).forEach((arr) => {
        const open = arr.filter((l) => l.status === "open").sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
        if (open[0]) activeIds.add(open[0].id);
      });
      setExpandedLists((prev) => {
        if (prev.size) return prev;
        return activeIds;
      });
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

  const listsByModel = useMemo(() => {
    const map: Record<string, MarketerList[]> = {};
    lists.forEach((l) => { (map[l.model_id] ||= []).push(l); });
    return map;
  }, [lists]);

  const toggleItem = async (item: ListItem, listStatus: "open" | "done") => {
    if (listStatus !== "open") return; // don't allow ticking on done lists
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
  const toggleList = (id: string) =>
    setExpandedLists((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleHistory = (id: string) =>
    setShowHistoryFor((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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

  const renderItems = (list: MarketerList) => {
    const items = itemsByList[list.id] || [];
    if (items.length === 0) {
      return <p className="text-[11px] text-muted-foreground italic px-1 py-2">Keine Aufgaben in dieser Liste.</p>;
    }
    return (
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.id}
            className={`rounded-lg border p-3 transition-colors ${
              it.done
                ? "border-emerald-500/40 bg-emerald-500/5"
                : list.status === "done"
                  ? "border-border/30 bg-background/30"
                  : "border-accent/20 bg-accent/5"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => toggleItem(it, list.status)}
                className="shrink-0 mt-[2px] disabled:opacity-50"
                aria-label="Erledigt"
                disabled={list.status !== "open"}
              >
                {it.done
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <Circle className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" />}
              </button>
              <div className="flex-1 min-w-0 space-y-2">
                <div className={`text-sm font-semibold leading-snug ${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {it.title}
                </div>
                {it.reference_url && (
                  <a
                    href={it.reference_url.startsWith("http") ? it.reference_url : `https://${it.reference_url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline leading-none"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" /> Referenz ansehen
                  </a>
                )}
                {it.notes && (
                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{it.notes}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Meine Listen</h2>
      </div>
      <div className="space-y-3">
        {models.map((mm) => {
          const all = (listsByModel[mm.id] || []).slice();
          const open = all
            .filter((l) => l.status === "open")
            .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
          const done = all
            .filter((l) => l.status === "done")
            .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
          const active = open[0];
          const items = active ? (itemsByList[active.id] || []) : [];
          const doneCount = items.filter((i) => i.done).length;
          const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
          const isExpanded = expandedModels.has(mm.id);
          const historyOpen = showHistoryFor.has(mm.id);

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
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{doneCount}/{items.length}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        <span>Aktiv: {active.title}</span>
                        {open.length > 1 && <span>· +{open.length - 1} in Warteschlange</span>}
                        {done.length > 0 && <span>· {done.length} erledigt</span>}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 mt-1 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-accent/80" />
                      {done.length > 0
                        ? "Alle Listen abgearbeitet – warte auf neue Vorgaben."
                        : "Noch keine Listen für dieses Model."}
                      {done.length > 0 && ` (${done.length} erledigt)`}
                    </p>
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3">
                      {open.map((l, idx) => {
                        const isActive = idx === 0;
                        const isOpen = expandedLists.has(l.id);
                        const li = itemsByList[l.id] || [];
                        const dc = li.filter((x) => x.done).length;
                        return (
                          <div
                            key={l.id}
                            className={`rounded-xl border ${isActive ? "border-accent/40 bg-accent/5" : "border-border/30 bg-background/30"}`}
                          >
                            <button
                              onClick={() => toggleList(l.id)}
                              className="w-full flex items-start gap-2 p-3 text-left"
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4 text-accent shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={isActive ? "border-accent text-accent text-[10px]" : "border-border text-muted-foreground text-[10px]"}
                                  >
                                    {isActive ? "Aktiv" : `#${idx + 1} Warteschlange`}
                                  </Badge>
                                  <span className="font-semibold text-sm text-foreground truncate">{l.title}</span>
                                </div>
                                {l.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">{l.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1 rounded-full bg-background/60 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-accent to-yellow-400"
                                      style={{ width: `${li.length ? Math.round((dc / li.length) * 100) : 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] tabular-nums text-muted-foreground">{dc}/{li.length}</span>
                                </div>
                              </div>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3 pb-3">{renderItems(l)}</div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {open.length === 0 && (
                        <p className="text-xs text-muted-foreground/70 italic px-1">
                          Keine offene Liste. Sobald der Admin eine neue anlegt, erscheint sie hier automatisch.
                        </p>
                      )}

                      {done.length > 0 && (
                        <div className="border-t border-border/20 pt-3">
                          <button
                            onClick={() => toggleHistory(mm.id)}
                            className="w-full text-left text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent flex items-center gap-1.5 py-1"
                          >
                            {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <History className="h-3 w-3" />
                            Vergangene Listen ({done.length})
                          </button>
                          <AnimatePresence initial={false}>
                            {historyOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-2 mt-2">
                                  {done.map((l) => {
                                    const isOpen = expandedLists.has(l.id);
                                    const li = itemsByList[l.id] || [];
                                    return (
                                      <div key={l.id} className="rounded-xl border border-border/30 bg-background/30">
                                        <button
                                          onClick={() => toggleList(l.id)}
                                          className="w-full flex items-start gap-2 p-3 text-left"
                                        >
                                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                              <span className="font-semibold text-sm text-foreground/80 truncate">{l.title}</span>
                                              {l.completed_at && (
                                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                                  {new Date(l.completed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                                </span>
                                              )}
                                            </div>
                                            {l.description && (
                                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground/70 mt-1">{li.length} Aufgaben</p>
                                          </div>
                                        </button>
                                        <AnimatePresence initial={false}>
                                          {isOpen && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="px-3 pb-3">{renderItems(l)}</div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
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
