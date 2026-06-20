import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Circle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type ContentItem = { title: string; reference_url?: string; notes?: string; type?: string };
type Plan = { id: string; title: string; description: string };
type Assignment = { id: string; plan_id: string; start_date: string };
type DayRow = { plan_id: string; day_number: number; items: ContentItem[] };

const DAYS = 30;

export default function MarketerContentPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [daysByPlan, setDaysByPlan] = useState<Record<string, Record<number, ContentItem[]>>>({});
  const [statusByAsg, setStatusByAsg] = useState<Record<string, Record<string, boolean>>>({});
  const [openPlan, setOpenPlan] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: asg } = await supabase
      .from("content_plan_assignments")
      .select("id, plan_id, start_date")
      .eq("marketer_user_id", user.id);
    const asgs = (asg as Assignment[]) || [];
    setAssignments(asgs);

    if (asgs.length === 0) {
      setPlans([]); setDaysByPlan({}); setStatusByAsg({}); setLoading(false); return;
    }

    const planIds = Array.from(new Set(asgs.map((a) => a.plan_id)));
    const [{ data: ps }, { data: ds }, { data: stRows }] = await Promise.all([
      supabase.from("content_plans").select("id,title,description").in("id", planIds),
      supabase.from("content_plan_days").select("plan_id,day_number,items").in("plan_id", planIds),
      supabase.from("content_plan_task_status").select("assignment_id,day_number,item_index,done").in("assignment_id", asgs.map((a) => a.id)),
    ]);
    setPlans((ps as Plan[]) || []);
    const dmap: Record<string, Record<number, ContentItem[]>> = {};
    ((ds || []) as DayRow[]).forEach((d) => {
      (dmap[d.plan_id] ||= {})[d.day_number] = Array.isArray(d.items) ? d.items : [];
    });
    setDaysByPlan(dmap);
    const smap: Record<string, Record<string, boolean>> = {};
    ((stRows || []) as any[]).forEach((r) => {
      (smap[r.assignment_id] ||= {})[`${r.day_number}:${r.item_index}`] = !!r.done;
    });
    setStatusByAsg(smap);
    setOpenPlan((cur) => cur || asgs[0]?.plan_id || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggleItem = async (asgId: string, day: number, idx: number, current: boolean) => {
    const next = !current;
    setStatusByAsg((prev) => ({ ...prev, [asgId]: { ...(prev[asgId] || {}), [`${day}:${idx}`]: next } }));
    const { error } = await supabase
      .from("content_plan_task_status")
      .upsert(
        { assignment_id: asgId, day_number: day, item_index: idx, done: next, done_at: next ? new Date().toISOString() : null, user_id: user?.id },
        { onConflict: "assignment_id,day_number,item_index" }
      );
    if (error) toast.error("Speichern fehlgeschlagen: " + error.message);
  };

  const progress = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {};
    assignments.forEach((a) => {
      const dm = daysByPlan[a.plan_id] || {};
      const total = Object.values(dm).reduce((s, items) => s + (items?.length || 0), 0);
      const done = Object.values(statusByAsg[a.id] || {}).filter(Boolean).length;
      out[a.id] = { done, total };
    });
    return out;
  }, [assignments, daysByPlan, statusByAsg]);

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-accent" />
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Mein Content Plan</h2>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center text-muted-foreground text-sm">
          Wird geladen…
        </div>
      </section>
    );
  }

  if (assignments.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-4 w-4 text-accent" />
        <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-bold">Mein Content Plan</h2>
      </div>
      <div className="space-y-4">
        {assignments.map((a) => {
          const plan = plans.find((p) => p.id === a.plan_id);
          if (!plan) return null;
          const dm = daysByPlan[a.plan_id] || {};
          const prog = progress[a.id] || { done: 0, total: 0 };
          const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
          const isOpen = openPlan === a.plan_id;
          const startDate = new Date(a.start_date);

          return (
            <motion.div
              key={a.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenPlan(isOpen ? null : a.plan_id)}
                className="w-full flex items-center gap-3 p-5 text-left hover:bg-accent/5 transition-colors"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-accent shrink-0" /> : <ChevronRight className="h-4 w-4 text-accent shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{plan.title}</h3>
                  {plan.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{plan.description}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">{prog.done}/{prog.total}</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-3">
                  {Array.from({ length: DAYS }, (_, i) => i + 1).map((day) => {
                    const items = dm[day] || [];
                    if (items.length === 0) return null;
                    const dayDate = new Date(startDate);
                    dayDate.setDate(startDate.getDate() + (day - 1));
                    return (
                      <div key={day} className="rounded-lg border border-border/30 bg-background/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-accent/80 font-bold">
                            Tag {day}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {dayDate.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {items.map((it, idx) => {
                            const done = !!statusByAsg[a.id]?.[`${day}:${idx}`];
                            return (
                              <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-background/40">
                                <button onClick={() => toggleItem(a.id, day, idx, done)} className="shrink-0 mt-0.5">
                                  {done ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.title}</p>
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
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
