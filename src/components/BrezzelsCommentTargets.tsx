import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquareHeart, ExternalLink, ChevronDown, RefreshCw, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "sonner";

type Row = {
  account_id: string;
  account_label: string | null;
  model_name: string | null;
  target_id: string;
  url: string;
  completed: boolean;
};

type Group = {
  accountId: string;
  label: string;
  items: Row[];
};

const DAILY_COUNT = 10;

export default function BrezzelsCommentTargets() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const { playCheckSound } = useSoundEffects();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_brezzels_comment_targets_by_account", {
      p_count: DAILY_COUNT,
    });
    if (error) {
      console.error("[BrezzelsCommentTargets] load error", error);
      toast.error("Konnte Brezzels-Liste nicht laden");
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggle = async (r: Row) => {
    const next = !r.completed;
    setRows((prev) =>
      prev.map((x) =>
        x.target_id === r.target_id && x.account_id === r.account_id ? { ...x, completed: next } : x,
      ),
    );
    if (next) playCheckSound();
    const today = new Date();
    const tzDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const { error } = await supabase
      .from("brezzels_comment_assignments")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("user_id", user!.id)
      .eq("target_id", r.target_id)
      .eq("account_id", r.account_id)
      .eq("assigned_date", tzDate);
    if (error) {
      console.error("[BrezzelsCommentTargets] toggle error", error);
      toast.error("Status konnte nicht gespeichert werden");
      setRows((prev) =>
        prev.map((x) =>
          x.target_id === r.target_id && x.account_id === r.account_id ? { ...x, completed: !next } : x,
        ),
      );
    }
  };

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      const g = map.get(r.account_id) ?? {
        accountId: r.account_id,
        label: r.model_name || r.account_label || "Account",
        items: [],
      };
      g.items.push(r);
      map.set(r.account_id, g);
    }
    return Array.from(map.values());
  }, [rows]);

  const totalGoal = groups.length * DAILY_COUNT || DAILY_COUNT;
  const doneCount = rows.filter((r) => r.completed).length;
  const goalProgress = Math.min(100, (doneCount / totalGoal) * 100);
  const goalReached = groups.length > 0 && doneCount >= totalGoal;

  const usernameOf = (url: string) => url.split("/u/")[1] ?? url;

  return (
    <motion.section
      className={`glass-card-subtle rounded-xl p-4 lg:p-6 transition-all duration-500 card-inner-glow ${goalReached ? "gold-gradient-border-animated pulse-glow" : ""}`}
      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquareHeart className="h-4 w-4 text-accent shrink-0" />
              <h2 className="text-sm lg:text-base font-semibold text-foreground truncate">
                Brezzels-Profile kommentieren
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isOpen && (
                <Progress value={goalProgress} className="h-1.5 w-16 [&>div]:bg-accent shimmer-bar" />
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                {doneCount}/{totalGoal} ✓
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Progress value={goalProgress} className="h-2 [&>div]:bg-accent shimmer-bar" />
              <p className="text-xs text-muted-foreground">
                Tagesziel: <span className="text-foreground font-medium">{DAILY_COUNT} Profile</span> pro Model ·
                <span className="ml-1">
                  {groups.length} {groups.length === 1 ? "Model" : "Models"} · {rows.length} Profile heute zugewiesen
                </span>
              </p>
            </div>

            <div className="rounded-lg border border-accent/25 bg-accent/5 p-3 space-y-1.5">
              <p className="text-xs font-medium text-accent">Kurz zur Info</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>
                  Jedes deiner Models hat eine <span className="text-foreground font-medium">eigene Liste</span> – bitte
                  jeweils mit dem passenden Account kommentieren.
                </li>
                <li>
                  Um bei einem Creator kommentieren zu können, musst du ihm{" "}
                  <span className="text-foreground font-medium">kostenlos folgen</span>.
                </li>
                <li>
                  Hat ein Creator einen <span className="text-foreground font-medium">Preis hinterlegt</span>, einfach
                  überspringen – die Aufgabe gilt nur, wenn es kostenlos ist.
                </li>
              </ul>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Profile verfügbar. Bitte später erneut prüfen.
              </p>
            ) : (
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {groups.map((g) => {
                  const gDone = g.items.filter((i) => i.completed).length;
                  const gProgress = Math.min(100, (gDone / DAILY_COUNT) * 100);
                  return (
                    <div key={g.accountId} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="text-sm font-semibold text-foreground truncate">{g.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {gDone}/{DAILY_COUNT} ✓
                        </span>
                      </div>
                      <Progress value={gProgress} className="h-1.5 mb-2 [&>div]:bg-accent" />
                      <div className="space-y-1">
                        {g.items.map((t) => (
                          <div
                            key={`${g.accountId}-${t.target_id}`}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-accent/5 ${t.completed ? "opacity-50" : ""}`}
                          >
                            <Checkbox
                              checked={t.completed}
                              onCheckedChange={() => toggle(t)}
                              className="border-accent/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                            />
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 flex items-center gap-2 min-w-0 text-sm transition-colors ${
                                t.completed ? "line-through text-muted-foreground" : "text-foreground hover:text-accent"
                              }`}
                            >
                              <span className="truncate font-medium">@{usernameOf(t.url)}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={load}
              disabled={loading}
              className="w-full h-9 rounded-lg border border-border/40 bg-secondary/40 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Liste aktualisieren
            </button>

            {goalReached && (
              <motion.p
                className="text-center text-accent font-semibold text-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                🎉 Tagesziel erreicht – stark!
              </motion.p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.section>
  );
}
