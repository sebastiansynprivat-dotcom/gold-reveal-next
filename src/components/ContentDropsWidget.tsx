import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, ExternalLink, Check, Diamond } from "lucide-react";
import { toast } from "sonner";

type Drop = {
  id: string;
  model_name: string;
  content_link: string;
  message: string;
  created_at: string;
};

export default function ContentDropsWidget() {
  const { user } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [{ data: dropsData }, { data: readsData }] = await Promise.all([
      supabase
        .from("content_drops")
        .select("id, model_name, content_link, message, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("content_drop_reads")
        .select("drop_id")
        .eq("user_id", user.id),
    ]);
    setDrops((dropsData as Drop[]) || []);
    setReadIds(new Set((readsData || []).map((r: any) => r.drop_id)));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("content_drops_user")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_drops" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    if (!user) return;
    setMarking(id);
    const { error } = await supabase
      .from("content_drop_reads")
      .insert({ drop_id: id, user_id: user.id });
    setMarking(null);
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      toast.error("Konnte nicht markieren");
      return;
    }
    setReadIds((s) => new Set([...s, id]));
  };

  const visible = drops.filter((d) => !readIds.has(d.id));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <div className="relative">
          <Diamond className="h-4 w-4 text-accent" />
          <div className="absolute inset-0 bg-accent/40 rounded-full blur-md animate-pulse" />
        </div>
        <h2 className="text-sm font-bold text-gold-gradient">
          {visible.length === 1 ? "Neuer Content für dich" : `${visible.length} neue Content Drops`}
        </h2>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visible.map((d) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="relative rounded-2xl overflow-hidden border border-accent/30 group"
              style={{
                background:
                  "linear-gradient(135deg, hsl(43 56% 12% / 0.6), hsl(0 0% 8% / 0.85))",
                boxShadow:
                  "0 0 0 1px hsl(43 56% 52% / 0.15), 0 8px 32px -8px hsl(43 56% 52% / 0.25), inset 0 1px 0 hsl(43 76% 60% / 0.15)",
              }}
            >
              {/* shimmer top edge */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              {/* radial glow */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-50 blur-3xl pointer-events-none"
                style={{ background: "radial-gradient(circle, hsl(43 76% 50% / 0.4), transparent 70%)" }}
              />

              <div className="relative p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-accent/20 blur-md animate-pulse" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-accent/80 font-bold">
                      Frischer Content
                    </p>
                    <h3 className="text-base font-bold text-foreground leading-tight mt-0.5">
                      {d.model_name} hat neuen Content hochgeladen
                    </h3>
                    {d.message && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                        {d.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <a
                    href={d.content_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] relative overflow-hidden group/btn"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(43 56% 42%), hsl(43 76% 50%), hsl(43 56% 42%))",
                      color: "hsl(0 0% 4%)",
                      boxShadow: "0 4px 18px -4px hsl(43 56% 52% / 0.5)",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                    <ExternalLink className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Content ansehen</span>
                  </a>
                  <button
                    onClick={() => markRead(d.id)}
                    disabled={marking === d.id}
                    className="h-10 px-4 rounded-lg border border-border/60 bg-secondary/40 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Gelesen
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
