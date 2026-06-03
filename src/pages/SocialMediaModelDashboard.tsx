import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogOut, Film, Image as ImageIcon, Clapperboard, CheckCircle2, Circle, CalendarDays, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

type ItemType = "reel" | "post" | "story";
type ContentItem = { type: ItemType; title: string; notes?: string };

type PlanRow = {
  assignment_id: string;
  plan_id: string;
  plan_title: string;
  plan_description: string;
  start_date: string;
};

type DayRow = { plan_id: string; day_number: number; items: ContentItem[] };
type StatusRow = {
  id?: string;
  assignment_id: string;
  day_number: number;
  item_index: number;
  done: boolean;
  upload_url: string;
  note: string;
};

const ITEM_TYPES: Record<ItemType, { label: string; icon: any; color: string }> = {
  reel: { label: "Reel", icon: Film, color: "bg-pink-500/15 text-pink-300 border-pink-500/30" },
  post: { label: "Post", icon: ImageIcon, color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  story: { label: "Story", icon: Clapperboard, color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Returns the Monday (00:00 local) for a given date
function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export default function SocialMediaModelDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [dayRowsByPlan, setDayRowsByPlan] = useState<Record<string, DayRow[]>>({});
  const [statuses, setStatuses] = useState<Record<string, StatusRow>>({}); // key: assignmentId:day:idx
  const [today] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const todayMonday = useMemo(() => mondayOf(today), [today]);

  const statusKey = (aid: string, day: number, idx: number) => `${aid}:${day}:${idx}`;

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Find this user's model(s)
    const { data: mu } = await supabase
      .from("fanvue_model_users")
      .select("model_id")
      .eq("user_id", user.id);
    const modelIds = (mu || []).map((r: any) => r.model_id);
    if (modelIds.length === 0) {
      setPlanRows([]);
      setLoading(false);
      return;
    }

    const { data: asgs } = await supabase
      .from("content_plan_assignments")
      .select("id, plan_id, start_date, content_plans(title, description)")
      .in("model_id", modelIds);

    const rows: PlanRow[] = (asgs || []).map((a: any) => ({
      assignment_id: a.id,
      plan_id: a.plan_id,
      plan_title: a.content_plans?.title || "Content Plan",
      plan_description: a.content_plans?.description || "",
      start_date: a.start_date,
    }));
    setPlanRows(rows);

    if (rows.length) {
      const planIds = Array.from(new Set(rows.map((r) => r.plan_id)));
      const { data: dayData } = await supabase
        .from("content_plan_days")
        .select("plan_id, day_number, items")
        .in("plan_id", planIds)
        .order("day_number");
      const byPlan: Record<string, DayRow[]> = {};
      (dayData || []).forEach((d: any) => {
        (byPlan[d.plan_id] ||= []).push({ plan_id: d.plan_id, day_number: d.day_number, items: (d.items as ContentItem[]) || [] });
      });
      setDayRowsByPlan(byPlan);

      const { data: statusData } = await supabase
        .from("content_plan_task_status")
        .select("*")
        .in("assignment_id", rows.map((r) => r.assignment_id));
      const map: Record<string, StatusRow> = {};
      (statusData || []).forEach((s: any) => {
        map[statusKey(s.assignment_id, s.day_number, s.item_index)] = s;
      });
      setStatuses(map);
    } else {
      setDayRowsByPlan({});
      setStatuses({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/socialmedia/login");
  };

  // Compute which days are visible for an assignment (current week only)
  const visibleDaysForAssignment = (startDateISO: string): number[] => {
    const start = mondayOf(new Date(startDateISO));
    if (todayMonday < start) return []; // Plan hasn't started yet
    const weekOffset = Math.floor(daysBetween(start, todayMonday) / 7); // 0-based
    const firstDay = weekOffset * 7 + 1;
    const lastDay = firstDay + 6;
    return Array.from({ length: 7 }, (_, i) => firstDay + i).filter((d) => d >= 1 && d <= 30 && d <= lastDay);
  };

  const toggleDone = async (aid: string, day: number, idx: number) => {
    const k = statusKey(aid, day, idx);
    const current = statuses[k];
    const nextDone = !(current?.done ?? false);
    // Optimistic
    setStatuses((s) => ({
      ...s,
      [k]: {
        ...(current || { assignment_id: aid, day_number: day, item_index: idx, upload_url: "", note: "" }),
        done: nextDone,
      } as StatusRow,
    }));
    const { error, data } = await supabase
      .from("content_plan_task_status")
      .upsert(
        {
          assignment_id: aid,
          day_number: day,
          item_index: idx,
          done: nextDone,
          completed_at: nextDone ? new Date().toISOString() : null,
          upload_url: current?.upload_url ?? "",
          note: current?.note ?? "",
        },
        { onConflict: "assignment_id,day_number,item_index" }
      )
      .select()
      .single();
    if (error) {
      toast.error("Konnte nicht speichern");
      load();
      return;
    }
    setStatuses((s) => ({ ...s, [k]: data as StatusRow }));
  };

  const updateStatusField = async (aid: string, day: number, idx: number, patch: Partial<StatusRow>) => {
    const k = statusKey(aid, day, idx);
    const current = statuses[k];
    setStatuses((s) => ({
      ...s,
      [k]: {
        ...(current || { assignment_id: aid, day_number: day, item_index: idx, done: false, upload_url: "", note: "" }),
        ...patch,
      } as StatusRow,
    }));
    await supabase
      .from("content_plan_task_status")
      .upsert(
        {
          assignment_id: aid,
          day_number: day,
          item_index: idx,
          done: current?.done ?? false,
          upload_url: current?.upload_url ?? "",
          note: current?.note ?? "",
          ...patch,
        },
        { onConflict: "assignment_id,day_number,item_index" }
      );
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
              Dein Content Plan
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 font-medium">Diese Woche</p>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Abmelden</span>
          </Button>
        </div>
      </header>
      <div className="h-[68px]" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : planRows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aktuell wurde dir noch kein Content Plan zugewiesen.</p>
          </div>
        ) : (
          planRows.map((pr) => {
            const allDays = dayRowsByPlan[pr.plan_id] || [];
            const visible = visibleDaysForAssignment(pr.start_date);
            const start = mondayOf(new Date(pr.start_date));
            const weekIdx = visible.length ? Math.floor((visible[0] - 1) / 7) + 1 : 0;

            // Total/done across all 30 days for progress
            const totalItems = allDays.reduce((acc, d) => acc + d.items.length, 0);
            const doneItems = Object.values(statuses).filter(
              (s) => s.assignment_id === pr.assignment_id && s.done
            ).length;
            const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

            return (
              <motion.section
                key={pr.assignment_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-accent/20 bg-card/40 backdrop-blur-sm p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-foreground">{pr.plan_title}</h2>
                    {pr.plan_description && <p className="text-xs text-muted-foreground mt-0.5">{pr.plan_description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Gesamt</div>
                    <div className="text-sm font-bold text-accent">{doneItems}/{totalItems}</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-background/60 overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-accent to-yellow-400 transition-all" style={{ width: `${pct}%` }} />
                </div>

                {visible.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    Dein Plan startet am {start.toLocaleDateString("de-DE")}. Bis dahin gibt's noch nichts zu tun.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wider text-accent/80 font-semibold">Woche {weekIdx} · Tage {visible[0]}–{visible[visible.length - 1]}</div>
                    {visible.map((d) => {
                      const dayRow = allDays.find((x) => x.day_number === d);
                      const items = dayRow?.items || [];
                      const dayDate = new Date(start);
                      dayDate.setDate(start.getDate() + (d - 1));
                      const wd = WEEKDAYS_DE[(dayDate.getDay() + 6) % 7];
                      const isToday = dayDate.getTime() === today.getTime();
                      return (
                        <div key={d} className={`rounded-xl border p-3 ${isToday ? "border-accent/50 bg-accent/5" : "border-border/40 bg-background/40"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{wd}, {dayDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag {d}</span>
                              {isToday && <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Heute</span>}
                            </div>
                          </div>
                          {items.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground/60 italic">Frei – kein Content geplant.</p>
                          ) : (
                            <div className="space-y-2">
                              {items.map((it, idx) => {
                                const t = ITEM_TYPES[it.type];
                                const Icon = t.icon;
                                const k = statusKey(pr.assignment_id, d, idx);
                                const st = statuses[k];
                                const done = !!st?.done;
                                return (
                                  <div key={idx} className={`rounded-lg border p-2.5 ${done ? "border-emerald-500/40 bg-emerald-500/5" : t.color}`}>
                                    <div className="flex items-start gap-2">
                                      <button
                                        onClick={() => toggleDone(pr.assignment_id, d, idx)}
                                        className="shrink-0 mt-0.5"
                                        aria-label="Erledigt"
                                      >
                                        {done ? (
                                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" />
                                        )}
                                      </button>
                                      <Icon className="h-3.5 w-3.5 mt-1 shrink-0" />
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                          <span className="text-[10px] uppercase tracking-wider mr-2 opacity-70">{t.label}</span>
                                          {it.title ? (
                                            /^https?:\/\//i.test(it.title) ? (
                                              <a
                                                href={it.title}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-accent underline break-all"
                                              >
                                                {it.title}
                                              </a>
                                            ) : (
                                              <span className="break-all">{it.title}</span>
                                            )
                                          ) : (
                                            <span className="italic text-muted-foreground">Kein Link</span>
                                          )}
                                        </div>
                                        {it.notes && <div className="text-[11px] text-muted-foreground whitespace-pre-wrap">{it.notes}</div>}
                                        <Input
                                          placeholder="Upload-Link (Drive, Notion, ...)"
                                          defaultValue={st?.upload_url || ""}
                                          onBlur={(e) => {
                                            const v = e.target.value;
                                            if (v !== (st?.upload_url || "")) updateStatusField(pr.assignment_id, d, idx, { upload_url: v });
                                          }}
                                          className="h-7 text-xs bg-background/60"
                                        />
                                        <Textarea
                                          placeholder="Notiz (optional)"
                                          rows={2}
                                          defaultValue={st?.note || ""}
                                          onBlur={(e) => {
                                            const v = e.target.value;
                                            if (v !== (st?.note || "")) updateStatusField(pr.assignment_id, d, idx, { note: v });
                                          }}
                                          className="text-xs bg-background/60 resize-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            );
          })
        )}
      </main>
    </div>
  );
}
