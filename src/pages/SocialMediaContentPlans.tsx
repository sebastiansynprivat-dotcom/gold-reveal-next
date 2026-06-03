import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Film, Image as ImageIcon, Clapperboard, Users, CalendarDays, Pencil, X, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

type ItemType = "reel" | "post" | "story";
type ContentItem = { type: ItemType; title: string; notes?: string };
type DayMap = Record<number, ContentItem[]>;

type Plan = { id: string; title: string; description: string; created_at: string };
type Model = { id: string; name: string; username: string };
type Assignment = { id: string; plan_id: string; model_id: string; start_date: string };

const ITEM_TYPES: { value: ItemType; label: string; icon: any; color: string }[] = [
  { value: "reel", label: "Reel", icon: Film, color: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  { value: "post", label: "Post", icon: ImageIcon, color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { value: "story", label: "Story", icon: Clapperboard, color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
];

const DAYS = 30;

// ISO Monday of a given date
function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export default function SocialMediaContentPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progressByAssignment, setProgressByAssignment] = useState<Record<string, { done: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  // Edit/create plan dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [days, setDays] = useState<DayMap>({});
  const [saving, setSaving] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPlan, setAssignPlan] = useState<Plan | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>(() => mondayOf(new Date()).toISOString().slice(0, 10));

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: m }, { data: a }] = await Promise.all([
      supabase.from("content_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("fanvue_models").select("id,name,username").order("name"),
      supabase.from("content_plan_assignments").select("*"),
    ]);
    setPlans((p as Plan[]) || []);
    setModels((m as Model[]) || []);
    const asgs = (a as Assignment[]) || [];
    setAssignments(asgs);

    // Compute progress per assignment
    if (asgs.length) {
      const planIds = Array.from(new Set(asgs.map((x) => x.plan_id)));
      const [{ data: dayRows }, { data: statusRows }] = await Promise.all([
        supabase.from("content_plan_days").select("plan_id,day_number,items").in("plan_id", planIds),
        supabase.from("content_plan_task_status").select("assignment_id,done").in("assignment_id", asgs.map((x) => x.id)),
      ]);
      const totalsByPlan: Record<string, number> = {};
      (dayRows || []).forEach((r: any) => {
        totalsByPlan[r.plan_id] = (totalsByPlan[r.plan_id] || 0) + (Array.isArray(r.items) ? r.items.length : 0);
      });
      const doneByAsg: Record<string, number> = {};
      (statusRows || []).forEach((r: any) => {
        if (r.done) doneByAsg[r.assignment_id] = (doneByAsg[r.assignment_id] || 0) + 1;
      });
      const map: Record<string, { done: number; total: number }> = {};
      asgs.forEach((x) => {
        map[x.id] = { done: doneByAsg[x.id] || 0, total: totalsByPlan[x.plan_id] || 0 };
      });
      setProgressByAssignment(map);
    } else {
      setProgressByAssignment({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const assignmentsByPlan = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
      (map[a.plan_id] ||= []).push(a);
    });
    return map;
  }, [assignments]);

  const openCreate = () => {
    setEditingPlan(null);
    setPlanTitle("");
    setPlanDesc("");
    setDays({});
    setEditorOpen(true);
  };

  const openEdit = async (plan: Plan) => {
    setEditingPlan(plan);
    setPlanTitle(plan.title);
    setPlanDesc(plan.description || "");
    const { data } = await supabase
      .from("content_plan_days")
      .select("day_number,items")
      .eq("plan_id", plan.id);
    const map: DayMap = {};
    (data || []).forEach((r: any) => { map[r.day_number] = (r.items as ContentItem[]) || []; });
    setDays(map);
    setEditorOpen(true);
  };

  const addItem = (day: number, type: ItemType) => {
    setDays((prev) => ({ ...prev, [day]: [...(prev[day] || []), { type, title: "", notes: "" }] }));
  };
  const updateItem = (day: number, idx: number, patch: Partial<ContentItem>) => {
    setDays((prev) => {
      const items = [...(prev[day] || [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...prev, [day]: items };
    });
  };
  const removeItem = (day: number, idx: number) => {
    setDays((prev) => {
      const items = [...(prev[day] || [])];
      items.splice(idx, 1);
      return { ...prev, [day]: items };
    });
  };

  const savePlan = async () => {
    if (!planTitle.trim()) { toast.error("Bitte Titel angeben"); return; }
    setSaving(true);
    try {
      let planId = editingPlan?.id;
      if (!planId) {
        const { data, error } = await supabase
          .from("content_plans")
          .insert({ title: planTitle.trim(), description: planDesc, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        planId = data!.id;
      } else {
        const { error } = await supabase
          .from("content_plans")
          .update({ title: planTitle.trim(), description: planDesc })
          .eq("id", planId);
        if (error) throw error;
      }
      // Upsert days
      const rows = Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => ({
        plan_id: planId!,
        day_number: d,
        items: (days[d] || []).filter((it) => it.title.trim() !== ""),
      }));
      const { error: dErr } = await supabase
        .from("content_plan_days")
        .upsert(rows, { onConflict: "plan_id,day_number" });
      if (dErr) throw dErr;
      toast.success("Plan gespeichert");
      setEditorOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("content_plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan gelöscht");
    setDeleteId(null);
    load();
  };

  const openAssign = (plan: Plan) => {
    setAssignPlan(plan);
    const existing = (assignmentsByPlan[plan.id] || []).map((a) => a.model_id);
    setSelectedModels(new Set(existing));
    setStartDate(mondayOf(new Date()).toISOString().slice(0, 10));
    setAssignOpen(true);
  };

  const saveAssignments = async () => {
    if (!assignPlan) return;
    const existing = assignmentsByPlan[assignPlan.id] || [];
    const existingIds = new Set(existing.map((a) => a.model_id));
    const newSet = selectedModels;

    const toAdd: string[] = [];
    newSet.forEach((id) => { if (!existingIds.has(id)) toAdd.push(id); });
    const toRemove: string[] = existing.filter((a) => !newSet.has(a.model_id)).map((a) => a.id);

    try {
      if (toAdd.length) {
        const rows = toAdd.map((mid) => ({
          plan_id: assignPlan.id,
          model_id: mid,
          start_date: startDate,
          assigned_by: user?.id,
        }));
        const { error } = await supabase.from("content_plan_assignments").insert(rows);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase.from("content_plan_assignments").delete().in("id", toRemove);
        if (error) throw error;
      }
      toast.success("Zuweisungen aktualisiert");
      setAssignOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GoldParticles />
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-accent/20 bg-[linear-gradient(180deg,hsl(0_0%_4%/0.95)_0%,hsl(0_0%_6%/0.85)_100%)] backdrop-blur-2xl">
        <div className="relative z-10 flex items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent/30 blur-md" aria-hidden="true" />
            <img src={logo} alt="Logo" className="relative h-10 w-10 rounded-full ring-2 ring-accent/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
              Content Pläne
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">30 Tage · Wochenweise an Models</p>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => navigate("/socialmedia/admin")} className="border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Zurück</span>
          </Button>
        </div>
      </header>
      <div className="h-[68px]" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1.5" /> Neuer Content Plan
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Content Pläne</p>
            <Button onClick={openCreate} variant="ghost" className="mt-3 text-accent">
              <Plus className="h-4 w-4 mr-1.5" /> Ersten Plan anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const asgs = assignmentsByPlan[plan.id] || [];
              return (
                <motion.div
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden hover:border-accent/40 transition-all"
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{plan.title}</h3>
                      {plan.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{plan.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(plan.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Users className="h-3.5 w-3.5" />
                    <span>{asgs.length} Model{asgs.length === 1 ? "" : "s"} zugewiesen</span>
                  </div>

                  {asgs.length > 0 && (
                    <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                      {asgs.map((a) => {
                        const mdl = models.find((mm) => mm.id === a.model_id);
                        const prog = progressByAssignment[a.id] || { done: 0, total: 0 };
                        const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                        return (
                          <div key={a.id} className="text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-foreground truncate">{mdl?.name || "—"}</span>
                              <span className="text-muted-foreground tabular-nums">{prog.done}/{prog.total}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full border-accent/30 text-accent hover:bg-accent/10" onClick={() => openAssign(plan)}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> Models zuweisen
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent">{editingPlan ? "Plan bearbeiten" : "Neuer Content Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Titel</Label>
                <Input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} placeholder="z.B. Januar 2026" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Beschreibung</Label>
                <Textarea value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} placeholder="Optional" rows={2} />
              </div>
            </div>

            <div className="border-t border-border/30 pt-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">30 Tage Inhalt</div>
              <p className="text-[11px] text-muted-foreground/70 mb-3">Models sehen wöchentlich – jeden Montag rollt die nächste Woche frei.</p>
              <div className="grid grid-cols-1 gap-3">
                {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => {
                  const items = days[d] || [];
                  const weekIdx = Math.ceil(d / 7);
                  return (
                    <div key={d} className="rounded-xl border border-border/40 bg-background/40 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-accent/40 text-accent text-[10px]">Tag {d}</Badge>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Woche {weekIdx}</span>
                        </div>
                        <div className="flex gap-1">
                          {ITEM_TYPES.map((t) => (
                            <Button key={t.value} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => addItem(d, t.value)}>
                              <t.icon className="h-3 w-3 mr-1" /> {t.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/60 italic">Keine Inhalte – nutze Reel/Post/Story oben.</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((it, idx) => {
                            const t = ITEM_TYPES.find((x) => x.value === it.type)!;
                            return (
                              <div key={idx} className={`rounded-lg border px-2 py-1.5 flex items-start gap-2 ${t.color}`}>
                                <t.icon className="h-3.5 w-3.5 mt-1.5 shrink-0" />
                                <div className="flex-1 space-y-1">
                                  <Input
                                    value={it.title}
                                    onChange={(e) => updateItem(d, idx, { title: e.target.value })}
                                    placeholder={`${t.label} Titel / Idee`}
                                    className="h-7 text-xs bg-background/40"
                                  />
                                  <Input
                                    value={it.notes || ""}
                                    onChange={(e) => updateItem(d, idx, { notes: e.target.value })}
                                    placeholder="Notizen (optional)"
                                    className="h-7 text-xs bg-background/40"
                                  />
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeItem(d, idx)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={savePlan} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-accent">Models zuweisen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Startdatum (Montag)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <p className="text-[10px] text-muted-foreground/70 mt-1">Ab diesem Tag startet Woche 1 für neu zugewiesene Models.</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Models</Label>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/40 divide-y divide-border/20">
                {models.length === 0 && <p className="p-3 text-xs text-muted-foreground">Keine Models vorhanden.</p>}
                {models.map((mm) => {
                  const checked = selectedModels.has(mm.id);
                  return (
                    <button
                      key={mm.id}
                      type="button"
                      onClick={() => {
                        setSelectedModels((s) => {
                          const next = new Set(s);
                          if (next.has(mm.id)) next.delete(mm.id); else next.add(mm.id);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`}>
                        {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <span className="flex-1 truncate">{mm.name || "—"}</span>
                      {mm.username && <span className="text-[10px] text-muted-foreground">@{mm.username}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>Abbrechen</Button>
            <Button onClick={saveAssignments} className="bg-accent text-accent-foreground hover:bg-accent/90">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-accent/30">
          <DialogHeader>
            <DialogTitle>Plan löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Alle Tage, Zuweisungen und Fortschritte werden gelöscht.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={() => deleteId && deletePlan(deleteId)}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
