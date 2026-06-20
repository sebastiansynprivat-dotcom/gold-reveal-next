import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquareHeart, ExternalLink, ChevronDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "sonner";

type Target = { id: string; url: string; completed: boolean };

const DAILY_COUNT = 10;
const DAILY_GOAL = 10;

export default function BrezzelsCommentTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const { playCheckSound } = useSoundEffects();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_brezzels_comment_targets", { p_count: DAILY_COUNT });
    if (error) {
      console.error("[BrezzelsCommentTargets] load error", error);
      toast.error("Konnte Brezzels-Liste nicht laden");
    } else {
      setTargets((data ?? []) as Target[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggle = async (t: Target) => {
    const next = !t.completed;
    // optimistic
    setTargets((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: next } : x)));
    if (next) playCheckSound();
    const today = new Date();
    const tzDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const { error } = await supabase
      .from("brezzels_comment_assignments")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("user_id", user!.id)
      .eq("target_id", t.id)
      .eq("assigned_date", tzDate);
    if (error) {
      console.error("[BrezzelsCommentTargets] toggle error", error);
      toast.error("Status konnte nicht gespeichert werden");
      setTargets((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !next } : x)));
    }
  };

  const doneCount = targets.filter((t) => t.completed).length;
  const goalProgress = Math.min(100, (doneCount / DAILY_GOAL) * 100);
  const goalReached = doneCount >= DAILY_GOAL;

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
                {doneCount}/{DAILY_GOAL} ✓
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
                Tagesziel: bei <span className="text-foreground font-medium">{DAILY_GOAL} Profilen</span> kommentieren ·
                <span className="ml-1">{targets.length} Profile heute zugewiesen</span>
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : targets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Profile verfügbar. Bitte später erneut prüfen.
              </p>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                {targets.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all hover:bg-accent/5 ${t.completed ? "opacity-50" : ""}`}
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
