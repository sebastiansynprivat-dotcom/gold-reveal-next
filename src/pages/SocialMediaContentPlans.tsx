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
import { ArrowLeft, Plus, Trash2, Users, CalendarDays, Pencil, X, CheckCircle2, Link as LinkIcon, MessageSquare, ThumbsDown, ExternalLink, ChevronDown, ChevronRight, Copy } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import MarketerListsAdmin from "@/components/admin/MarketerListsAdmin";

// Item shape: { title, reference_url, notes }. Legacy items may carry `type` — ignored on render.
type ContentItem = { title: string; reference_url?: string; notes?: string; type?: string };
type DayMap = Record<number, ContentItem[]>;

type TargetType = "model" | "marketer";
type Plan = { id: string; title: string; description: string; created_at: string; target_type: TargetType };
type Model = { id: string; name: string; username: string };
type Marketer = { user_id: string; name: string };
type Assignment = { id: string; plan_id: string; model_id: string | null; marketer_user_id: string | null; start_date: string };

const DAYS = 30;

// ISO Monday of a given date (kept for assignment helper UI only)
function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function SocialMediaContentPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [activeTab, setActiveTab] = useState<TargetType>("model");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progressByAssignment, setProgressByAssignment] = useState<Record<string, { done: number; total: number }>>({});
  const [feedbackByAssignment, setFeedbackByAssignment] = useState<Record<string, Array<{ week_number: number; status: string; feedback: string; folder_url: string; updated_at: string }>>>({});
  const [loading, setLoading] = useState(true);

  // Edit/create plan dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [days, setDays] = useState<DayMap>({});
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPlan, setAssignPlan] = useState<Plan | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>(() => todayISO());

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: m }, { data: a }, { data: roleRows }] = await Promise.all([
      supabase.from("content_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("fanvue_models").select("id,name,username").order("name"),
      supabase.from("content_plan_assignments").select("*"),
      supabase.from("user_roles").select("user_id").eq("role", "socialmedia_marketer"),
    ]);
    setPlans(((p as any[]) || []).map((x) => ({ ...x, target_type: (x.target_type as TargetType) || "model" })));
    setModels((m as Model[]) || []);

    const mids = Array.from(new Set(((roleRows || []) as any[]).map((r) => r.user_id)));
    if (mids.length) {
      const { data: profs } = await supabase.from("admin_profiles").select("user_id, display_name").in("user_id", mids);
      const nameById = new Map<string, string>();
      ((profs || []) as any[]).forEach((pp) => nameById.set(pp.user_id, pp.display_name || ""));
      setMarketers(mids.map((id) => ({ user_id: id, name: nameById.get(id) || `Marketer ${id.slice(0, 6)}` })));
    } else {
      setMarketers([]);
    }

    setModels((m as Model[]) || []);
    const asgs = (a as Assignment[]) || [];
    setAssignments(asgs);

    // Compute progress per assignment
    if (asgs.length) {
      const planIds = Array.from(new Set(asgs.map((x) => x.plan_id)));
      const [{ data: dayRows }, { data: statusRows }, { data: fbRows }] = await Promise.all([
        supabase.from("content_plan_days").select("plan_id,day_number,items").in("plan_id", planIds),
        supabase.from("content_plan_task_status").select("assignment_id,done").in("assignment_id", asgs.map((x) => x.id)),
        supabase.from("content_plan_week_feedback" as any).select("assignment_id,week_number,status,feedback,folder_url,updated_at").in("assignment_id", asgs.map((x) => x.id)).order("week_number"),
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

      const fbMap: Record<string, Array<{ week_number: number; status: string; feedback: string; folder_url: string; updated_at: string }>> = {};
      ((fbRows || []) as any[]).forEach((r) => {
        (fbMap[r.assignment_id] ||= []).push({
          week_number: r.week_number,
          status: r.status,
          feedback: r.feedback || "",
          folder_url: r.folder_url || "",
          updated_at: r.updated_at,
        });
      });
      setFeedbackByAssignment(fbMap);
    } else {
      setProgressByAssignment({});
      setFeedbackByAssignment({});
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
    setOpenDays(new Set([1]));
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
    const filled = Object.keys(map).map(Number).filter((d) => (map[d]?.length || 0) > 0);
    setOpenDays(new Set(filled.length ? filled : [1]));
    setEditorOpen(true);
  };

  const toggleDayOpen = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  const duplicateToNext = (day: number) => {
    if (day >= DAYS) return;
    const src = days[day] || [];
    if (src.length === 0) return;
    setDays((prev) => ({ ...prev, [day + 1]: src.map((it) => ({ ...it })) }));
    setOpenDays((prev) => new Set(prev).add(day + 1));
  };

  const addItem = (day: number) => {
    setDays((prev) => ({ ...prev, [day]: [...(prev[day] || []), { title: "", reference_url: "", notes: "" }] }));
    setOpenDays((prev) => new Set(prev).add(day));
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
        const { data, error } = await (supabase
          .from("content_plans") as any)
          .insert({ title: planTitle.trim(), description: planDesc, created_by: user?.id, target_type: activeTab })
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
        items: (days[d] || []).filter((it) => (it.title || "").trim() !== "" || (it.reference_url || "").trim() !== "" || (it.notes || "").trim() !== ""),
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

  const targetKeyOf = (a: Assignment) =>
    (a.marketer_user_id ? a.marketer_user_id : a.model_id) as string;

  const openAssign = (plan: Plan) => {
    setAssignPlan(plan);
    const existing = (assignmentsByPlan[plan.id] || []).map(targetKeyOf).filter(Boolean) as string[];
    setSelectedTargets(new Set(existing));
    setStartDate(todayISO());
    setAssignOpen(true);
  };

  const saveAssignments = async () => {
    if (!assignPlan) return;
    const isMarketer = assignPlan.target_type === "marketer";
    const existing = assignmentsByPlan[assignPlan.id] || [];
    const existingIds = new Set(existing.map(targetKeyOf));
    const newSet = selectedTargets;

    const toAdd: string[] = [];
    newSet.forEach((id) => { if (!existingIds.has(id)) toAdd.push(id); });
    const toRemove: string[] = existing.filter((a) => !newSet.has(targetKeyOf(a))).map((a) => a.id);

    try {
      if (toAdd.length) {
        const rows = toAdd.map((tid) => isMarketer
          ? { plan_id: assignPlan.id, marketer_user_id: tid, start_date: startDate, assigned_by: user?.id }
          : { plan_id: assignPlan.id, model_id: tid, start_date: startDate, assigned_by: user?.id });
        const { error } = await (supabase.from("content_plan_assignments") as any).insert(rows);
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
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Models · Marketer</p>
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 rounded-xl border border-accent/20 bg-card/40 p-1 backdrop-blur-sm">
            {(["model", "marketer"] as TargetType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === t
                    ? "bg-accent text-accent-foreground shadow"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }`}
              >
                {t === "model" ? "Für Models" : "Für Marketer"}
              </button>
            ))}
          </div>
          {activeTab === "model" && (
            <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1.5" /> Neuer Plan (Models)
            </Button>
          )}
        </div>

        {activeTab === "marketer" ? (
          <MarketerListsAdmin />
        ) : (() => {
          const filteredPlans = plans.filter((p) => p.target_type === activeTab);
          if (loading) {
            return (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            );
          }
          if (filteredPlans.length === 0) {
            return (
              <div className="text-center py-20 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Noch keine Content Pläne für {activeTab === "model" ? "Models" : "Marketer"}.</p>
                <Button onClick={openCreate} variant="ghost" className="mt-3 text-accent">
                  <Plus className="h-4 w-4 mr-1.5" /> Ersten Plan anlegen
                </Button>
              </div>
            );
          }
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => {
              const asgs = assignmentsByPlan[plan.id] || [];
              const isMarketerPlan = plan.target_type === "marketer";
              const targetLabel = isMarketerPlan ? "Marketer" : "Model";
              const nameFor = (a: Assignment) => isMarketerPlan
                ? (marketers.find((mk) => mk.user_id === a.marketer_user_id)?.name || "—")
                : (models.find((mm) => mm.id === a.model_id)?.name || "—");
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
                    <span>{asgs.length} {targetLabel}{asgs.length === 1 ? "" : "s"} zugewiesen</span>
                  </div>

                  {asgs.length > 0 && (
                    <div className="space-y-2.5 mb-3 max-h-96 overflow-y-auto pr-1">
                      {asgs.map((a) => {
                        const prog = progressByAssignment[a.id] || { done: 0, total: 0 };
                        const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                        const fbs = feedbackByAssignment[a.id] || [];
                        const withContent = fbs.filter((f) => (f.feedback && f.feedback.trim()) || f.status === "rejected" || f.folder_url);
                        return (
                          <div key={a.id} className="text-xs space-y-1.5 pb-2 border-b border-border/20 last:border-b-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-foreground truncate font-medium">{nameFor(a)}</span>
                              <span className="text-muted-foreground tabular-nums">{prog.done}/{prog.total}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            {withContent.length > 0 && (
                              <div className="space-y-1.5 mt-1.5">
                                {withContent.map((f) => (
                                  <div key={f.week_number} className="rounded-md border border-border/40 bg-background/40 p-2 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Woche {f.week_number}</span>
                                      {f.status === "rejected" && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300">
                                          <ThumbsDown className="h-2.5 w-2.5" /> Abgelehnt
                                        </span>
                                      )}
                                    </div>
                                    {f.feedback && f.feedback.trim() && (
                                      <div className="flex items-start gap-1.5 text-[11px] text-foreground/90">
                                        <MessageSquare className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                                        <span className="whitespace-pre-wrap break-words">{f.feedback}</span>
                                      </div>
                                    )}
                                    {f.folder_url && (
                                      <a
                                        href={f.folder_url.startsWith("http") ? f.folder_url : `https://${f.folder_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 truncate"
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" /> {f.folder_url}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full border-accent/30 text-accent hover:bg-accent/10" onClick={() => openAssign(plan)}>
                    <Users className="h-3.5 w-3.5 mr-1.5" /> {targetLabel} zuweisen
                  </Button>
                </motion.div>
              );
            })}
          </div>
          );
        })()}
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
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">30 Tage Inhalt</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-accent"
                    onClick={() => setOpenDays(new Set(Array.from({ length: DAYS }, (_, i) => i + 1)))}
                  >
                    Alle aufklappen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-accent"
                    onClick={() => setOpenDays(new Set())}
                  >
                    Alle zuklappen
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mb-3">
                Klicke auf einen Tag, um Inhalte hinzuzufügen. Mit „Tag duplizieren" kannst du Inhalte auf den nächsten Tag kopieren.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => {
                  const items = days[d] || [];
                  const weekIdx = Math.ceil(d / 7);
                  const isOpen = openDays.has(d);
                  return (
                    <div key={d} className="rounded-xl border border-border/40 bg-background/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleDayOpen(d)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-background/60 transition-colors text-left"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-accent shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <Badge variant="outline" className="border-accent/40 text-accent text-[10px] shrink-0">Tag {d}</Badge>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">W{weekIdx}</span>
                        <span className="flex-1 text-xs text-foreground/80 truncate">
                          {items.length > 0
                            ? items.map((it) => it.title).filter(Boolean).join(" · ") || `${items.length} Inhalt${items.length === 1 ? "" : "e"}`
                            : <span className="text-muted-foreground/50 italic">leer</span>}
                        </span>
                        {items.length > 0 && (
                          <span className="text-[10px] tabular-nums text-accent/80 shrink-0">{items.length}</span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/30">
                          {items.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground/60 italic">Noch keine Inhalte.</p>
                          ) : (
                            items.map((it, idx) => (
                              <div key={idx} className="rounded-lg border border-accent/20 bg-accent/5 px-2 py-1.5 flex items-start gap-2">
                                <LinkIcon className="h-3.5 w-3.5 mt-1.5 shrink-0 text-accent" />
                                <div className="flex-1 space-y-1">
                                  <Input
                                    value={it.title}
                                    onChange={(e) => updateItem(d, idx, { title: e.target.value })}
                                    placeholder="Titel / Thema"
                                    className="h-7 text-xs bg-background/40"
                                  />
                                  <Input
                                    type="url"
                                    value={it.reference_url || ""}
                                    onChange={(e) => updateItem(d, idx, { reference_url: e.target.value })}
                                    placeholder="Referenz-Video URL (z.B. TikTok/Reel-Link)"
                                    className="h-7 text-xs bg-background/40"
                                  />
                                  <Textarea
                                    value={it.notes || ""}
                                    onChange={(e) => updateItem(d, idx, { notes: e.target.value })}
                                    placeholder="Notiz / Anweisung (optional)"
                                    rows={2}
                                    className="text-xs bg-background/40 min-h-[44px]"
                                  />
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeItem(d, idx)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-accent" onClick={() => addItem(d)}>
                              <Plus className="h-3 w-3 mr-1" /> Inhalt hinzufügen
                            </Button>
                            {items.length > 0 && d < DAYS && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-accent" onClick={() => duplicateToNext(d)}>
                                <Copy className="h-3 w-3 mr-1" /> Auf Tag {d + 1} kopieren
                              </Button>
                            )}
                          </div>
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
            <DialogTitle className="text-accent">
              {assignPlan?.target_type === "marketer" ? "Marketer zuweisen" : "Models zuweisen"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Startdatum (Tag 1)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <p className="text-[10px] text-muted-foreground/70 mt-1">Ab diesem Tag ist der Plan sofort sichtbar – Tag 1 = Startdatum.</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {assignPlan?.target_type === "marketer" ? "Marketer" : "Models"}
              </Label>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 bg-background/40 divide-y divide-border/20">
                {(() => {
                  const list: { id: string; primary: string; secondary?: string }[] =
                    assignPlan?.target_type === "marketer"
                      ? marketers.map((mk) => ({ id: mk.user_id, primary: mk.name }))
                      : models.map((mm) => ({ id: mm.id, primary: mm.name || "—", secondary: mm.username }));
                  if (list.length === 0) return <p className="p-3 text-xs text-muted-foreground">Keine Einträge vorhanden.</p>;
                  return list.map((it) => {
                    const checked = selectedTargets.has(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          setSelectedTargets((s) => {
                            const next = new Set(s);
                            if (next.has(it.id)) next.delete(it.id); else next.add(it.id);
                            return next;
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-border"}`}>
                          {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                        </div>
                        <span className="flex-1 truncate">{it.primary}</span>
                        {it.secondary && <span className="text-[10px] text-muted-foreground">@{it.secondary}</span>}
                      </button>
                    );
                  });
                })()}
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
