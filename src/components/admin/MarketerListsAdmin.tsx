import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, X, CheckCircle2, ChevronDown, ChevronRight,
  Search, ListChecks, Copy, Link as LinkIcon, ArrowUp, ArrowDown,
} from "lucide-react";

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

type DraftItem = { title: string; reference_url: string; notes: string };

const sb = supabase as any;

export default function MarketerListsAdmin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [lists, setLists] = useState<MarketerList[]>([]);
  const [itemsByList, setItemsByList] = useState<Record<string, ListItem[]>>({});
  const [search, setSearch] = useState("");
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [showDoneFor, setShowDoneFor] = useState<Set<string>>(new Set());

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MarketerList | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ title: "", reference_url: "", notes: "" }]);
  const [draftModels, setDraftModels] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: ls }] = await Promise.all([
      sb.from("fanvue_models").select("id,name,username").order("name"),
      sb.from("marketer_lists").select("*").order("model_id").order("status").order("position").order("created_at"),
    ]);
    setModels((m as Model[]) || []);
    const lists = (ls as MarketerList[]) || [];
    setLists(lists);

    if (lists.length) {
      const { data: items } = await sb
        .from("marketer_list_items")
        .select("*")
        .in("list_id", lists.map((l) => l.id))
        .order("position");
      const map: Record<string, ListItem[]> = {};
      ((items as ListItem[]) || []).forEach((it) => {
        (map[it.list_id] ||= []).push(it);
      });
      setItemsByList(map);
    } else {
      setItemsByList({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const listsByModel = useMemo(() => {
    const map: Record<string, MarketerList[]> = {};
    lists.forEach((l) => { (map[l.model_id] ||= []).push(l); });
    return map;
  }, [lists]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((mm) => {
      if (!q) return true;
      return (mm.name || "").toLowerCase().includes(q) || (mm.username || "").toLowerCase().includes(q);
    });
  }, [models, search]);

  const openCreate = (modelId?: string) => {
    setEditing(null);
    setDraftTitle("");
    setDraftDesc("");
    setDraftItems([{ title: "", reference_url: "", notes: "" }]);
    setDraftModels(new Set(modelId ? [modelId] : []));
    setEditorOpen(true);
  };

  const openEdit = (list: MarketerList) => {
    setEditing(list);
    setDraftTitle(list.title);
    setDraftDesc(list.description || "");
    const items = itemsByList[list.id] || [];
    setDraftItems(
      items.length
        ? items.map((it) => ({ title: it.title, reference_url: it.reference_url || "", notes: it.notes || "" }))
        : [{ title: "", reference_url: "", notes: "" }]
    );
    setDraftModels(new Set([list.model_id]));
    setEditorOpen(true);
  };

  const addDraftItem = () => setDraftItems((p) => [...p, { title: "", reference_url: "", notes: "" }]);
  const updateDraftItem = (i: number, patch: Partial<DraftItem>) =>
    setDraftItems((p) => { const n = [...p]; n[i] = { ...n[i], ...patch }; return n; });
  const removeDraftItem = (i: number) =>
    setDraftItems((p) => { const n = [...p]; n.splice(i, 1); return n.length ? n : [{ title: "", reference_url: "", notes: "" }]; });
  const moveDraftItem = (i: number, dir: -1 | 1) =>
    setDraftItems((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const cleanItems = () =>
    draftItems
      .map((it) => ({ ...it, title: it.title.trim(), reference_url: it.reference_url.trim(), notes: it.notes.trim() }))
      .filter((it) => it.title || it.reference_url || it.notes);

  const save = async () => {
    if (!draftTitle.trim()) { toast.error("Bitte Titel angeben"); return; }
    const cleaned = cleanItems();
    if (cleaned.length === 0) { toast.error("Mindestens eine Aufgabe nötig"); return; }
    if (draftModels.size === 0) { toast.error("Mindestens ein Model auswählen"); return; }

    setSaving(true);
    try {
      if (editing) {
        const { error: uErr } = await sb
          .from("marketer_lists")
          .update({ title: draftTitle.trim(), description: draftDesc.trim() || null })
          .eq("id", editing.id);
        if (uErr) throw uErr;
        // Replace items
        await sb.from("marketer_list_items").delete().eq("list_id", editing.id);
        const rows = cleaned.map((it, idx) => ({
          list_id: editing.id,
          position: idx,
          title: it.title || "(ohne Titel)",
          reference_url: it.reference_url || null,
          notes: it.notes || null,
        }));
        const { error: iErr } = await sb.from("marketer_list_items").insert(rows);
        if (iErr) throw iErr;
        toast.success("Liste gespeichert");
      } else {
        // One list per selected model
        for (const modelId of draftModels) {
          // Next position = max open position + 1 for this model
          const existing = (listsByModel[modelId] || []).filter((l) => l.status === "open");
          const nextPos = existing.length ? Math.max(...existing.map((l) => l.position)) + 1 : 0;

          const { data: newList, error: lErr } = await sb
            .from("marketer_lists")
            .insert({
              model_id: modelId,
              title: draftTitle.trim(),
              description: draftDesc.trim() || null,
              status: "open",
              position: nextPos,
              created_by: user?.id,
            })
            .select()
            .single();
          if (lErr) throw lErr;
          const rows = cleaned.map((it, idx) => ({
            list_id: (newList as any).id,
            position: idx,
            title: it.title || "(ohne Titel)",
            reference_url: it.reference_url || null,
            notes: it.notes || null,
          }));
          const { error: iErr } = await sb.from("marketer_list_items").insert(rows);
          if (iErr) throw iErr;
        }
        toast.success(`Liste${draftModels.size > 1 ? "n" : ""} angelegt`);
      }
      setEditorOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async (id: string) => {
    const { error } = await sb.from("marketer_lists").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Liste gelöscht");
    setDeleteId(null);
    load();
  };

  const duplicate = async (list: MarketerList) => {
    try {
      const items = itemsByList[list.id] || [];
      const existing = (listsByModel[list.model_id] || []).filter((l) => l.status === "open");
      const nextPos = existing.length ? Math.max(...existing.map((l) => l.position)) + 1 : 0;
      const { data: newList, error } = await sb
        .from("marketer_lists")
        .insert({
          model_id: list.model_id,
          title: list.title + " (Kopie)",
          description: list.description,
          status: "open",
          position: nextPos,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      if (items.length) {
        const rows = items.map((it, idx) => ({
          list_id: (newList as any).id,
          position: idx,
          title: it.title,
          reference_url: it.reference_url,
          notes: it.notes,
        }));
        await sb.from("marketer_list_items").insert(rows);
      }
      toast.success("Liste in Warteschlange dupliziert");
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    }
  };

  const moveInQueue = async (list: MarketerList, dir: -1 | 1) => {
    const queue = (listsByModel[list.model_id] || []).filter((l) => l.status === "open").sort((a, b) => a.position - b.position);
    const idx = queue.findIndex((l) => l.id === list.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= queue.length) return;
    const other = queue[j];
    try {
      await sb.from("marketer_lists").update({ position: other.position }).eq("id", list.id);
      await sb.from("marketer_lists").update({ position: list.position }).eq("id", other.id);
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    }
  };

  const toggleModel = (id: string) =>
    setExpandedModels((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleShowDone = (id: string) =>
    setShowDoneFor((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Model suchen…"
            className="pl-9 h-9 bg-card/40 border-accent/20"
          />
        </div>
        <Button onClick={() => openCreate()} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1.5" /> Neue Liste
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Keine Models gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredModels.map((mm) => {
            const all = (listsByModel[mm.id] || []).slice().sort((a, b) => {
              if (a.status !== b.status) return a.status === "open" ? -1 : 1;
              if (a.status === "open") return a.position - b.position;
              return (b.completed_at || "").localeCompare(a.completed_at || "");
            });
            const open = all.filter((l) => l.status === "open");
            const done = all.filter((l) => l.status === "done");
            const active = open[0];
            const queue = open.slice(1);
            const isExpanded = expandedModels.has(mm.id);
            const showingDone = showDoneFor.has(mm.id);

            return (
              <motion.div
                key={mm.id}
                layout
                className="rounded-xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleModel(mm.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/5 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-accent shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground truncate">{mm.name || "—"}</span>
                      {mm.username && <span className="text-[11px] text-muted-foreground">@{mm.username}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {active ? (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Aktiv: {active.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">Keine aktive Liste</span>
                      )}
                      {queue.length > 0 && <span>· {queue.length} in Warteschlange</span>}
                      {done.length > 0 && <span>· {done.length} erledigt</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-accent h-8 px-2 shrink-0"
                    onClick={(e) => { e.stopPropagation(); openCreate(mm.id); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Neue Liste
                  </Button>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/20"
                    >
                      <div className="p-3 space-y-3">
                        {open.length === 0 && (
                          <p className="text-xs text-muted-foreground italic px-2 py-3">
                            Noch keine offene Liste. Lege eine an, damit der Marketer Vorgaben bekommt.
                          </p>
                        )}
                        {open.map((l, idx) => {
                          const items = itemsByList[l.id] || [];
                          const doneCount = items.filter((i) => i.done).length;
                          const isActive = idx === 0;
                          return (
                            <div
                              key={l.id}
                              className={`rounded-lg border p-3 ${isActive ? "border-accent/40 bg-accent/5" : "border-border/30 bg-background/30"}`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={isActive ? "border-accent text-accent text-[10px]" : "border-border text-muted-foreground text-[10px]"}
                                >
                                  {isActive ? "Aktiv" : `#${idx + 1} Warteschlange`}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate">{l.title}</p>
                                  {l.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{l.description}</p>}
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                  {!isActive && (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveInQueue(l, -1)} title="Nach oben">
                                        <ArrowUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveInQueue(l, 1)} title="Nach unten">
                                        <ArrowDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(l)} title="Duplizieren">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(l.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all"
                                    style={{ width: `${items.length ? Math.round((doneCount / items.length) * 100) : 0}%` }}
                                  />
                                </div>
                                <span className="text-[11px] tabular-nums text-muted-foreground">{doneCount}/{items.length}</span>
                              </div>
                              <ul className="space-y-1">
                                {items.map((it) => (
                                  <li key={it.id} className="flex items-start gap-2 text-[12px]">
                                    {it.done ? <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0 mt-0.5" />}
                                    <span className={`flex-1 ${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.title}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}

                        {done.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleShowDone(mm.id)}
                              className="w-full text-left text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent flex items-center gap-1 py-1"
                            >
                              {showingDone ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              {done.length} erledigte Liste{done.length === 1 ? "" : "n"}
                            </button>
                            {showingDone && (
                              <div className="space-y-1 mt-1">
                                {done.map((l) => (
                                  <div key={l.id} className="flex items-center gap-2 text-[11px] rounded border border-border/20 bg-background/20 px-2 py-1.5">
                                    <CheckCircle2 className="h-3 w-3 text-accent shrink-0" />
                                    <span className="flex-1 truncate text-foreground/80">{l.title}</span>
                                    {l.completed_at && (
                                      <span className="text-muted-foreground tabular-nums">
                                        {new Date(l.completed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                      </span>
                                    )}
                                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => duplicate(l)} title="Neu in Warteschlange">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => setDeleteId(l.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
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
      )}

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent">{editing ? "Liste bearbeiten" : "Neue Liste"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Titel</Label>
              <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="z.B. TikTok Reels Woche 1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Beschreibung</Label>
              <Textarea value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="Optional" rows={2} />
            </div>

            {!editing && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Models</Label>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border/40 bg-background/40 divide-y divide-border/20">
                  {models.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">Keine Models vorhanden.</p>
                  ) : (
                    models.map((mm) => {
                      const checked = draftModels.has(mm.id);
                      return (
                        <button
                          key={mm.id}
                          type="button"
                          onClick={() => setDraftModels((s) => {
                            const n = new Set(s); if (n.has(mm.id)) n.delete(mm.id); else n.add(mm.id); return n;
                          })}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`}>
                            {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                          </div>
                          <span className="flex-1 truncate">{mm.name || "—"}</span>
                          {mm.username && <span className="text-[10px] text-muted-foreground">@{mm.username}</span>}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Für jedes ausgewählte Model wird eine eigene Liste mit denselben Aufgaben angelegt.
                </p>
              </div>
            )}

            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aufgaben</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-accent" onClick={addDraftItem}>
                  <Plus className="h-3 w-3 mr-1" /> Aufgabe
                </Button>
              </div>
              <div className="space-y-2">
                {draftItems.map((it, i) => (
                  <div key={i} className="rounded-lg border border-accent/20 bg-accent/5 p-2 flex items-start gap-2">
                    <LinkIcon className="h-3.5 w-3.5 mt-2 shrink-0 text-accent" />
                    <div className="flex-1 space-y-1">
                      <Input
                        value={it.title}
                        onChange={(e) => updateDraftItem(i, { title: e.target.value })}
                        placeholder="Titel / Aufgabe"
                        className="h-8 text-sm bg-background/40"
                      />
                      <Input
                        type="url"
                        value={it.reference_url}
                        onChange={(e) => updateDraftItem(i, { reference_url: e.target.value })}
                        placeholder="Referenz-URL (optional)"
                        className="h-7 text-xs bg-background/40"
                      />
                      <Textarea
                        value={it.notes}
                        onChange={(e) => updateDraftItem(i, { notes: e.target.value })}
                        placeholder="Notizen (optional)"
                        rows={2}
                        className="text-xs bg-background/40 min-h-[44px]"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveDraftItem(i, -1)} disabled={i === 0}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveDraftItem(i, 1)} disabled={i === draftItems.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeDraftItem(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle>Liste löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Die Liste und alle Aufgaben werden unwiderruflich gelöscht.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteList(deleteId)}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
